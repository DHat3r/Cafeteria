import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { OfertaResumen, VistaPreviaResponse } from '@cafeteria/shared';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { CifradoService } from '../src/seguridad/cifrado.service.js';
import { crearApp, crearTransporteFalso, limpiarBase, tokenAdmin } from './crear-app.js';

const SEGMENTO_LATTE = { producto: 'latte', minCompras: 2, dias: 30 };

describe('Ofertas (e2e)', () => {
  const transporte = crearTransporteFalso();
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;

  const admin = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
  const post = (ruta: string, cuerpo: object) =>
    admin(request(app.getHttpServer()).post(`/api/ofertas${ruta}`)).send(cuerpo);
  const registrar = (nombre: string, correo: string) =>
    request(app.getHttpServer()).post('/api/clientes/registro').send({ nombre, correo, consentimiento: true }).expect(200);
  const comprar = async (correo: string, veces: number, producto = 'Latte') => {
    const cliente = await prisma.cliente.findFirstOrThrow({
      where: { correoHmac: app.get(CifradoService).hmac(correo) },
    });
    const importacion = await prisma.importacion.create({
      data: { archivo: 'x.xlsx', filasLeidas: veces, importadas: veces, duplicadas: 0, conError: 0, asociadas: veces },
    });
    const ayer = new Date(Date.now() - 86_400_000);
    for (let i = 0; i < veces; i++) {
      await prisma.venta.create({
        data: {
          idExterno: `${correo}-${producto}-${i}-${Math.random()}`,
          fecha: ayer,
          producto,
          cantidad: 1,
          monto: 3500,
          clienteId: cliente.id,
          importacionId: importacion.id,
        },
      });
    }
  };

  beforeAll(async () => {
    app = await crearApp(transporte);
    prisma = app.get(PrismaService);
    token = await tokenAdmin(app);
  });

  beforeEach(async () => {
    await limpiarBase(app);
    transporte.enviados.length = 0;
    transporte.fallosPendientes = 0;
  });

  afterAll(() => app.close());

  it('la vista previa cuenta a los clientes del segmento sin enviar nada', async () => {
    await registrar('Ana', 'ana@mail.cl');
    await registrar('Bruno', 'bruno@mail.cl');
    await comprar('ana@mail.cl', 2);
    await comprar('bruno@mail.cl', 1);

    const res = await post('/vista-previa', { segmento: SEGMENTO_LATTE }).expect(200);

    expect((res.body as VistaPreviaResponse).destinatarios).toBe(1);
    expect(transporte.enviados).toHaveLength(0);
  });

  it('envía la oferta solo al segmento, con el enlace de baja, y la registra', async () => {
    await registrar('Ana', 'ana@mail.cl');
    await registrar('Bruno', 'bruno@mail.cl');
    await comprar('ana@mail.cl', 2);
    await comprar('bruno@mail.cl', 1);

    const res = await post('', { asunto: '2x1 en lattes', mensaje: 'Esta semana, 2x1.', segmento: SEGMENTO_LATTE }).expect(201);

    expect(res.body).toMatchObject({ asunto: '2x1 en lattes', enviados: 1, fallidos: 0, segmento: SEGMENTO_LATTE });
    expect(transporte.enviados).toHaveLength(1);
    const { tokenBaja } = await prisma.cliente.findFirstOrThrow({ where: { nombre: 'Ana' } });
    expect(transporte.enviados[0]).toMatchObject({ to: 'ana@mail.cl', subject: '2x1 en lattes' });
    expect(transporte.enviados[0].text).toContain(`http://localhost:3000/baja/${tokenBaja}`);

    const lista = (await admin(request(app.getHttpServer()).get('/api/ofertas')).expect(200)).body as OfertaResumen[];
    expect(lista).toHaveLength(1);
  });

  it('no envía a quien se dio de baja', async () => {
    await registrar('Ana', 'ana@mail.cl');
    await comprar('ana@mail.cl', 2);
    const { tokenBaja } = await prisma.cliente.findFirstOrThrow();
    await request(app.getHttpServer()).post(`/api/clientes/baja/${tokenBaja}`).expect(200);

    const res = await post('', { asunto: 'Hola', mensaje: 'Oferta', segmento: { minCompras: 0, dias: 30 } }).expect(201);

    expect(res.body).toMatchObject({ enviados: 0, fallidos: 0 });
    expect(transporte.enviados).toHaveLength(0);
  });

  it('un fallo de envío se cuenta y no detiene al resto', async () => {
    await registrar('Ana', 'ana@mail.cl');
    await registrar('Bruno', 'bruno@mail.cl');
    transporte.fallosPendientes = 1;

    const res = await post('', { asunto: 'Hola', mensaje: 'Oferta', segmento: { minCompras: 0, dias: 30 } }).expect(201);

    expect(res.body).toMatchObject({ enviados: 1, fallidos: 1 });
  });

  it.each([
    ['sin asunto', { mensaje: 'x', segmento: SEGMENTO_LATTE }],
    ['días fuera de rango', { asunto: 'x', mensaje: 'x', segmento: { minCompras: 1, dias: 0 } }],
    ['campo no declarado', { asunto: 'x', mensaje: 'x', segmento: SEGMENTO_LATTE, extra: true }],
  ])('rechaza %s con 400', (_nombre, cuerpo) => {
    return post('', cuerpo).expect(400);
  });

  it('exige token de admin', () => {
    return request(app.getHttpServer()).post('/api/ofertas/vista-previa').send({ segmento: SEGMENTO_LATTE }).expect(401);
  });
});
