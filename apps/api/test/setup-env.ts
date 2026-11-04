// Variables de entorno para los tests. Las claves son aleatorias en cada corrida:
// los tests nunca dependen de un .env ni de secretos reales.
import { randomBytes } from 'node:crypto';

const porDefecto: Record<string, string> = {
  DATABASE_URL: 'file:./test-unit.db',
  JWT_SECRET: randomBytes(32).toString('hex'),
  CLIENTES_ENC_KEY: randomBytes(32).toString('base64'),
  CLIENTES_HMAC_KEY: randomBytes(32).toString('base64'),
  ADMIN_EMAIL: 'admin@cafeteria.test',
  ADMIN_PASSWORD: 'clave-de-prueba',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  MAIL_FROM: 'Cafetería <ofertas@cafeteria.test>',
  PUBLIC_WEB_URL: 'http://localhost:3000',
};

for (const [nombre, valor] of Object.entries(porDefecto)) {
  process.env[nombre] ??= valor;
}
