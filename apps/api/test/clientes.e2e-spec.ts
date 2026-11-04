import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { ClienteResumen } from '@cafeteria/shared';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { CifradoService } from '../src/seguridad/cifrado.service.js';
import { crearApp, limpiarBase, tokenAdmin } from './crear-app.js';

describe('Clientes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;

  const registrar = (body: object) =>
    request(app.getHttpServer()).post('/api/clientes/registro').send(body);
  const listar = async () =>
    (await request(app.getHttpServer()).get('/api/clientes').set('Authorization', `Bearer ${token}`).expect(200))
      .body as ClienteResumen[];

  beforeAll(async () => {
    app = await crearApp();
    prisma = app.get(PrismaService);
    token = await tokenAdmin(app);
  });

  beforeEach(() => limpiarBase(app));

  afterAll(() => app.close());

  it('registra un cliente y guarda el correo y el teléfono cifrados', async () => {
    await registrar({ nombre: 'Ana', correo: ' Ana@Mail.cl ', telefono: '9 1234 5678', consentimiento: true }).expect(200);

    const guardado = await prisma.cliente.findFirstOrThrow();
    expect(guardado.correoCifrado).not.toContain('ana');
    expect(guardado.telefonoCifrado).not.toContain('1234');

    const [cliente] = await listar();
    expect(cliente).toMatchObject({ nombre: 'Ana', correo: 'ana@mail.cl', telefono: '+56912345678', dadoDeBaja: false });
  });

  it('exige consentimiento', async () => {
    await registrar({ nombre: 'Ana', correo: 'ana@mail.cl', consentimiento: false }).expect(400);
    await registrar({ nombre: 'Ana', correo: 'ana@mail.cl' }).expect(400);
  });

  it('exige al menos un contacto válido', async () => {
    await registrar({ nombre: 'Ana', consentimiento: true }).expect(400);
    await registrar({ nombre: 'Ana', correo: 'no-es-correo', consentimiento: true }).expect(400);
    await registrar({ nombre: 'Ana', telefono: '1234', consentimiento: true }).expect(400);
  });

  it('registrarse dos veces no duplica al cliente y responde lo mismo', async () => {
    const primera = await registrar({ nombre: 'Ana', correo: 'ana@mail.cl', consentimiento: true }).expect(200);
    const segunda = await registrar({ nombre: 'Ana P.', correo: 'ANA@mail.cl', consentimiento: true }).expect(200);

    expect(segunda.body).toEqual(primera.body);
    const clientes = await listar();
    expect(clientes).toHaveLength(1);
    expect(clientes[0].nombre).toBe('Ana P.');
  });

  it('asocia las ventas importadas antes del registro', async () => {
    const cifrado = app.get(CifradoService);
    const importacion = await prisma.importacion.create({
      data: { archivo: 'x.xlsx', filasLeidas: 1, importadas: 1, duplicadas: 0, conError: 0, asociadas: 0 },
    });
    await prisma.venta.create({
      data: {
        idExterno: 'B-1',
        fecha: new Date('2026-11-01T10:00:00Z'),
        producto: 'Latte',
        cantidad: 1,
        monto: 3500,
        telefonoHmac: cifrado.hmac('+56912345678'),
        importacionId: importacion.id,
      },
    });

    await registrar({ nombre: 'Ana', telefono: '912345678', consentimiento: true }).expect(200);

    const [cliente] = await listar();
    expect(cliente).toMatchObject({ compras: 1, montoTotal: 3500 });
  });

  it('da de baja con el token y volver a registrarse la quita', async () => {
    await registrar({ nombre: 'Ana', correo: 'ana@mail.cl', consentimiento: true }).expect(200);
    const { tokenBaja } = await prisma.cliente.findFirstOrThrow();

    await request(app.getHttpServer()).post(`/api/clientes/baja/${tokenBaja}`).expect(200);
    expect((await listar())[0].dadoDeBaja).toBe(true);

    await registrar({ nombre: 'Ana', correo: 'ana@mail.cl', consentimiento: true }).expect(200);
    expect((await listar())[0].dadoDeBaja).toBe(false);
  });

  it('un token de baja inexistente responde igual, sin revelar nada', () => {
    return request(app.getHttpServer()).post('/api/clientes/baja/no-existe').expect(200);
  });

  it('el listado exige token de admin', () => {
    return request(app.getHttpServer()).get('/api/clientes').expect(401);
  });
});
