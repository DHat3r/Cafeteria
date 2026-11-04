import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { Dashboard } from '@cafeteria/shared';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { crearApp, limpiarBase, tokenAdmin } from './crear-app.js';

describe('GET /api/dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;

  const pedir = (consulta = '') =>
    request(app.getHttpServer()).get(`/api/dashboard${consulta}`).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    app = await crearApp();
    prisma = app.get(PrismaService);
    token = await tokenAdmin(app);
  });

  beforeEach(() => limpiarBase(app));

  afterAll(() => app.close());

  async function crearVentas() {
    const cliente = await prisma.cliente.create({
      data: { nombre: 'Ana', consentimientoEn: new Date(), tokenBaja: 'token-ana' },
    });
    const importacion = await prisma.importacion.create({
      data: { archivo: 'x.xlsx', filasLeidas: 3, importadas: 3, duplicadas: 0, conError: 0, asociadas: 2 },
    });
    const base = { importacionId: importacion.id, cantidad: 1 };
    await prisma.venta.createMany({
      data: [
        { ...base, idExterno: 'B-1', fecha: new Date('2026-11-02T09:00:00Z'), producto: 'Latte', monto: 3500, clienteId: cliente.id },
        { ...base, idExterno: 'B-2', fecha: new Date('2026-11-02T10:00:00Z'), producto: 'Latte', monto: 3500, clienteId: cliente.id },
        { ...base, idExterno: 'B-3', fecha: new Date('2026-11-04T10:00:00Z'), producto: 'Brownie', monto: 2400, clienteId: null },
        // Fuera del rango que se consulta abajo:
        { ...base, idExterno: 'B-4', fecha: new Date('2026-10-01T10:00:00Z'), producto: 'Espresso', monto: 2200, clienteId: null },
      ],
    });
  }

  it('resume las ventas del rango, incluyendo el día "hasta"', async () => {
    await crearVentas();

    const res = await pedir('?desde=2026-11-01&hasta=2026-11-04').expect(200);
    const dashboard = res.body as Dashboard;

    expect(dashboard).toMatchObject({
      desde: '2026-11-01',
      hasta: '2026-11-04',
      totalVentas: 9400,
      cantidadVentas: 3,
      porcentajeAsociado: 67,
    });
    expect(dashboard.ventasPorDia.map((d) => [d.fecha, d.monto])).toEqual([
      ['2026-11-01', 0],
      ['2026-11-02', 7000],
      ['2026-11-03', 0],
      ['2026-11-04', 2400],
    ]);
    expect(dashboard.topProductos[0]).toMatchObject({ producto: 'Latte', unidades: 2, monto: 7000 });
    expect(dashboard.topClientes[0]).toMatchObject({ nombre: 'Ana', compras: 2, monto: 7000 });
  });

  it('sin parámetros muestra los últimos 30 días', async () => {
    const dashboard = (await pedir().expect(200)).body as Dashboard;

    expect(dashboard.ventasPorDia).toHaveLength(30);
  });

  it.each([
    ['formato inválido', '?desde=03-11-2026'],
    ['fecha imposible', '?desde=2026-02-31&hasta=2026-03-05'],
    ['rango invertido', '?desde=2026-11-10&hasta=2026-11-01'],
    ['rango demasiado largo', '?desde=2020-01-01&hasta=2026-11-01'],
  ])('rechaza %s con 400', (_nombre, consulta) => {
    return pedir(consulta).expect(400);
  });

  it('exige token de admin', () => {
    return request(app.getHttpServer()).get('/api/dashboard').expect(401);
  });
});
