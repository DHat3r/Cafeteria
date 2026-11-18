import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { ClienteResumen, MensajeResponse, RegistroClienteResponse } from '@cafeteria/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { CifradoService } from '../seguridad/cifrado.service.js';
import { normalizarCorreo, normalizarTelefono } from '../seguridad/contacto.js';
import { RegistroClienteDto } from './registro-cliente.dto.js';

// Misma respuesta si el cliente es nuevo o ya existía: no revela quién está registrado.
const MENSAJE_REGISTRO = '¡Listo! Te avisaremos de nuestras ofertas.';
const MENSAJE_BAJA = 'Listo, ya no recibirás más ofertas.';

type Hmacs = { correoHmac: string | null; telefonoHmac: string | null };

// Prisma lanza P2002 cuando un INSERT choca con un índice único (correoHmac o telefonoHmac).
function esViolacionUnica(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cifrado: CifradoService,
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
      await this.prisma.cliente.update({
        where: { id: existente.id },
        data: { consentimientoEn: new Date(), bajaEn: null },
      });
      await this.asociarVentasPrevias(existente.id, existente);
      return { mensaje: MENSAJE_REGISTRO, token: existente.tokenBaja };
    }

    try {
      const token = randomBytes(24).toString('base64url');
      const nuevo = await this.prisma.cliente.create({
        data: {
          nombre: dto.nombre,
          correoCifrado: correo ? this.cifrado.cifrar(correo) : null,
          correoHmac: hmacs.correoHmac,
          telefonoCifrado: telefono ? this.cifrado.cifrar(telefono) : null,
          telefonoHmac: hmacs.telefonoHmac,
          consentimientoEn: new Date(),
          tokenBaja: token,
        },
      });
      await this.asociarVentasPrevias(nuevo.id, nuevo);
      return { mensaje: MENSAJE_REGISTRO, token: nuevo.tokenBaja };
    } catch (error) {
      if (!esViolacionUnica(error)) throw error;
      const reintentado = await this.buscar(hmacs);
      return { mensaje: MENSAJE_REGISTRO, token: reintentado?.tokenBaja };
    }
  }

  async obtenerPerfilSocio(token: string): Promise<import('@cafeteria/shared').SocioPerfilResponse> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { tokenBaja: token },
      include: {
        ventas: {
          orderBy: { fecha: 'desc' },
          take: 10,
          select: { fecha: true, producto: true, cantidad: true, monto: true },
        },
      },
    });

    if (!cliente) {
      throw new BadRequestException('Socio no encontrado o enlace caducado');
    }

    // Calcular totales de compras
    const agregados = await this.prisma.venta.aggregate({
      where: { clienteId: cliente.id },
      _count: { id: true },
      _sum: { monto: true },
    });

    const totalCompras = agregados._count.id;
    const montoTotal = agregados._sum.monto ?? 0;
    // 1 punto por cada $1.000 consumidos
    const puntos = Math.floor(montoTotal / 1000);

    const correo = cliente.correoCifrado ? this.cifrado.descifrar(cliente.correoCifrado) : null;
    const telefono = cliente.telefonoCifrado ? this.cifrado.descifrar(cliente.telefonoCifrado) : null;
    const identificador = telefono ?? correo ?? `SOCIO-${cliente.id}`;

    // Obtener últimas ofertas activas de la cafetería
    const ofertasDb = await this.prisma.oferta.findMany({
      orderBy: { creadoEn: 'desc' },
      take: 5,
    });

    const ofertas = ofertasDb.map((o) => ({
      id: o.id,
      asunto: o.asunto,
      mensaje: o.mensaje,
      creadoEn: o.creadoEn.toISOString(),
    }));

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
      ofertas,
      ultimasCompras: cliente.ventas.map((v) => ({
        fecha: v.fecha.toISOString(),
        producto: v.producto,
        cantidad: v.cantidad,
        monto: v.monto,
      })),
    };
  }

  async consultarSocio(contactoCrudo: string): Promise<{ token?: string; mensaje?: string }> {
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
    if (!cliente) {
      return { mensaje: 'No encontramos registros con este contacto. ¡Regístrate en el club para empezar a sumar puntos!' };
    }

    return { token: cliente.tokenBaja };
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

  private buscar({ correoHmac, telefonoHmac }: Hmacs) {
    const condiciones = [...(correoHmac ? [{ correoHmac }] : []), ...(telefonoHmac ? [{ telefonoHmac }] : [])];
    return this.prisma.cliente.findFirst({ where: { OR: condiciones } });
  }

  private async asociarVentasPrevias(clienteId: number, { correoHmac, telefonoHmac }: Hmacs) {
    const condiciones = [...(correoHmac ? [{ correoHmac }] : []), ...(telefonoHmac ? [{ telefonoHmac }] : [])];
    if (condiciones.length === 0) return;
    await this.prisma.venta.updateMany({ where: { clienteId: null, OR: condiciones }, data: { clienteId } });
  }
}
