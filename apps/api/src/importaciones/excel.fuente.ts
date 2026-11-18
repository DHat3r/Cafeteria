import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { createHash } from 'node:crypto';
import type { ErrorFila, MapeoColumnas } from '@cafeteria/shared';
import { normalizarCorreo, normalizarTelefono } from '../seguridad/contacto.js';
import type { FuenteVentas, LecturaVentas } from './fuente-ventas.js';
import { MAX_MONTO, parsearCantidad, parsearFecha, parsearMonto, parsearTexto } from './valores.js';

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
  async encabezados(archivo: Buffer): Promise<{ encabezados: string[]; muestra: Record<string, string>[]; esFudo?: boolean }> {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(archivo as unknown as ArrayBuffer);

    if (this.esLibroFudo(libro)) {
      return this.encabezadosFudo(libro);
    }

    const { encabezados, filas } = await this.leerHojaGenerica(libro);
    const muestra = filas.slice(0, FILAS_DE_MUESTRA).map(({ datos }) =>
      Object.fromEntries(encabezados.map((e) => [e, textoVisible(datos[e])])),
    );
    return { encabezados, muestra, esFudo: false };
  }

  async leer(archivo: Buffer, mapeo?: MapeoColumnas): Promise<LecturaVentas> {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(archivo as unknown as ArrayBuffer);

    if (this.esLibroFudo(libro)) {
      return this.leerFudo(libro);
    }

    if (!mapeo) {
      throw new Error('Se requiere mapeo de columnas para archivos que no son de Fudo.');
    }

    return this.leerGenerico(libro, mapeo);
  }

  esLibroFudo(libro: ExcelJS.Workbook): boolean {
    const hojaVentas = libro.getWorksheet('Ventas');
    const hojaAdic = libro.getWorksheet('Adiciones');
    return Boolean(hojaVentas && hojaAdic);
  }

  private encabezadosFudo(libro: ExcelJS.Workbook): { encabezados: string[]; muestra: Record<string, string>[]; esFudo: boolean } {
    const encabezados = ['Id. Venta', 'Fecha', 'Producto', 'Cantidad', 'Precio', 'Total Venta', 'Cliente', 'Comentario'];
    const lecturaMuestra = this.leerFudo(libro, FILAS_DE_MUESTRA);
    const muestra = lecturaMuestra.ventas.map(({ venta }) => ({
      'Id. Venta': venta.idExterno ?? '',
      'Fecha': textoVisible(venta.fecha),
      'Producto': venta.producto,
      'Cantidad': String(venta.cantidad),
      'Precio': String(venta.monto),
      'Total Venta': String(venta.monto),
      'Cliente': venta.telefono ?? venta.correo ?? '',
      'Comentario': '',
    }));
    return { encabezados, muestra, esFudo: true };
  }

  private leerFudo(libro: ExcelJS.Workbook, limite?: number): LecturaVentas {
    const hojaVentas = libro.getWorksheet('Ventas')!;
    const hojaAdic = libro.getWorksheet('Adiciones')!;
    // Lo que no se puede importar se informa con su fila: callarlo dejaría al admin sin saber que faltan ventas.
    const errores: ErrorFila[] = [];

    // 1. Encontrar la fila de encabezados en Ventas (suele ser fila 4 en Fudo)
    let filaHeaderVentas = 4;
    for (let r = 1; r <= 10; r++) {
      const fila = hojaVentas.getRow(r);
      const celda1 = textoVisible(valorCelda(fila.getCell(1).value)).toLowerCase();
      const celda2 = textoVisible(valorCelda(fila.getCell(2).value)).toLowerCase();
      if (celda1 === 'id' || celda2 === 'fecha') {
        filaHeaderVentas = r;
        break;
      }
    }

    const colVentas = new Map<string, number>();
    hojaVentas.getRow(filaHeaderVentas).eachCell((celda, col) => {
      const nombre = textoVisible(valorCelda(celda.value)).toLowerCase();
      if (nombre) colVentas.set(nombre, col);
    });

    const getCol = (map: Map<string, number>, ...nombres: string[]): number | undefined => {
      for (const n of nombres) {
        const c = map.get(n.toLowerCase());
        if (c !== undefined) return c;
      }
      return undefined;
    };

    const colId = getCol(colVentas, 'id') ?? 1;
    const colFecha = getCol(colVentas, 'fecha') ?? 2;
    const colEstado = getCol(colVentas, 'estado');
    const colCliente = getCol(colVentas, 'cliente');
    const colComentario = getCol(colVentas, 'comentario');

    type VentaFudo = {
      fila: number;
      fecha: Date;
      correo: string | null;
      telefono: string | null;
    };

    let filasLeidas = 0;
    const ventasMap = new Map<string, VentaFudo>();
    hojaVentas.eachRow({ includeEmpty: false }, (fila, num) => {
      if (num <= filaHeaderVentas) return;
      const estado = colEstado ? textoVisible(valorCelda(fila.getCell(colEstado).value)).toLowerCase() : '';
      if (estado === 'anulada' || estado === 'cancelada') return;

      // Sin Id no hay forma de relacionarla con sus productos (por ejemplo, una fila de totales al final).
      const id = textoVisible(valorCelda(fila.getCell(colId).value));
      if (!id) return;

      filasLeidas++;
      const fecha = parsearFecha(valorCelda(fila.getCell(colFecha).value));
      if (!fecha) {
        errores.push({ fila: num, motivo: 'hoja Ventas: fecha inválida' });
        return;
      }

      const clienteCrudo = colCliente ? parsearTexto(valorCelda(fila.getCell(colCliente).value)) : null;
      const comentarioCrudo = colComentario ? parsearTexto(valorCelda(fila.getCell(colComentario).value)) : null;
      const { correo, telefono } = extraerContactos(clienteCrudo, comentarioCrudo);

      ventasMap.set(id, { fila: num, fecha, correo, telefono });
    });

    // 2. Leer Adiciones (productos consumidos)
    let filaHeaderAdic = 1;
    for (let r = 1; r <= 5; r++) {
      const fila = hojaAdic.getRow(r);
      const celda1 = textoVisible(valorCelda(fila.getCell(1).value)).toLowerCase();
      if (celda1.includes('id') || celda1.includes('venta')) {
        filaHeaderAdic = r;
        break;
      }
    }

    const colAdic = new Map<string, number>();
    hojaAdic.getRow(filaHeaderAdic).eachCell((celda, col) => {
      const nombre = textoVisible(valorCelda(celda.value)).toLowerCase();
      if (nombre) colAdic.set(nombre, col);
    });

    const colAdicIdVenta = getCol(colAdic, 'id. venta', 'id venta', 'id') ?? 1;
    const colAdicCreacion = getCol(colAdic, 'creación', 'creacion');
    const colAdicProducto = getCol(colAdic, 'producto', 'articulo', 'item') ?? 3;
    const colAdicCantidad = getCol(colAdic, 'cantidad', 'cant') ?? 5;
    const colAdicPrecio = getCol(colAdic, 'precio', 'total', 'monto') ?? 6;
    const colAdicCancelada = getCol(colAdic, 'cancelada');

    type ItemAdicion = {
      producto: string;
      cantidad: number;
      monto: number;
      // Identifica la línea por lo que es (producto, momento, cantidad y precio), no por su posición en la hoja.
      huella: string;
    };
    const adicionesPorVenta = new Map<string, ItemAdicion[]>();

    hojaAdic.eachRow({ includeEmpty: false }, (fila, num) => {
      if (num <= filaHeaderAdic) return;
      const cancelada = colAdicCancelada ? textoVisible(valorCelda(fila.getCell(colAdicCancelada).value)).toLowerCase() : '';
      if (cancelada === 'si' || cancelada === 'sí' || cancelada === 'true') return;

      // Una venta anulada o con fecha inválida ya no está en el mapa: sus productos se descartan a propósito.
      const idVenta = textoVisible(valorCelda(fila.getCell(colAdicIdVenta).value));
      const venta = ventasMap.get(idVenta);
      if (!venta) return;

      const producto = parsearTexto(valorCelda(fila.getCell(colAdicProducto).value));
      const cantidad = parsearCantidad(valorCelda(fila.getCell(colAdicCantidad).value));
      const precio = parsearMonto(valorCelda(fila.getCell(colAdicPrecio).value));
      const motivo = motivoDeError({ fecha: venta.fecha, producto, monto: precio, cantidad, idExterno: null });
      if (motivo || !producto || precio === null || cantidad === null) {
        errores.push({ fila: num, motivo: `hoja Adiciones: ${motivo ?? 'fila inválida'}` });
        return;
      }

      // SUPUESTO sin confirmar con un Excel real de Fudo: "Precio" es el precio de UNA unidad.
      // Si fuera el total de la línea, el monto quedaría multiplicado por la cantidad.
      const monto = Math.round(precio * cantidad);
      if (monto > MAX_MONTO) {
        errores.push({ fila: num, motivo: 'hoja Adiciones: monto demasiado alto' });
        return;
      }

      const creacion = colAdicCreacion ? textoVisible(valorCelda(fila.getCell(colAdicCreacion).value)) : '';
      const huella = createHash('sha256')
        .update([producto, creacion, cantidad, precio].join('|'))
        .digest('hex')
        .slice(0, 12);

      const items = adicionesPorVenta.get(idVenta) ?? [];
      items.push({ producto, cantidad, monto, huella });
      adicionesPorVenta.set(idVenta, items);
    });

    // 3. Generar ventas normalizadas
    const lectura: LecturaVentas = { filasLeidas, ventas: [], errores };

    let contador = 0;
    for (const [idVenta, venta] of ventasMap) {
      if (limite && contador >= limite) break;
      const items = adicionesPorVenta.get(idVenta);

      // No se inventa un "consumo" con el total: si el detalle llega después, esa venta se duplicaría.
      // Se avisa para que el admin exporte de nuevo cuando la venta ya tenga productos.
      if (!items) {
        errores.push({ fila: venta.fila, motivo: 'hoja Ventas: la venta no tiene productos en la hoja Adiciones' });
        continue;
      }

      // Dos líneas idénticas de la misma venta (dos cafés iguales pedidos juntos) se distinguen con "#n".
      const repetidas = new Map<string, number>();
      for (const item of items) {
        const clave = `fudo:${idVenta}:${item.huella}`;
        const n = (repetidas.get(clave) ?? 0) + 1;
        repetidas.set(clave, n);
        contador++;
        lectura.ventas.push({
          fila: contador,
          venta: {
            fecha: venta.fecha,
            producto: item.producto,
            cantidad: item.cantidad,
            monto: item.monto,
            correo: venta.correo,
            telefono: venta.telefono,
            idExterno: `${clave}#${n}`,
          },
        });
      }
    }

    return lectura;
  }

  private async leerGenerico(libro: ExcelJS.Workbook, mapeo: MapeoColumnas): Promise<LecturaVentas> {
    const { filas } = await this.leerHojaGenerica(libro);
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

  private async leerHojaGenerica(libro: ExcelJS.Workbook): Promise<{ encabezados: string[]; filas: { numero: number; datos: Fila }[] }> {
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

function extraerContactos(cliente: string | null, comentario: string | null): { correo: string | null; telefono: string | null } {
  let correo: string | null = null;
  let telefono: string | null = null;

  for (const texto of [cliente, comentario]) {
    if (!texto) continue;
    if (!correo) {
      const matchCorreo = texto.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
      if (matchCorreo) correo = normalizarCorreo(matchCorreo[0]);
    }
    if (!telefono) {
      const matchTel = texto.match(/(?:\+?56\s*)?9\s*\d{4}\s*\d{4}\b/);
      if (matchTel) {
        telefono = normalizarTelefono(matchTel[0]);
      } else {
        const normal = normalizarTelefono(texto);
        if (normal) telefono = normal;
      }
    }
  }

  return { correo, telefono };
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
