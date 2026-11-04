import { randomBytes } from 'node:crypto';
import { validarEnv } from './env.js';

const valido = () => ({
  DATABASE_URL: 'file:./test.db',
  JWT_SECRET: 'x'.repeat(32),
  CLIENTES_ENC_KEY: randomBytes(32).toString('base64'),
  CLIENTES_HMAC_KEY: randomBytes(32).toString('base64'),
  ADMIN_EMAIL: 'Admin@Cafe.cl',
  ADMIN_PASSWORD: 'clave-segura',
  SMTP_HOST: 'localhost',
  MAIL_FROM: 'ofertas@cafe.cl',
  PUBLIC_WEB_URL: 'http://localhost:3000/',
});

describe('validarEnv', () => {
  it('acepta una configuración completa y normaliza valores', () => {
    const env = validarEnv(valido());

    expect(env.PORT).toBe(3001);
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.ADMIN_EMAIL).toBe('admin@cafe.cl');
    expect(env.PUBLIC_WEB_URL).toBe('http://localhost:3000');
  });

  it('falla si falta una variable obligatoria', () => {
    const { JWT_SECRET: _omitida, ...sinJwt } = valido();

    expect(() => validarEnv(sinJwt)).toThrow('JWT_SECRET es obligatoria');
  });

  it('falla si la clave de cifrado no es de 32 bytes', () => {
    const env = { ...valido(), CLIENTES_ENC_KEY: randomBytes(16).toString('base64') };

    expect(() => validarEnv(env)).toThrow('CLIENTES_ENC_KEY');
  });

  it('falla si el secreto JWT es corto', () => {
    expect(() => validarEnv({ ...valido(), JWT_SECRET: 'corto' })).toThrow('JWT_SECRET');
  });
});
