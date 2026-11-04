import { INestApplication, ValidationPipe } from '@nestjs/common';

// Configuración compartida entre main.ts y los tests e2e,
// para que los tests prueben la app tal como corre en producción.
export function configureApp(app: INestApplication): void {
  // Todas las rutas quedan bajo /api (por ejemplo /api/health),
  // así el frontend y la API no chocan si se sirven detrás del mismo dominio.
  app.setGlobalPrefix('api');
  // Valida los DTO y rechaza campos que no estén declarados en ellos.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
