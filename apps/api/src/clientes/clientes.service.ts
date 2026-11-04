import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { ClienteResumen, MensajeResponse } from '@cafeteria/shared';
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

  async registrar(dto: RegistroClienteDto): Promise<MensajeResponse> {
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
          tokenBaja: randomBytes(24).toString('base64url'),
        },
      });
      await this.asociarVentasPrevias(nuevo.id, nuevo);
    } catch (error) {
      // Dos registros simultáneos con el mismo contacto: el segundo choca con el índice único.
      // El cliente ya quedó creado por el primero, así que se responde igual que siempre.
      if (!esViolacionUnica(error)) throw error;
    }
    return { mensaje: MENSAJE_REGISTRO };
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

  // Ventas importadas antes de que el cliente se registrara. Se usan los contactos que el cliente
  // TIENE guardados, no los que vinieron en esta petición (que pueden no ser suyos).
  private async asociarVentasPrevias(clienteId: number, { correoHmac, telefonoHmac }: Hmacs) {
    const condiciones = [...(correoHmac ? [{ correoHmac }] : []), ...(telefonoHmac ? [{ telefonoHmac }] : [])];
    if (condiciones.length === 0) return;
    await this.prisma.venta.updateMany({ where: { clienteId: null, OR: condiciones }, data: { clienteId } });
  }
}
