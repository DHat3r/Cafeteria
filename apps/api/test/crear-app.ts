import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { TRANSPORTE_CORREO, type TransporteCorreo } from '../src/correo/correo.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Transporte que no envía nada: guarda los correos para que los tests los revisen.
// `fallosPendientes` hace que los próximos N envíos fallen, para probar el manejo de errores.
export function crearTransporteFalso() {
  const transporte = {
    enviados: [] as Parameters<TransporteCorreo['sendMail']>[0][],
    fallosPendientes: 0,
    sendMail(opciones: Parameters<TransporteCorreo['sendMail']>[0]): Promise<unknown> {
      if (transporte.fallosPendientes > 0) {
        transporte.fallosPendientes--;
        return Promise.reject(new Error('SMTP caído'));
      }
      transporte.enviados.push(opciones);
      return Promise.resolve({});
    },
  };
  return transporte;
}

// Levanta la app completa contra la base temporal de los e2e.
// Los tests nunca envían correos de verdad: usan un transporte falso.
export async function crearApp(transporte: TransporteCorreo = crearTransporteFalso()): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(TRANSPORTE_CORREO)
    .useValue(transporte)
    .compile();
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
