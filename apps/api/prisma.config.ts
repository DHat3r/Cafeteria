import { defineConfig } from 'prisma/config';

// Prisma 7 ya no lee .env solo. En local usamos el .env de la raíz del repo
// (el mismo que usa docker compose); en Docker y en el CI las variables ya vienen definidas.
try {
  process.loadEnvFile('../../.env');
} catch {
  // Sin .env: se usan las variables del entorno.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // prisma generate no necesita la base; el valor por defecto sirve para desarrollo local.
  datasource: { url: process.env.DATABASE_URL ?? 'file:./dev.db' },
});
