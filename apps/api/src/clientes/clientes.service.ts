import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import type {
  ClienteResumen,
  MensajeResponse,
  OfertaSocioResumen,
  RegistroClienteResponse,
  Segmento,
  SocioPerfilResponse,
} from '@cafeteria/shared';
import { calcularPuntos } from '@cafeteria/shared';
import { horaDePared } from '../comun/hora.js';
import type { Env } from '../config/env.js';
import { CorreoService } from '../correo/correo.service.js';
import { filtrarSegmento, type ClienteSegmentable } from '../ofertas/filtrar-segmento.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CifradoService } from '../seguridad/cifrado.service.js';
import { normalizarCorreo, normalizarTelefono } from '../seguridad/contacto.js';
import { RegistroClienteDto } from './registro-cliente.dto.js';

// Misma respuesta si el cliente es nuevo o ya existía: no revela quién está registrado.
const MENSAJE_REGISTRO = '¡Listo! Te avisaremos de nuestras ofertas.';
const MENSAJE_BAJA = 'Listo, ya no recibirás más ofertas.';
// Igual exista o no el contacto: quien consulta no averigua quién es socio. El enlace viaja solo por correo,
// así que solo lo recibe el dueño de ese correo (prueba de posesión).
const MENSAJE_CONSULTA =
  'Si ese contacto está registrado con un correo, te enviamos el enlace a tu tarjeta. ' +
  'Si te registraste solo con teléfono, pídela en caja.';

// Los tokens se generan con 24 bytes aleatorios (192 bits): no se pueden adivinar.
const nuevoToken = () => randomBytes(24).toString('base64url');

type Hmacs = { correoHmac: string | null; telefonoHmac: string | null };

// Prisma lanza P2002 cuando un INSERT choca con un índice único (correoHmac o telefonoHmac).
function esViolacionUnica(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}

