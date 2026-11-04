import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OfertaResumen, Segmento, VistaPreviaResponse } from '@cafeteria/shared';
import type { Oferta } from '../generated/prisma/client.js';
import type { Env } from '../config/env.js';
import { CorreoService } from '../correo/correo.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CifradoService } from '../seguridad/cifrado.service.js';
import { CrearOfertaDto } from './oferta.dto.js';
import { filtrarSegmento } from './filtrar-segmento.js';

const DIA_MS = 86_400_000;

@Injectable()
export class OfertasService {
  private readonly logger = new Logger(OfertasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cifrado: CifradoService,
    private readonly correo: CorreoService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async vistaPrevia(segmento: Segmento, ahora = new Date()): Promise<VistaPreviaResponse> {
    return { destinatarios: (await this.destinatarios(segmento, ahora)).length };
  }

  async crear(dto: CrearOfertaDto, ahora = new Date()): Promise<OfertaResumen> {
    const segmento = limpiarSegmento(dto.segmento);
    const destinatarios = await this.destinatarios(segmento, ahora);
    const urlWeb = this.config.get('PUBLIC_WEB_URL', { infer: true });

    // Se envía de a uno: simple y suave con el servidor SMTP. Un fallo no detiene a los demás.
    let enviados = 0;
    let fallidos = 0;
    for (const cliente of destinatarios) {
      try {
        await this.correo.enviar({
          para: this.cifrado.descifrar(cliente.correoCifrado),
          nombre: cliente.nombre,
          asunto: dto.asunto,
          mensaje: dto.mensaje,
          enlaceBaja: `${urlWeb}/baja/${cliente.tokenBaja}`,
        });
        enviados++;
      } catch {
        fallidos++;
        // Solo el id del cliente: el correo y el nombre son datos personales y no van a los logs.
        this.logger.warn(`No se pudo enviar la oferta al cliente ${cliente.id}`);
      }
    }

    const oferta = await this.prisma.oferta.create({
      data: { asunto: dto.asunto, mensaje: dto.mensaje, segmento: JSON.stringify(segmento), enviados, fallidos },
    });
    return aResumen(oferta);
  }

  async listar(): Promise<OfertaResumen[]> {
    const ofertas = await this.prisma.oferta.findMany({ orderBy: { creadoEn: 'desc' } });
    return ofertas.map(aResumen);
  }

  // Clientes sin baja y con correo que cumplen el segmento.
  private async destinatarios(segmento: Segmento, ahora: Date) {
    const desde = new Date(ahora.getTime() - segmento.dias * DIA_MS);
    const clientes = await this.prisma.cliente.findMany({
      where: { bajaEn: null, correoCifrado: { not: null } },
      select: {
        id: true,
        nombre: true,
        correoCifrado: true,
        tokenBaja: true,
        bajaEn: true,
        ventas: { where: { fecha: { gte: desde } }, select: { fecha: true, producto: true } },
      },
    });

    return filtrarSegmento(
      clientes.flatMap(({ ventas, correoCifrado, ...resto }) =>
        correoCifrado ? [{ ...resto, correoCifrado, compras: ventas }] : [],
      ),
      segmento,
      ahora,
    );
  }
}

// Guarda solo los campos del segmento (y sin producto vacío).
function limpiarSegmento(s: Segmento): Segmento {
  const producto = s.producto?.trim();
  return { ...(producto ? { producto } : {}), minCompras: s.minCompras, dias: s.dias };
}

function aResumen(o: Oferta): OfertaResumen {
  return {
    id: o.id,
    asunto: o.asunto,
    mensaje: o.mensaje,
    segmento: JSON.parse(o.segmento) as Segmento,
    enviados: o.enviados,
    fallidos: o.fallidos,
    creadoEn: o.creadoEn.toISOString(),
  };
}
