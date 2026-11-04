import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { EncabezadosExcel, MapeoColumnas, ResumenImportacion } from '@cafeteria/shared';
import type { Importacion } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CifradoService } from '../seguridad/cifrado.service.js';
import { ExcelFuente } from './excel.fuente.js';
import type { VentaNormalizada } from './fuente-ventas.js';
import { validarMapeo } from './mapeo.js';

const FUENTE = 'excel';
const MAX_ERRORES_EN_RESPUESTA = 50;
const LOTE = 500;

type VentaPorGuardar = {
  idExterno: string;
  venta: VentaNormalizada;
  correoHmac: string | null;
  telefonoHmac: string | null;
};

@Injectable()
export class ImportacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cifrado: CifradoService,
    private readonly excel: ExcelFuente,
  ) {}

  async encabezados(archivo: Buffer): Promise<EncabezadosExcel> {
    const { encabezados, muestra } = await this.leerEncabezados(archivo);
    const guardado = await this.prisma.mapeoColumnas.findUnique({ where: { fuente: FUENTE } });
    return { encabezados, muestra, mapeoGuardado: guardado ? (JSON.parse(guardado.mapeo) as MapeoColumnas) : null };
  }

  async importar(nombreArchivo: string, archivo: Buffer, mapeoCrudo: unknown): Promise<ResumenImportacion> {
    const { encabezados } = await this.leerEncabezados(archivo);
    const mapeo = validarMapeo(mapeoCrudo, encabezados);
    const lectura = await this.excel.leer(archivo, mapeo);

    // 1. Contacto → HMAC (nunca se guarda en texto plano) e idExterno estable.
    const conId = this.asignarIds(lectura.ventas.map(({ venta }) => venta));

    // 2. Deduplicación: dentro del archivo y contra lo ya importado.
    const unicas = new Map<string, VentaPorGuardar>();
    for (const v of conId) if (!unicas.has(v.idExterno)) unicas.set(v.idExterno, v);
    const existentes = await this.idsExistentes([...unicas.keys()]);
    const nuevas = [...unicas.values()].filter((v) => !existentes.has(v.idExterno));

    // 3. Asociación con clientes registrados por el HMAC del correo o del teléfono.
    const clientePorHmac = await this.clientesPorHmac(nuevas);
    const ventas = nuevas.map((v) => ({
      ...v,
      clienteId: (v.correoHmac && clientePorHmac.get(v.correoHmac)) || (v.telefonoHmac && clientePorHmac.get(v.telefonoHmac)) || null,
    }));

    const importacion = await this.prisma.$transaction(async (tx) => {
      const creada = await tx.importacion.create({
        data: {
          archivo: nombreArchivo,
          filasLeidas: lectura.filasLeidas,
          importadas: ventas.length,
          duplicadas: conId.length - ventas.length,
          conError: lectura.errores.length,
          asociadas: ventas.filter((v) => v.clienteId !== null).length,
        },
      });
      await tx.venta.createMany({
        data: ventas.map(({ idExterno, venta, correoHmac, telefonoHmac, clienteId }) => ({
          idExterno,
          fecha: venta.fecha,
          producto: venta.producto,
          cantidad: venta.cantidad,
          monto: venta.monto,
          correoHmac,
          telefonoHmac,
          clienteId,
          importacionId: creada.id,
        })),
      });
      await tx.mapeoColumnas.upsert({
        where: { fuente: FUENTE },
        create: { fuente: FUENTE, mapeo: JSON.stringify(mapeo) },
        update: { mapeo: JSON.stringify(mapeo) },
      });
      return creada;
    });

    return { ...aResumen(importacion), errores: lectura.errores.slice(0, MAX_ERRORES_EN_RESPUESTA) };
  }

  async listar(): Promise<ResumenImportacion[]> {
    const importaciones = await this.prisma.importacion.findMany({ orderBy: { creadoEn: 'desc' } });
    return importaciones.map(aResumen);
  }

  private async leerEncabezados(archivo: Buffer) {
    try {
      return await this.excel.encabezados(archivo);
    } catch {
      throw new BadRequestException('No se pudo leer el archivo. ¿Es un Excel .xlsx?');
    }
  }

  // Si el sistema no trae número de boleta, se usa una huella de la fila. El
  // contador "#n" distingue dos ventas idénticas dentro del mismo archivo, y como
  // se repite igual al volver a subirlo, también evita duplicarlas.
  private asignarIds(ventas: VentaNormalizada[]): VentaPorGuardar[] {
    const apariciones = new Map<string, number>();
    return ventas.map((venta) => {
      const correoHmac = venta.correo ? this.cifrado.hmac(venta.correo) : null;
      const telefonoHmac = venta.telefono ? this.cifrado.hmac(venta.telefono) : null;
      if (venta.idExterno) return { idExterno: venta.idExterno, venta, correoHmac, telefonoHmac };

      const huella = createHash('sha256')
        .update([venta.fecha.toISOString(), venta.producto, venta.cantidad, venta.monto, correoHmac, telefonoHmac].join('|'))
        .digest('hex');
      const n = (apariciones.get(huella) ?? 0) + 1;
      apariciones.set(huella, n);
      return { idExterno: `fila:${huella}#${n}`, venta, correoHmac, telefonoHmac };
    });
  }

  private async idsExistentes(ids: string[]): Promise<Set<string>> {
    const existentes = new Set<string>();
    for (let i = 0; i < ids.length; i += LOTE) {
      const encontrados = await this.prisma.venta.findMany({
        where: { idExterno: { in: ids.slice(i, i + LOTE) } },
        select: { idExterno: true },
      });
      for (const { idExterno } of encontrados) existentes.add(idExterno);
    }
    return existentes;
  }

  private async clientesPorHmac(ventas: VentaPorGuardar[]): Promise<Map<string, number>> {
    const correos = [...new Set(ventas.map((v) => v.correoHmac).filter((h): h is string => h !== null))];
    const telefonos = [...new Set(ventas.map((v) => v.telefonoHmac).filter((h): h is string => h !== null))];
    const clientes = await this.prisma.cliente.findMany({
      where: { OR: [{ correoHmac: { in: correos } }, { telefonoHmac: { in: telefonos } }] },
      select: { id: true, correoHmac: true, telefonoHmac: true },
    });
    const mapa = new Map<string, number>();
    for (const c of clientes) {
      if (c.correoHmac) mapa.set(c.correoHmac, c.id);
      if (c.telefonoHmac) mapa.set(c.telefonoHmac, c.id);
    }
    return mapa;
  }
}

function aResumen(i: Importacion): ResumenImportacion {
  return {
    id: i.id,
    archivo: i.archivo,
    creadoEn: i.creadoEn.toISOString(),
    filasLeidas: i.filasLeidas,
    importadas: i.importadas,
    duplicadas: i.duplicadas,
    conError: i.conError,
    asociadas: i.asociadas,
  };
}
