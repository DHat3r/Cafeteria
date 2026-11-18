import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { ClienteResumen, MensajeResponse, RegistroClienteResponse, SocioPerfilResponse } from '@cafeteria/shared';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { CifradoService } from '../src/seguridad/cifrado.service.js';
import { crearApp, crearTransporteFalso, limpiarBase, tokenAdmin } from './crear-app.js';

describe('Clientes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  const transporte = crearTransporteFalso();

  const registrar = (body: object) =>
    request(app.getHttpServer()).post('/api/clientes/registro').send(body);
  const consultar = (contacto: string) =>
    request(app.getHttpServer()).post('/api/clientes/consultar-socio').send({ contacto });
  const perfil = (tokenTarjeta: string) => request(app.getHttpServer()).get(`/api/clientes/socio/${tokenTarjeta}`);
  const listar = async () =>
    (await request(app.getHttpServer()).get('/api/clientes').set('Authorization', `Bearer ${token}`).expect(200))
      .body as ClienteResumen[];

  beforeAll(async () => {
    app = await crearApp(transporte);
    prisma = app.get(PrismaService);
    token = await tokenAdmin(app);
  });

  beforeEach(async () => {
    transporte.enviados.length = 0;
    await limpiarBase(app);
  });

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

  it('registrarse dos veces no duplica al cliente y responde el mismo mensaje', async () => {
    const primera = await registrar({ nombre: 'Ana', correo: 'ana@mail.cl', consentimiento: true }).expect(200);
    const segunda = await registrar({ nombre: 'Otro nombre', correo: 'ANA@mail.cl', consentimiento: true }).expect(200);

    expect((segunda.body as RegistroClienteResponse).mensaje).toBe((primera.body as RegistroClienteResponse).mensaje);
    const clientes = await listar();
    expect(clientes).toHaveLength(1);
    // Quien conoce un contacto ajeno no puede renombrar a esa persona (el nombre sale en sus correos).
    expect(clientes[0].nombre).toBe('Ana');
  });

  it('registrar un contacto ajeno no reemplaza los datos del cliente existente', async () => {
    await registrar({ nombre: 'Ana', correo: 'ana@mail.cl', telefono: '912345678', consentimiento: true }).expect(200);

    // Un tercero conoce el teléfono de Ana e intenta cambiar su correo y su nombre.
    await registrar({ nombre: 'Intruso', correo: 'intruso@mail.cl', telefono: '912345678', consentimiento: true }).expect(200);

    const clientes = await listar();
    expect(clientes).toHaveLength(1);
    expect(clientes[0]).toMatchObject({ nombre: 'Ana', correo: 'ana@mail.cl', telefono: '+56912345678' });
  });

  it('no asocia a un cliente las ventas del correo ajeno que alguien intentó agregarle', async () => {
    const cifrado = app.get(CifradoService);
    await registrar({ nombre: 'Ana', telefono: '912345678', consentimiento: true }).expect(200);
    const importacion = await prisma.importacion.create({
      data: { archivo: 'x.xlsx', filasLeidas: 1, importadas: 1, duplicadas: 0, conError: 0, asociadas: 0 },
    });
    await prisma.venta.create({
      data: {
        idExterno: 'B-9',
        fecha: new Date('2026-11-01T10:00:00Z'),
        producto: 'Latte',
        cantidad: 1,
        monto: 3500,
        correoHmac: cifrado.hmac('intruso@mail.cl'),
        importacionId: importacion.id,
      },
    });

    await registrar({ nombre: 'Intruso', correo: 'intruso@mail.cl', telefono: '912345678', consentimiento: true }).expect(200);

    expect((await listar())[0].compras).toBe(0);
  });

  it('dos registros simultáneos con el mismo contacto responden igual y crean un solo cliente', async () => {
    const cuerpo = { nombre: 'Ana', correo: 'ana@mail.cl', consentimiento: true };

    const [a, b] = await Promise.all([registrar(cuerpo), registrar(cuerpo)]);

    expect([a.status, b.status]).toEqual([200, 200]);
    expect((b.body as RegistroClienteResponse).mensaje).toBe((a.body as RegistroClienteResponse).mensaje);
    // Solo quien creó al cliente recibe el token; el otro registro llegó a un contacto que ya existía.
    const tokens = [a, b].filter((r) => (r.body as RegistroClienteResponse).token !== undefined);
    expect(tokens).toHaveLength(1);
    expect(await listar()).toHaveLength(1);
  });

  it('recorta el nombre y rechaza nombres vacíos o con saltos de línea', async () => {
    await registrar({ nombre: '   ', correo: 'a@mail.cl', consentimiento: true }).expect(400);
    await registrar({ nombre: 'Ana\nPérez', correo: 'b@mail.cl', consentimiento: true }).expect(400);
    await registrar({ nombre: '  Carla  ', correo: 'c@mail.cl', consentimiento: true }).expect(200);

    const clientes = await listar();
    expect(clientes).toHaveLength(1);
    expect(clientes[0].nombre).toBe('Carla');
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

  describe('tarjeta de socio', () => {
    const registrarAna = async () => {
      const res = await registrar({
        nombre: 'Ana',
        correo: 'ana@mail.cl',
        telefono: '912345678',
        consentimiento: true,
      }).expect(200);
      return (res.body as RegistroClienteResponse).token!;
    };

    it('al registrarse, el cliente nuevo recibe el token y ve su tarjeta', async () => {
      const tokenTarjeta = await registrarAna();

      const res = await perfil(tokenTarjeta).expect(200);
      expect(res.body).toMatchObject({
        nombre: 'Ana',
        correo: 'ana@mail.cl',
        telefono: '+56912345678',
        puntos: 0,
        totalCompras: 0,
      });
    });

    it('registrarse con un contacto ajeno NO entrega el token de esa persona', async () => {
      const tokenAna = await registrarAna();

      // Un tercero que conoce el teléfono de Ana intenta "registrarse" para ver su tarjeta.
      const intruso = await registrar({ nombre: 'Intruso', telefono: '912345678', consentimiento: true }).expect(200);

      expect(intruso.body).not.toHaveProperty('token');
      expect(JSON.stringify(intruso.body)).not.toContain(tokenAna);
    });

    it('registrarse de nuevo con un contacto existente manda el enlace al correo guardado, no a otro', async () => {
      const tokenAna = await registrarAna();
      transporte.enviados.length = 0;

      await registrar({ nombre: 'Intruso', correo: 'intruso@mail.cl', telefono: '912345678', consentimiento: true }).expect(200);

      expect(transporte.enviados).toHaveLength(1);
      expect(transporte.enviados[0].to).toBe('ana@mail.cl');
      expect(transporte.enviados[0].text).toContain(`/socio/${tokenAna}`);
    });

    it('un token inexistente responde 404', () => {
      return perfil('no-existe').expect(404);
    });

    it('el token de baja no abre la tarjeta ni el de la tarjeta da de baja', async () => {
      const tokenTarjeta = await registrarAna();
      const { tokenBaja } = await prisma.cliente.findFirstOrThrow();

      // tokenBaja viaja en cada correo de ofertas: no debe servir para ver los datos del cliente.
      await perfil(tokenBaja).expect(404);

      await request(app.getHttpServer()).post(`/api/clientes/baja/${tokenTarjeta}`).expect(200);
      expect((await listar())[0].dadoDeBaja).toBe(false);
    });

    it('la tarjeta trae el token de baja para su enlace "darte de baja"', async () => {
      const tokenTarjeta = await registrarAna();
      const { tokenBaja } = await prisma.cliente.findFirstOrThrow();

      const res = await perfil(tokenTarjeta).expect(200);
      expect((res.body as SocioPerfilResponse).tokenBaja).toBe(tokenBaja);
    });

    it('los puntos salen de lo consumido: 1 por cada $1.000', async () => {
      const tokenTarjeta = await registrarAna();
      const cliente = await prisma.cliente.findFirstOrThrow();
      const importacion = await prisma.importacion.create({
        data: { archivo: 'x.xlsx', filasLeidas: 1, importadas: 1, duplicadas: 0, conError: 0, asociadas: 1 },
      });
      await prisma.venta.create({
        data: {
          idExterno: 'P-1',
          fecha: new Date('2026-11-01T10:00:00Z'),
          producto: 'Latte',
          cantidad: 1,
          monto: 3500,
          clienteId: cliente.id,
          importacionId: importacion.id,
        },
      });

      const res = await perfil(tokenTarjeta).expect(200);
      expect(res.body).toMatchObject({ puntos: 3, totalCompras: 1, montoTotal: 3500 });
    });

    it('solo muestra las ofertas dirigidas a un segmento al que el cliente pertenece', async () => {
      const tokenTarjeta = await registrarAna();
      const segmento = (s: object) => JSON.stringify(s);
      await prisma.oferta.create({
        data: { asunto: 'Para todos', mensaje: 'm', segmento: segmento({ minCompras: 0, dias: 30 }), enviados: 1, fallidos: 0 },
      });
      await prisma.oferta.create({
        data: {
          asunto: 'Solo quienes compraron Flat White',
          mensaje: 'm',
          segmento: segmento({ producto: 'Flat White', minCompras: 1, dias: 30 }),
          enviados: 1,
          fallidos: 0,
        },
      });

      const res = await perfil(tokenTarjeta).expect(200);
      const asuntos = (res.body as SocioPerfilResponse).ofertas.map((o) => o.asunto);
      expect(asuntos).toEqual(['Para todos']);
    });
  });

  describe('consultar-socio', () => {
    const MENSAJE = /enviamos el enlace/;

    it('si el contacto existe, manda el enlace por correo y NO lo devuelve en la respuesta', async () => {
      const res = await registrar({ nombre: 'Ana', correo: 'ana@mail.cl', consentimiento: true }).expect(200);
      const tokenAna = (res.body as RegistroClienteResponse).token!;
      transporte.enviados.length = 0;

      const respuesta = await consultar('Ana@Mail.cl').expect(200);

      expect(respuesta.body).toEqual({ mensaje: expect.stringMatching(MENSAJE) as string });
      expect(JSON.stringify(respuesta.body)).not.toContain(tokenAna);
      expect(transporte.enviados).toHaveLength(1);
      expect(transporte.enviados[0].to).toBe('ana@mail.cl');
      expect(transporte.enviados[0].text).toContain(`http://localhost:3000/socio/${tokenAna}`);
    });

    it('responde exactamente igual exista o no el contacto: no se puede averiguar quién es socio', async () => {
      await registrar({ nombre: 'Ana', correo: 'ana@mail.cl', telefono: '912345678', consentimiento: true }).expect(200);

      const existe = await consultar('912345678').expect(200);
      const noExiste = await consultar('987654321').expect(200);
      const porCorreoInexistente = await consultar('nadie@mail.cl').expect(200);

      expect(noExiste.body).toEqual(existe.body);
      expect(porCorreoInexistente.body).toEqual(existe.body);
    });

    it('no envía ningún correo si el contacto no existe', async () => {
      await consultar('nadie@mail.cl').expect(200);
      await consultar('987654321').expect(200);

      expect(transporte.enviados).toHaveLength(0);
    });

    it('un socio registrado solo con teléfono no recibe nada (no hay a dónde enviar) y la respuesta es la misma', async () => {
      await registrar({ nombre: 'Beto', telefono: '912345678', consentimiento: true }).expect(200);
      transporte.enviados.length = 0;

      const res = await consultar('912345678').expect(200);

      expect((res.body as MensajeResponse).mensaje).toMatch(MENSAJE);
      expect(transporte.enviados).toHaveLength(0);
    });

    it('un fallo del servidor de correo no cambia la respuesta ni la rompe', async () => {
      await registrar({ nombre: 'Ana', correo: 'ana@mail.cl', consentimiento: true }).expect(200);
      transporte.fallosPendientes = 1;

      const res = await consultar('ana@mail.cl').expect(200);

      expect((res.body as MensajeResponse).mensaje).toMatch(MENSAJE);
    });

    it('rechaza lo que no es un correo ni un teléfono válido, y los campos de más', async () => {
      await consultar('hola').expect(400);
      await request(app.getHttpServer()).post('/api/clientes/consultar-socio').send({}).expect(400);
      await request(app.getHttpServer())
        .post('/api/clientes/consultar-socio')
        .send({ contacto: 'ana@mail.cl', extra: 1 })
        .expect(400);
    });
  });

  it('el listado exige token de admin', () => {
    return request(app.getHttpServer()).get('/api/clientes').expect(401);
  });
});

describe('Clientes: límite de peticiones (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await crearApp(crearTransporteFalso(), { conLimites: true });
  });

  afterAll(() => app.close());

  it('consultar-socio acepta 5 peticiones por minuto y rechaza la sexta con 429', async () => {
    const consultar = () =>
      request(app.getHttpServer()).post('/api/clientes/consultar-socio').send({ contacto: 'ana@mail.cl' });

    for (let i = 0; i < 5; i++) await consultar().expect(200);
    await consultar().expect(429);
  });

  it('el registro acepta 20 peticiones por minuto y rechaza la siguiente con 429', async () => {
    const registrar = () =>
      request(app.getHttpServer())
        .post('/api/clientes/registro')
        .send({ nombre: 'Ana', correo: 'ana@mail.cl', consentimiento: true });

    for (let i = 0; i < 20; i++) await registrar().expect(200);
    await registrar().expect(429);
  });
});
