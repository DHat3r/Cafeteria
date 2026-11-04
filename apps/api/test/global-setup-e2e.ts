// Antes de los tests e2e: aplica las migraciones a una base SQLite temporal.
// Al terminar, la borra. Así cada corrida parte de cero y no toca dev.db.
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

export default function setup(): () => void {
  const url = process.env.DATABASE_URL!;
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });

  return () => {
    const archivo = url.replace(/^file:/, '');
    for (const sufijo of ['', '-journal', '-wal', '-shm']) {
      rmSync(archivo + sufijo, { force: true });
    }
  };
}
