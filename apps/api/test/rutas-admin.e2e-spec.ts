import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { crearApp } from './crear-app.js';

// Todas las rutas del panel del administrador. Si se agrega una ruta nueva y se olvida el
// AdminGuard, hay que agregarla aquí y este test dirá si quedó abierta.
const RUTAS_ADMIN = [
  ['get', '/api/clientes'],
  ['get', '/api/dashboard'],
  ['get', '/api/importaciones'],
  ['post', '/api/importaciones'],
  ['post', '/api/importaciones/encabezados'],
  ['get', '/api/ofertas'],
  ['post', '/api/ofertas'],
  ['post', '/api/ofertas/vista-previa'],
] as const;

// JWT firmado con otra clave (HS256 a mano): la firma no coincide con la de la API.
function tokenConOtraClave(): string {
  const codificar = (objeto: object) => Buffer.from(JSON.stringify(objeto)).toString('base64url');
  const cuerpo = `${codificar({ alg: 'HS256', typ: 'JWT' })}.${codificar({ sub: 1, exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${cuerpo}.${createHmac('sha256', 'otra-clave-distinta').update(cuerpo).digest('base64url')}`;
}

describe('Rutas del administrador (e2e)', () => {
  let app: INestApplication<App>;
  let vencido: string;

  const llamar = (metodo: 'get' | 'post', ruta: string, authorization?: string) => {
    const peticion = request(app.getHttpServer())[metodo](ruta);
    return authorization ? peticion.set('Authorization', authorization) : peticion;
  };

  beforeAll(async () => {
    app = await crearApp();
    vencido = await app.get(JwtService).signAsync({ sub: 1 }, { expiresIn: -10 });
  });

  afterAll(() => app.close());

  describe.each(RUTAS_ADMIN)('%s %s', (metodo, ruta) => {
    it('rechaza una petición sin token', async () => {
      await llamar(metodo, ruta).expect(401);
    });

    it.each([
      ['un token mal formado', 'Bearer abc.def.ghi'],
      ['un esquema que no es Bearer', 'Basic dXN1YXJpbzpjbGF2ZQ=='],
    ])('rechaza %s', async (_nombre, cabecera) => {
      await llamar(metodo, ruta, cabecera).expect(401);
    });

    it('rechaza un token firmado con otra clave', async () => {
      await llamar(metodo, ruta, `Bearer ${tokenConOtraClave()}`).expect(401);
    });

    it('rechaza un token vencido', async () => {
      await llamar(metodo, ruta, `Bearer ${vencido}`).expect(401);
    });
  });
});
