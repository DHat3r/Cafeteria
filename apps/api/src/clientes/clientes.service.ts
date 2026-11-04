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
    const nombre = dto.nombre.trim();
    const existente = await this.prisma.cliente.findFirst({ where: { OR: this.condicionesContacto(hmacs) } });

    const cliente = existente
      ? await this.prisma.cliente.update({
          where: { id: existente.id },
          // Vuelve a aceptar: se renueva el consentimiento y se quita la baja.
          data: {
            nombre,
            consentimientoEn: new Date(),
            bajaEn: null,
            ...(await this.correoSiLibre(correo, hmacs.correoHmac, existente.id)),
            ...(await this.telefonoSiLibre(telefono, hmacs.telefonoHmac, existente.id)),
          },
        })
      : await this.prisma.cliente.create({
          data: {
            nombre,
            correoCifrado: correo ? this.cifrado.cifrar(correo) : null,
            correoHmac: hmacs.correoHmac,
            telefonoCifrado: telefono ? this.cifrado.cifrar(telefono) : null,
            telefonoHmac: hmacs.telefonoHmac,
            consentimientoEn: new Date(),
            tokenBaja: randomBytes(24).toString('base64url'),
          },
        });

    // Ventas importadas antes de que el cliente se registrara.
    await this.prisma.venta.updateMany({
      where: { clienteId: null, OR: this.condicionesContacto(hmacs) },
      data: { clienteId: cliente.id },
    });
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

  private condicionesContacto({ correoHmac, telefonoHmac }: Hmacs) {
    return [...(correoHmac ? [{ correoHmac }] : []), ...(telefonoHmac ? [{ telefonoHmac }] : [])];
  }

  // Al actualizar un cliente, un contacto nuevo solo se agrega si no es de otro cliente.
  private async correoSiLibre(correo: string | null, correoHmac: string | null, clienteId: number) {
    if (!correo || !correoHmac) return {};
    const dueno = await this.prisma.cliente.findUnique({ where: { correoHmac } });
    if (dueno && dueno.id !== clienteId) return {};
    return { correoCifrado: this.cifrado.cifrar(correo), correoHmac };
  }

  private async telefonoSiLibre(telefono: string | null, telefonoHmac: string | null, clienteId: number) {
    if (!telefono || !telefonoHmac) return {};
    const dueno = await this.prisma.cliente.findUnique({ where: { telefonoHmac } });
    if (dueno && dueno.id !== clienteId) return {};
    return { telefonoCifrado: this.cifrado.cifrar(telefono), telefonoHmac };
  }
}
