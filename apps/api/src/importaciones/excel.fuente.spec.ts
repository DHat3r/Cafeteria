import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { ExcelFuente } from './excel.fuente.js';

// Construye un libro en memoria: la primera fila son los encabezados.
async function crearExcel(filas: unknown[][]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Ventas');
  filas.forEach((f) => hoja.addRow(f));
  return Buffer.from(await libro.xlsx.writeBuffer());
}

const MAPEO_COMPLETO = {
  fecha: 'Fecha',
  producto: 'Producto',
  monto: 'Total',
  cantidad: 'Cant',
  correo: 'Email',
  telefono: 'Fono',
  idExterno: 'Boleta',
};

const ENCABEZADOS_COMPLETOS = ['Fecha', 'Producto', 'Total', 'Cant', 'Email', 'Fono', 'Boleta'];

describe('ExcelFuente', () => {
  const fuente = new ExcelFuente();

  it('encabezados devuelve los encabezados recortados en orden y una muestra de 5 filas', async () => {
    const filas: unknown[][] = [['Fecha', ' Producto ', 'Total']];
    for (let i = 1; i <= 7; i++) filas.push([new Date(Date.UTC(2026, 10, i, 9)), `Producto ${i}`, 1000 * i]);

    const { encabezados, muestra } = await fuente.encabezados(await crearExcel(filas));

    expect(encabezados).toEqual(['Fecha', 'Producto', 'Total']);
    expect(muestra).toHaveLength(5);
    expect(muestra[0]['Producto']).toBe('Producto 1');
  });

  it('leer interpreta una fila completa', async () => {
    const filas = [
      ENCABEZADOS_COMPLETOS,
      [new Date(Date.UTC(2026, 10, 3, 14, 30)), 'Latte', '$4.500', 2, ' Ana@Mail.cl ', '9 1234 5678', 'B-100'],
    ];

    const lectura = await fuente.leer(await crearExcel(filas), MAPEO_COMPLETO);

    expect(lectura.filasLeidas).toBe(1);
    expect(lectura.ventas[0].fila).toBe(2);
    expect(lectura.ventas[0].venta).toEqual({
      fecha: new Date(Date.UTC(2026, 10, 3, 14, 30)),
      producto: 'Latte',
      cantidad: 2,
      monto: 4500,
      correo: 'ana@mail.cl',
      telefono: '+56912345678',
      idExterno: 'B-100',
    });
    expect(lectura.errores).toEqual([]);
  });

  it('acepta la fecha como texto DD-MM-YYYY HH:mm', async () => {
    const filas = [ENCABEZADOS_COMPLETOS, ['03-11-2026 09:15', 'Latte', 3500, 1, null, null, null]];

    const lectura = await fuente.leer(await crearExcel(filas), MAPEO_COMPLETO);

    expect(lectura.ventas[0].venta.fecha).toEqual(new Date(Date.UTC(2026, 10, 3, 9, 15)));
  });

  it('sin columna de cantidad en el mapeo, la cantidad vale 1', async () => {
    const filas = [['Fecha', 'Producto', 'Total'], [new Date(Date.UTC(2026, 10, 3, 10, 0)), 'Latte', 3500]];
    const mapeo = { fecha: 'Fecha', producto: 'Producto', monto: 'Total' };

    const lectura = await fuente.leer(await crearExcel(filas), mapeo);

    expect(lectura.ventas[0].venta.cantidad).toBe(1);
  });

  it('las filas con fecha inválida, sin producto o con monto inválido van a errores con su motivo', async () => {
    const filas = [
      ENCABEZADOS_COMPLETOS,
      [new Date(Date.UTC(2026, 10, 3, 14, 30)), 'Latte', 3500, 1, null, null, 'B-1'],
      ['ayer', 'Latte', 3500, 1, null, null, 'B-2'],
      [new Date(Date.UTC(2026, 10, 3, 14, 30)), null, 3500, 1, null, null, 'B-3'],
      [new Date(Date.UTC(2026, 10, 3, 14, 30)), 'Latte', 'gratis', 1, null, null, 'B-4'],
    ];

    const lectura = await fuente.leer(await crearExcel(filas), MAPEO_COMPLETO);

    expect(lectura.ventas).toHaveLength(1);
    expect(lectura.ventas[0].fila).toBe(2);
    expect(lectura.errores).toEqual([
      { fila: 3, motivo: 'fecha inválida' },
      { fila: 4, motivo: 'falta el producto' },
      { fila: 5, motivo: 'monto inválido' },
    ]);
  });

  it('un correo o teléfono mal escrito no invalida la venta', async () => {
    const filas = [ENCABEZADOS_COMPLETOS, [new Date(Date.UTC(2026, 10, 3, 14, 30)), 'Latte', 3500, 1, 'no es correo', '123', 'B-1']];

    const lectura = await fuente.leer(await crearExcel(filas), MAPEO_COMPLETO);

    expect(lectura.ventas).toHaveLength(1);
    expect(lectura.ventas[0].venta.correo).toBeNull();
    expect(lectura.ventas[0].venta.telefono).toBeNull();
    expect(lectura.errores).toEqual([]);
  });

  it('ignora las filas completamente vacías entre medio', async () => {
    const filas = [
      ENCABEZADOS_COMPLETOS,
      [new Date(Date.UTC(2026, 10, 3, 14, 30)), 'Latte', 3500, 1, null, null, 'B-1'],
      [null, null, null, null, null, null, null],
      [new Date(Date.UTC(2026, 10, 3, 15, 30)), 'Espresso', 2200, 1, null, null, 'B-2'],
    ];

    const lectura = await fuente.leer(await crearExcel(filas), MAPEO_COMPLETO);

    expect(lectura.filasLeidas).toBe(2);
    expect(lectura.errores).toEqual([]);
    expect(lectura.ventas).toHaveLength(2);
    expect(lectura.ventas[1].fila).toBe(4);
  });

  it('usa el resultado de una celda con fórmula como monto', async () => {
    const filas = [
      ['Fecha', 'Producto', 'Total'],
      [new Date(Date.UTC(2026, 10, 3, 14, 30)), 'Latte', { formula: 'B2*2', result: 9000 }],
    ];
    const mapeo = { fecha: 'Fecha', producto: 'Producto', monto: 'Total' };

    const lectura = await fuente.leer(await crearExcel(filas), mapeo);

    expect(lectura.ventas[0].venta.monto).toBe(9000);
  });

  it('lee el Excel de ejemplo de docs', async () => {
    const ruta = fileURLToPath(new URL('../../../../docs/ejemplo-ventas.xlsx', import.meta.url));
    const mapeo = {
      fecha: 'Fecha',
      producto: 'Producto',
      monto: 'Total',
      cantidad: 'Cant.',
      correo: 'Email cliente',
      telefono: 'Fono',
      idExterno: 'N° Boleta',
    };

    const lectura = await fuente.leer(readFileSync(ruta), mapeo);

    expect(lectura.filasLeidas).toBe(62);
    expect(lectura.errores).toHaveLength(2);
    expect(lectura.ventas).toHaveLength(60);
  });
});
