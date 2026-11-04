import { Module } from '@nestjs/common';
import { ExcelFuente } from './excel.fuente.js';
import { ImportacionesController } from './importaciones.controller.js';
import { ImportacionesService } from './importaciones.service.js';

@Module({
  controllers: [ImportacionesController],
  providers: [ImportacionesService, ExcelFuente],
})
export class ImportacionesModule {}
