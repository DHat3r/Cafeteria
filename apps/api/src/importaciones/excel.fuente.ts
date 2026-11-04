import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { MapeoColumnas } from '@cafeteria/shared';
import { normalizarCorreo, normalizarTelefono } from '../seguridad/contacto.js';
import type { FuenteVentas, LecturaVentas } from './fuente-ventas.js';
import { parsearCantidad, parsearFecha, parsearMonto, parsearTexto } from './valores.js';

type Celda = string | number | boolean | Date | null;
type Fila = Record<string, Celda>;

const FILAS_DE_MUESTRA = 5;
// Largos máximos: evitan que un texto enorme (o un Excel mal armado) llene la base.
const MAX_LARGO_PRODUCTO = 120;
const MAX_LARGO_ID = 100;

// Adaptador para el Excel (.xlsx) que exporta el sistema de ventas de la cafetería.
// No asume columnas fijas: usa la primera fila como encabezados y el mapeo que
// eligió el admin para saber qué columna es cada campo.
@Injectable()
export class ExcelFuente implements FuenteVentas {
  async encabezados(archivo: Buffer): Promise<{ encabezados: string[]; muestra: Record<string, string>[] }> {
    const { encabezados, filas } = await this.leerHoja(archivo);
    const muestra = filas.slice(0, FILAS_DE_MUESTRA).map(({ datos }) =>
      Object.fromEntries(encabezados.map((e) => [e, textoVisible(datos[e])])),
    );
    return { encabezados, muestra };
  }

  async leer(archivo: Buffer, mapeo: MapeoColumnas): Promise<LecturaVentas> {
    const { filas } = await this.leerHoja(archivo);
    const lectura: LecturaVentas = { filasLeidas: filas.length, ventas: [], errores: [] };

    for (const { numero, datos } of filas) {
      const valor = (campo: keyof MapeoColumnas) => {
        const columna = mapeo[campo];
        return columna ? datos[columna] : null;
      };
      const fecha = parsearFecha(valor('fecha'));
      const producto = parsearTexto(valor('producto'));
      const monto = parsearMonto(valor('monto'));
      const cantidad = parsearCantidad(valor('cantidad'));
      const correoCrudo = parsearTexto(valor('correo'));
      const telefonoCrudo = parsearTexto(valor('telefono'));

      const idExterno = parsearTexto(valor('idExterno'));
      const motivo = motivoDeError({ fecha, producto, monto, cantidad, idExterno });
      if (motivo || !fecha || !producto || monto === null || cantidad === null) {
        lectura.errores.push({ fila: numero, motivo: motivo ?? 'fila inválida' });
        continue;
      }

      lectura.ventas.push({
        fila: numero,
        venta: {
          fecha,
          producto,
          cantidad,
          monto,
          // Un contacto mal escrito no invalida la venta: solo no se podrá asociar.
          correo: normalizarCorreo(correoCrudo),
          telefono: normalizarTelefono(telefonoCrudo),
          idExterno,
        },
      });
    }
    return lectura;
  }

  private async leerHoja(archivo: Buffer): Promise<{ encabezados: string[]; filas: { numero: number; datos: Fila }[] }> {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(archivo as unknown as ArrayBuffer);
    const hoja = libro.worksheets[0];
    if (!hoja) return { encabezados: [], filas: [] };

    const columnas = new Map<number, string>();
    hoja.getRow(1).eachCell((celda, columna) => {
      const nombre = textoVisible(valorCelda(celda.value));
      if (nombre) columnas.set(columna, nombre);
    });

    const filas: { numero: number; datos: Fila }[] = [];
    hoja.eachRow({ includeEmpty: false }, (fila, numero) => {
      if (numero === 1) return;
      const datos: Fila = {};
      for (const [columna, nombre] of columnas) datos[nombre] = valorCelda(fila.getCell(columna).value);
      if (Object.values(datos).some((v) => textoVisible(v) !== '')) filas.push({ numero, datos });
    });

    return { encabezados: [...columnas.values()], filas };
  }
}

// exceljs entrega fórmulas, hipervínculos y texto enriquecido como objetos.
function valorCelda(valor: ExcelJS.CellValue): Celda {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date || typeof valor !== 'object') return valor;
  if ('result' in valor) return valorCelda(valor.result as ExcelJS.CellValue);
  if ('richText' in valor) return valor.richText.map((t) => t.text).join('');
  if ('text' in valor) return String(valor.text);
  return null;
}

function textoVisible(valor: Celda | undefined): string {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString().slice(0, 16).replace('T', ' ');
  return String(valor).trim();
}

// Primer problema de una fila, o null si es válida. El orden es el que ve quien corrige el Excel.
function motivoDeError(f: {
  fecha: Date | null;
  producto: string | null;
  monto: number | null;
  cantidad: number | null;
  idExterno: string | null;
}): string | null {
  if (!f.fecha) return 'fecha inválida';
  if (!f.producto) return 'falta el producto';
  if (f.producto.length > MAX_LARGO_PRODUCTO) return 'producto demasiado largo';
  if (f.monto === null) return 'monto inválido';
  if (f.cantidad === null) return 'cantidad inválida';
  if (f.idExterno && f.idExterno.length > MAX_LARGO_ID) return 'N° de boleta demasiado largo';
  return null;
}