@Injectable()
export class ClientesService {
  private readonly logger = new Logger(ClientesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cifrado: CifradoService,
    private readonly correo: CorreoService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async registrar(dto: RegistroClienteDto): Promise<RegistroClienteResponse> {
    const correo = dto.correo ? normalizarCorreo(dto.correo) : null;
    const telefono = dto.telefono ? normalizarTelefono(dto.telefono) : null;
    if (dto.correo && !correo) throw new BadRequestException('El correo no es válido');
    if (dto.telefono && !telefono) {
      throw new BadRequestException('El teléfono debe ser un móvil chileno (9 dígitos)');
    }
    if (!correo && !telefono) throw new BadRequestException('Indica un correo o un teléfono');

    const hmacs: Hmacs = {
      correoHmac: correo ? this.cifrado.hmac(correo) : null,
      telefonoHmac: telefono ? this.cifrado.hmac(telefono) : null,
    };

    const existente = await this.buscar(hmacs);
    if (existente) {
      // Quien vuelve a registrarse solo renueva su consentimiento y se quita la baja. NO se cambian
      // el nombre ni los contactos: cualquiera que conozca el correo o el teléfono de otra persona
      // podría, si no, reemplazarle los datos y recibir sus ofertas.
      await this.prisma.cliente.update({
        where: { id: existente.id },
        data: { consentimientoEn: new Date(), bajaEn: null },
      });
      await this.asociarVentasPrevias(existente.id, existente);
      // Sin token en la respuesta: saber el correo o el teléfono de alguien no prueba que seas esa persona.
      // El enlace a su tarjeta le llega al correo que ya tenía guardado.
      void this.enviarEnlaceTarjeta(existente);
      return { mensaje: MENSAJE_REGISTRO };
    }

    try {
      const nuevo = await this.prisma.cliente.create({
        data: {
          nombre: dto.nombre,
          correoCifrado: correo ? this.cifrado.cifrar(correo) : null,
          correoHmac: hmacs.correoHmac,
          telefonoCifrado: telefono ? this.cifrado.cifrar(telefono) : null,
          telefonoHmac: hmacs.telefonoHmac,
          consentimientoEn: new Date(),
          tokenBaja: nuevoToken(),
          tokenTarjeta: nuevoToken(),
        },
      });
      await this.asociarVentasPrevias(nuevo.id, nuevo);
      // Es el único caso en que se entrega el token: el cliente lo acaba de crear esta misma persona.
      return { mensaje: MENSAJE_REGISTRO, token: nuevo.tokenTarjeta ?? undefined };
    } catch (error) {
      // Dos registros simultáneos con el mismo contacto: el segundo choca con el índice único.
      // El cliente ya quedó creado por el primero; se responde igual, sin token.
      if (!esViolacionUnica(error)) throw error;
    }
    return { mensaje: MENSAJE_REGISTRO };
  }

  async obtenerPerfilSocio(token: string): Promise<SocioPerfilResponse> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { tokenTarjeta: token },
      include: {
        ventas: {
          orderBy: { fecha: 'desc' },
          select: { fecha: true, producto: true, cantidad: true, monto: true },
        },
      },
    });

    if (!cliente) {
      throw new NotFoundException('Socio no encontrado o enlace caducado');
    }

    const totalCompras = cliente.ventas.length;
    const montoTotal = cliente.ventas.reduce((suma, v) => suma + v.monto, 0);
    const puntos = calcularPuntos(montoTotal);

    const correo = cliente.correoCifrado ? this.cifrado.descifrar(cliente.correoCifrado) : null;
    const telefono = cliente.telefonoCifrado ? this.cifrado.descifrar(cliente.telefonoCifrado) : null;
    const identificador = telefono ?? correo ?? `SOCIO-${cliente.id}`;

    return {
      nombre: cliente.nombre,
      identificador,
      correo,
      telefono,
      registradoEn: cliente.creadoEn.toISOString(),
      puntos,
      totalCompras,
      montoTotal,
      proximaRecompensaPuntos: 10,
      ofertas: await this.ofertasPara({ bajaEn: cliente.bajaEn, compras: cliente.ventas }),
      ultimasCompras: cliente.ventas.slice(0, 10).map((v) => ({
        fecha: v.fecha.toISOString(),
        producto: v.producto,
        cantidad: v.cantidad,
        monto: v.monto,
      })),
      tokenBaja: cliente.tokenBaja,
    };
  }

  async consultarSocio(contactoCrudo: string): Promise<MensajeResponse> {
    const correo = normalizarCorreo(contactoCrudo);
    const telefono = normalizarTelefono(contactoCrudo);
    if (!correo && !telefono) {
      throw new BadRequestException('Ingresa un teléfono o correo válido');
    }

    const hmacs: Hmacs = {
      correoHmac: correo ? this.cifrado.hmac(correo) : null,
      telefonoHmac: telefono ? this.cifrado.hmac(telefono) : null,
    };

    const cliente = await this.buscar(hmacs);
    // Sin esperar al SMTP: si solo respondiera lento cuando el contacto existe, el tiempo delataría quién es socio.
    if (cliente) void this.enviarEnlaceTarjeta(cliente);
    return { mensaje: MENSAJE_CONSULTA };
  }

  async darDeBaja(token: string): Promise<MensajeResponse> {
    await this.prisma.cliente.updateMany({
      where: { tokenBaja: token, bajaEn: null },
      data: { bajaEn: new Date() },
    });
    return { mensaje: MENSAJE_BAJA };
  }

  async listar(): Promise<ClienteResumen[]> {
    const clientes = await this.prisma.cliente.findMany({
      orderBy: { creadoEn: 'desc' },
      include: { ventas: { select: { monto: true, fecha: true } } },
    });

    return clientes.map((c) => {
      const ultima = c.ventas.reduce<Date | null>((max, v) => (!max || v.fecha > max ? v.fecha : max), null);
      return {
        id: c.id,
        nombre: c.nombre,
        correo: c.correoCifrado ? this.cifrado.descifrar(c.correoCifrado) : null,
        telefono: c.telefonoCifrado ? this.cifrado.descifrar(c.telefonoCifrado) : null,
        registradoEn: c.creadoEn.toISOString(),
        dadoDeBaja: c.bajaEn !== null,
        compras: c.ventas.length,
        montoTotal: c.ventas.reduce((suma, v) => suma + v.monto, 0),
        ultimaCompra: ultima?.toISOString() ?? null,
      };
    });
  }

  // Las últimas ofertas que este cliente habría recibido por correo. Una oferta dirigida a otro segmento
  // (por ejemplo "quienes compraron X") no se le muestra a quien no pertenece a él.
  private async ofertasPara(cliente: ClienteSegmentable): Promise<OfertaSocioResumen[]> {
    const ofertas = await this.prisma.oferta.findMany({ orderBy: { creadoEn: 'desc' }, take: 20 });
    const ahora = horaDePared(new Date());
    return ofertas
      .filter((o) => filtrarSegmento([cliente], JSON.parse(o.segmento) as Segmento, ahora).length > 0)
      .slice(0, 5)
      .map((o) => ({ id: o.id, asunto: o.asunto, mensaje: o.mensaje, creadoEn: o.creadoEn.toISOString() }));
  }

  // Manda el enlace a la tarjeta al correo guardado del cliente. Un fallo del SMTP no debe romper la respuesta
  // (ni delatar nada): solo se registra el id del cliente, nunca su correo ni su nombre.
  private async enviarEnlaceTarjeta(cliente: {
    id: number;
    nombre: string;
    correoCifrado: string | null;
    tokenTarjeta: string | null;
  }): Promise<void> {
    if (!cliente.correoCifrado || !cliente.tokenTarjeta) return;
    try {
      const urlWeb = this.config.get('PUBLIC_WEB_URL', { infer: true });
      await this.correo.enviarEnlaceTarjeta({
        para: this.cifrado.descifrar(cliente.correoCifrado),
        nombre: cliente.nombre,
        enlace: `${urlWeb}/socio/${cliente.tokenTarjeta}`,
      });
    } catch {
      this.logger.warn(`No se pudo enviar el enlace de la tarjeta al cliente ${cliente.id}`);
    }
  }

  private buscar({ correoHmac, telefonoHmac }: Hmacs) {
    const condiciones = [...(correoHmac ? [{ correoHmac }] : []), ...(telefonoHmac ? [{ telefonoHmac }] : [])];
    return this.prisma.cliente.findFirst({ where: { OR: condiciones } });
  }

  // Ventas importadas antes de que el cliente se registrara. Se usan los contactos que el cliente
  // TIENE guardados, no los que vinieron en esta petición (que pueden no ser suyos).
  private async asociarVentasPrevias(clienteId: number, { correoHmac, telefonoHmac }: Hmacs) {
    const condiciones = [...(correoHmac ? [{ correoHmac }] : []), ...(telefonoHmac ? [{ telefonoHmac }] : [])];
    if (condiciones.length === 0) return;
    await this.prisma.venta.updateMany({ where: { clienteId: null, OR: condiciones }, data: { clienteId } });
  }
}
