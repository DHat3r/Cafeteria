import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Levanta la app completa contra la base temporal de los e2e.
export async function crearApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

// Borra los datos de negocio entre tests (el admin inicial se conserva).
export async function limpiarBase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.venta.deleteMany();
  await prisma.importacion.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.mapeoColumnas.deleteMany();
  await prisma.oferta.deleteMany();
}

export async function tokenAdmin(app: INestApplication<App>): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
    .expect(200);
  return (res.body as { token: string }).token;
}
