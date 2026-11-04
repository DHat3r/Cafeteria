import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

// Base temporal única por corrida. Se define aquí (proceso principal) para que
// la vean tanto el globalSetup (migraciones) como los tests.
const archivo = join(tmpdir(), `cafeteria-e2e-${process.pid}.db`).replaceAll('\\', '/');
process.env.DATABASE_URL = `file:${archivo}`;

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
    globalSetup: ['./test/global-setup-e2e.ts'],
    env: { DATABASE_URL: process.env.DATABASE_URL },
    // Los archivos e2e comparten la base: se corren uno a la vez.
    fileParallelism: false,
  },
});
