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

  it('rechaza la fila si el producto o el N° de boleta son demasiado largos', async () => {
    const filas = [
      ENCABEZADOS_COMPLETOS,
      [new Date(Date.UTC(2026, 10, 3)), 'x'.repeat(121), 3500, 1, '', '', 'B-1'],
      [new Date(Date.UTC(2026, 10, 3)), 'Latte', 3500, 1, '', '', 'B'.repeat(101)],
      [new Date(Date.UTC(2026, 10, 3)), 'x'.repeat(120), 3500, 1, '', '', 'B'.repeat(100)],
    ];

    const lectura = await fuente.leer(await crearExcel(filas), MAPEO_COMPLETO);

    expect(lectura.errores).toEqual([
      { fila: 2, motivo: 'producto demasiado largo' },
      { fila: 3, motivo: 'N° de boleta demasiado largo' },
    ]);
    expect(lectura.ventas).toHaveLength(1);
  });

  it('una fila con un monto absurdo es un error de esa fila, no de todo el archivo', async () => {
    const filas = [
      ENCABEZADOS_COMPLETOS,
      [new Date(Date.UTC(2026, 10, 3)), 'Latte', 3_000_000_000, 1, '', '', 'B-1'],
      [new Date(Date.UTC(2026, 10, 3)), 'Latte', 3500, 1, '', '', 'B-2'],
    ];

    const lectura = await fuente.leer(await crearExcel(filas), MAPEO_COMPLETO);

    expect(lectura.errores).toEqual([{ fila: 2, motivo: 'monto inválido' }]);
    expect(lectura.ventas).toHaveLength(1);
  });

  it('detecta y procesa libros de formato Fudo con hojas Ventas y Adiciones', async () => {
    const libro = new ExcelJS.Workbook();
    const hojaV = libro.addWorksheet('Ventas');
    // Filas 1-3 metadatos
    hojaV.addRow(['Desde', '01/10/2026']);
    hojaV.addRow(['Hasta', '31/10/2026']);
    hojaV.addRow([]);
    // Fila 4 encabezados
    hojaV.addRow(['Id', 'Fecha', 'Creación', 'Cerrada', 'Caja', 'Estado', 'Cliente', 'Mesa', 'Sala', 'Personas', 'Camarero', 'Medio de Pago', 'Total', 'Fiscal', 'Tipo de Venta', 'Comentario']);
    // Fila 5 venta
    hojaV.addRow([101, '2026-10-15', '2026-10-15T10:00:00Z', '', 'Principal', 'Cerrada', '9 8765 4321', '', '', '', '', 'Debito', 5000, 'Si', 'Mostrador', '']);

    const hojaA = libro.addWorksheet('Adiciones');
    // Fila 1 encabezados
    hojaA.addRow(['Id. Venta', 'Creación', 'Producto', 'Categoría', 'Cantidad', 'Precio', 'Costo base', 'Costo mod', 'Costo total', 'Creada por', 'Cocina', 'Cancelada']);
    hojaA.addRow([101, '2026-10-15T10:01:00Z', 'Cold Brew', 'Bebidas', 1, 3000, 0, 0, 0, 'admin', 'Cocina', 'No']);
    hojaA.addRow([101, '2026-10-15T10:01:00Z', 'Croissant', 'Pasteleria', 1, 2000, 0, 0, 0, 'admin', 'Cocina', 'No']);

    const buf = Buffer.from(await libro.xlsx.writeBuffer());
    const info = await fuente.encabezados(buf);
    expect(info.esFudo).toBe(true);

    const lectura = await fuente.leer(buf);
    expect(lectura.filasLeidas).toBe(1);
    expect(lectura.ventas).toHaveLength(2);
    expect(lectura.ventas[0].venta.producto).toBe('Cold Brew');
    expect(lectura.ventas[0].venta.monto).toBe(3000);
    expect(lectura.ventas[0].venta.telefono).toBe('+56987654321');
    expect(lectura.ventas[1].venta.producto).toBe('Croissant');
    expect(lectura.ventas[1].venta.monto).toBe(2000);
  });
});

// Libro con formato Fudo: Ventas tiene 3 filas de metadatos y encabezados en la fila 4; Adiciones, encabezados en la fila 1.
// Filas de ventas: [Id, Fecha, Estado]. Filas de adiciones: [Id. Venta, Creación, Producto, Cantidad, Precio, Cancelada].
async function crearLibroFudo(ventas: unknown[][], adiciones: unknown[][]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hojaV = libro.addWorksheet('Ventas');
  hojaV.addRow(['Desde', '01/10/2026']);
  hojaV.addRow(['Hasta', '31/10/2026']);
  hojaV.addRow([]);
  hojaV.addRow(['Id', 'Fecha', 'Estado']);
  ventas.forEach((f) => hojaV.addRow(f));

  const hojaA = libro.addWorksheet('Adiciones');
  hojaA.addRow(['Id. Venta', 'Creación', 'Producto', 'Cantidad', 'Precio', 'Cancelada']);
  adiciones.forEach((f) => hojaA.addRow(f));

  return Buffer.from(await libro.xlsx.writeBuffer());
}

