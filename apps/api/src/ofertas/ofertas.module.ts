import { Module } from '@nestjs/common';
import { CorreoModule } from '../correo/correo.module.js';
import { OfertasController } from './ofertas.controller.js';
import { OfertasService } from './ofertas.service.js';

@Module({
  imports: [CorreoModule],
  controllers: [OfertasController],
  providers: [OfertasService],
})
export class OfertasModule {}
