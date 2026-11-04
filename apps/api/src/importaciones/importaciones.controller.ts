import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { EncabezadosExcel, ResumenImportacion } from '@cafeteria/shared';
import { AdminGuard } from '../auth/admin.guard.js';
import { ImportacionesService } from './importaciones.service.js';

// El archivo queda en memoria (no se guarda en disco) y se descarta al terminar.
const subidaExcel = FileInterceptor('archivo', {
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, archivo, aceptar) => {
    const esXlsx = archivo.originalname.toLowerCase().endsWith('.xlsx');
    aceptar(esXlsx ? null : new BadRequestException('Sube un archivo Excel .xlsx'), esXlsx);
  },
});

function exigirArchivo(archivo: Express.Multer.File | undefined): Express.Multer.File {
  if (!archivo) throw new BadRequestException('Falta el archivo');
  return archivo;
}

@Controller('importaciones')
@UseGuards(AdminGuard)
export class ImportacionesController {
  constructor(private readonly importaciones: ImportacionesService) {}

  @Post('encabezados')
  @HttpCode(200)
  @UseInterceptors(subidaExcel)
  encabezados(@UploadedFile() archivo?: Express.Multer.File): Promise<EncabezadosExcel> {
    return this.importaciones.encabezados(exigirArchivo(archivo).buffer);
  }

  @Post()
  @UseInterceptors(subidaExcel)
  importar(@UploadedFile() archivo?: Express.Multer.File, @Body('mapeo') mapeo?: string): Promise<ResumenImportacion> {
    const subido = exigirArchivo(archivo);
    return this.importaciones.importar(subido.originalname, subido.buffer, mapeo);
  }

  @Get()
  listar(): Promise<ResumenImportacion[]> {
    return this.importaciones.listar();
  }
}