describe('ExcelFuente (formato Fudo)', () => {
  const fuente = new ExcelFuente();
  const FECHA = '2026-10-15';
  const CREACION = '2026-10-15T10:01:00Z';

  it('los ids no dependen del orden de las filas en Adiciones', async () => {
    const ventas = [[101, FECHA, 'Cerrada']];
    const lineas = [
      [101, CREACION, 'Cold Brew', 1, 3000, 'No'],
      [101, CREACION, 'Croissant', 1, 2000, 'No'],
      [101, CREACION, 'Latte', 1, 3500, 'No'],
    ];

    const enOrden = await fuente.leer(await crearLibroFudo(ventas, lineas));
    const enOtroOrden = await fuente.leer(await crearLibroFudo(ventas, [lineas[2], lineas[0], lineas[1]]));

    const idsEnOrden = enOrden.ventas.map(({ venta }) => venta.idExterno).sort((a, b) => (a ?? '').localeCompare(b ?? ''));
    const idsEnOtroOrden = enOtroOrden.ventas.map(({ venta }) => venta.idExterno).sort((a, b) => (a ?? '').localeCompare(b ?? ''));
    expect(idsEnOtroOrden).toEqual(idsEnOrden);
    expect(new Set(idsEnOrden).size).toBe(3);
  });

  it('una línea cancelada en medio no cambia los ids de las otras líneas', async () => {
    const ventas = [[101, FECHA, 'Cerrada']];
    const cafe = [101, CREACION, 'Cold Brew', 1, 3000, 'No'];
    const cancelada = [101, CREACION, 'Latte', 1, 3500, 'Si'];
    const croissant = [101, CREACION, 'Croissant', 1, 2000, 'No'];

    const conCancelada = await fuente.leer(await crearLibroFudo(ventas, [cafe, cancelada, croissant]));
    const sinCancelada = await fuente.leer(await crearLibroFudo(ventas, [cafe, croissant]));

    const idsConCancelada = conCancelada.ventas.map(({ venta }) => venta.idExterno).sort((a, b) => (a ?? '').localeCompare(b ?? ''));
    const idsSinCancelada = sinCancelada.ventas.map(({ venta }) => venta.idExterno).sort((a, b) => (a ?? '').localeCompare(b ?? ''));
    expect(conCancelada.ventas).toHaveLength(2);
    expect(idsConCancelada).toEqual(idsSinCancelada);
  });

  it('dos líneas idénticas de la misma venta tienen ids distintos (#1 y #2)', async () => {
    const ventas = [[101, FECHA, 'Cerrada']];
    const lineas = [
      [101, CREACION, 'Latte', 1, 3500, 'No'],
      [101, CREACION, 'Latte', 1, 3500, 'No'],
    ];

    const lectura = await fuente.leer(await crearLibroFudo(ventas, lineas));

    const [primero, segundo] = lectura.ventas.map(({ venta }) => venta.idExterno);
    expect(primero).toMatch(/^fudo:101:[0-9a-f]{12}#1$/);
    expect(segundo).toBe(primero!.replace(/#1$/, '#2'));
  });

  it('una venta sin productos en Adiciones no se importa y deja un error con su fila', async () => {
    const ventas = [[101, FECHA, 'Cerrada']];

    const lectura = await fuente.leer(await crearLibroFudo(ventas, []));

    expect(lectura.ventas).toEqual([]);
    expect(lectura.errores).toEqual([
      { fila: 5, motivo: 'hoja Ventas: la venta no tiene productos en la hoja Adiciones' },
    ]);
  });

  it('una venta con fecha inválida no se importa y sus líneas no generan errores extra', async () => {
    const ventas = [[101, 'ayer', 'Cerrada']];
    const lineas = [[101, CREACION, 'Latte', 1, 3500, 'No']];

    const lectura = await fuente.leer(await crearLibroFudo(ventas, lineas));

    expect(lectura.ventas).toEqual([]);
    expect(lectura.errores).toEqual([{ fila: 5, motivo: 'hoja Ventas: fecha inválida' }]);
  });

  it('una cantidad inválida genera error y la línea no se importa con cantidad 1', async () => {
    const ventas = [[101, FECHA, 'Cerrada']];
    const lineas = [
      [101, CREACION, 'Latte', 'abc', 3500, 'No'],
      [101, CREACION, 'Croissant', 1, 2000, 'No'],
    ];

    const lectura = await fuente.leer(await crearLibroFudo(ventas, lineas));

    expect(lectura.errores).toEqual([{ fila: 2, motivo: 'hoja Adiciones: cantidad inválida' }]);
    expect(lectura.ventas).toHaveLength(1);
    expect(lectura.ventas[0].venta.producto).toBe('Croissant');
  });

  it('un precio inválido genera error y la línea no se importa con monto 0', async () => {
    const ventas = [[101, FECHA, 'Cerrada']];
    const lineas = [
      [101, CREACION, 'Latte', 1, 'xx', 'No'],
      [101, CREACION, 'Croissant', 1, 2000, 'No'],
    ];

    const lectura = await fuente.leer(await crearLibroFudo(ventas, lineas));

    expect(lectura.errores).toEqual([{ fila: 2, motivo: 'hoja Adiciones: monto inválido' }]);
    expect(lectura.ventas).toHaveLength(1);
    expect(lectura.ventas[0].venta.producto).toBe('Croissant');
  });

  it('las ventas anuladas o canceladas se ignoran sin error', async () => {
    const ventas = [
      [101, FECHA, 'Anulada'],
      [102, FECHA, 'Cancelada'],
    ];
    const lineas = [
      [101, CREACION, 'Latte', 1, 3500, 'No'],
      [102, CREACION, 'Croissant', 1, 2000, 'No'],
    ];

    const lectura = await fuente.leer(await crearLibroFudo(ventas, lineas));

    expect(lectura.filasLeidas).toBe(0);
    expect(lectura.ventas).toEqual([]);
    expect(lectura.errores).toEqual([]);
  });
});
