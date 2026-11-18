import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { CorreoModule } from '../correo/correo.module.js';
import { ClientesController } from './clientes.controller.js';
import { ClientesService } from './clientes.service.js';

@Module({
  // Sin límite global: solo se limitan las rutas públicas que crean registros o mandan correos (ver el controlador).
  imports: [CorreoModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
