import { INestApplication } from '@nestjs/common';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { ClienteResumen, EncabezadosExcel, ResumenImportacion } from '@cafeteria/shared';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { crearApp, limpiarBase, tokenAdmin } from './crear-app.js';

const ENCABEZADOS = ['Boleta', 'Fecha', 'Producto', 'Total', 'Email'];
const MAPEO = { idExterno: 'Boleta', fecha: 'Fecha', producto: 'Producto', monto: 'Total', correo: 'Email' };

async function excel(filas: unknown[][]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Ventas');
  for (const fila of [ENCABEZADOS, ...filas]) hoja.addRow(fila);
  return Buffer.from(await libro.xlsx.writeBuffer());
}

describe('Importaciones (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  const importar = (archivo: Buffer, mapeo: object = MAPEO, nombre = 'ventas.xlsx') =>
    request(app.getHttpServer())
      .post('/api/importaciones')
      .set('Authorization', `Bearer ${token}`)
      .attach('archivo', archivo, nombre)
      .field('mapeo', JSON.stringify(mapeo));

  beforeAll(async () => {
    app = await crearApp();
    token = await tokenAdmin(app);
  });

  beforeEach(() => limpiarBase(app));

  afterAll(() => app.close());

  it('devuelve los encabezados y, después de importar, el mapeo guardado', async () => {
    const archivo = await excel([['B-1', '03-11-2026', 'Latte', 3500, '']]);
    const pedir = () =>
      request(app.getHttpServer())
        .post('/api/importaciones/encabezados')
        .set('Authorization', `Bearer ${token}`)
        .attach('archivo', archivo, 'ventas.xlsx')
        .expect(200);

    const antes = (await pedir()).body as EncabezadosExcel;
    expect(antes.encabezados).toEqual(ENCABEZADOS);
    expect(antes.mapeoGuardado).toBeNull();

    await importar(archivo).expect(201);
    expect(((await pedir()).body as EncabezadosExcel).mapeoGuardado).toEqual(MAPEO);
  });

  it('importa, cuenta errores y asocia con clientes registrados', async () => {
    await request(app.getHttpServer())
      .post('/api/clientes/registro')
      .send({ nombre: 'Ana', correo: 'ana@mail.cl', consentimiento: true })
      .expect(200);

    const res = await importar(
      await excel([
        ['B-1', '03-11-2026 09:00', 'Latte', '$3.500', ' ANA@mail.cl '],
        ['B-2', '03-11-2026 10:00', 'Espresso', 2200, ''],
        ['B-3', 'ayer', 'Brownie', 2400, ''],
      ]),
    ).expect(201);

    expect(res.body).toMatchObject({
      filasLeidas: 3,
      importadas: 2,
      duplicadas: 0,
      conError: 1,
      asociadas: 1,
      errores: [{ fila: 4, motivo: 'fecha inválida' }],
    } satisfies Partial<ResumenImportacion>);

    const clientes = (
      await request(app.getHttpServer()).get('/api/clientes').set('Authorization', `Bearer ${token}`).expect(200)
    ).body as ClienteResumen[];
    expect(clientes[0]).toMatchObject({ compras: 1, montoTotal: 3500 });
  });

  it('no guarda el correo del Excel en texto plano', async () => {
    await importar(await excel([['B-1', '03-11-2026', 'Latte', 3500, 'ana@mail.cl']])).expect(201);

    const venta = await app.get(PrismaService).venta.findFirstOrThrow();
    expect(JSON.stringify(venta)).not.toContain('ana@mail.cl');
    expect(venta.correoHmac).toMatch(/^[0-9a-f]{64}$/);
  });

  it('subir el mismo archivo dos veces no duplica ventas', async () => {
    const archivo = await excel([
      ['B-1', '03-11-2026', 'Latte', 3500, ''],
      ['B-2', '03-11-2026', 'Latte', 3500, ''],
    ]);
    await importar(archivo).expect(201);

    const segunda = await importar(archivo).expect(201);
    expect(segunda.body).toMatchObject({ importadas: 0, duplicadas: 2 });
  });

  it('sin número de boleta deduplica por el contenido de la fila', async () => {
    const mapeo = { fecha: 'Fecha', producto: 'Producto', monto: 'Total' };
    // Dos ventas idénticas en el mismo archivo son dos ventas distintas (#1 y #2).
    const archivo = await excel([
      ['', '03-11-2026 09:00', 'Latte', 3500, ''],
      ['', '03-11-2026 09:00', 'Latte', 3500, ''],
    ]);

    expect((await importar(archivo, mapeo).expect(201)).body).toMatchObject({ importadas: 2 });
    expect((await importar(archivo, mapeo).expect(201)).body).toMatchObject({ importadas: 0, duplicadas: 2 });
  });

  it('rechaza un mapeo con una columna que no existe', async () => {
    const res = await importar(await excel([['B-1', '03-11-2026', 'Latte', 3500, '']]), { ...MAPEO, monto: 'Precio' }).expect(400);

    expect((res.body as { message: string }).message).toContain('Precio');
  });

  it('rechaza un archivo que no es .xlsx', () => {
    return importar(Buffer.from('a,b'), MAPEO, 'ventas.csv').expect(400);
  });

  it('rechaza un .xlsx corrupto', () => {
    return importar(Buffer.from('no soy un excel'), MAPEO, 'ventas.xlsx').expect(400);
  });

  it('rechaza un archivo de más de 5 MB con 413', async () => {
    const demasiadoGrande = Buffer.alloc(5 * 1024 * 1024 + 1024, 'a');

    await importar(demasiadoGrande).expect(413);
  });

  it('una venta con un monto absurdo es un error de esa fila y el resto se importa', async () => {
    const res = await importar(
      await excel([
        ['B-1', '03-11-2026', 'Latte', 3_000_000_000, ''],
        ['B-2', '03-11-2026', 'Latte', 3500, ''],
      ]),
    ).expect(201);

    expect(res.body).toMatchObject({ importadas: 1, conError: 1, errores: [{ fila: 2, motivo: 'monto inválido' }] });
  });

  it('exige token de admin', () => {
    return request(app.getHttpServer()).get('/api/importaciones').expect(401);
  });
});
