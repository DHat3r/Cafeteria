import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientesModule } from './clientes/clientes.module.js';
import { AuthModule } from './auth/auth.module.js';
import { validarEnv } from './config/env.js';
import { HealthController } from './health/health.controller.js';
import { ImportacionesModule } from './importaciones/importaciones.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SeguridadModule } from './seguridad/seguridad.module.js';

@Module({
  imports: [
    // En local lee el .env de la raíz del repo; en Docker las variables vienen del compose.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validarEnv,
    }),
    PrismaModule,
    SeguridadModule,
    AuthModule,
    ClientesModule,
    ImportacionesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
