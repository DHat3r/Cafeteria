import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { crearApp } from './crear-app.js';

describe('POST /api/auth/login (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await crearApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('entrega un token al admin inicial', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
      .expect(200);

    expect((res.body as { token: string }).token.split('.')).toHaveLength(3);
  });

  it('acepta el correo con otras mayúsculas', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: process.env.ADMIN_EMAIL!.toUpperCase(), password: process.env.ADMIN_PASSWORD })
      .expect(200);
  });

  it('rechaza una contraseña incorrecta con 401', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: process.env.ADMIN_EMAIL, password: 'otra-clave' })
      .expect(401);
  });

  it('rechaza un correo inexistente con el mismo 401', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nadie@cafeteria.test', password: 'otra-clave' })
      .expect(401);
  });

  it('rechaza un cuerpo inválido con 400', () => {
    return request(app.getHttpServer()).post('/api/auth/login').send({ email: 'no-es-correo' }).expect(400);
  });
});
