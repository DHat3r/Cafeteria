import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { OfertaResumen, VistaPreviaResponse } from '@cafeteria/shared';
import { AdminGuard } from '../auth/admin.guard.js';
import { CrearOfertaDto, VistaPreviaDto } from './oferta.dto.js';
import { OfertasService } from './ofertas.service.js';

@Controller('ofertas')
@UseGuards(AdminGuard)
export class OfertasController {
  constructor(private readonly ofertas: OfertasService) {}

  // Cuántos clientes recibirían la oferta, sin enviar nada.
  @Post('vista-previa')
  @HttpCode(200)
  vistaPrevia(@Body() dto: VistaPreviaDto): Promise<VistaPreviaResponse> {
    return this.ofertas.vistaPrevia(dto.segmento);
  }

  @Post()
  crear(@Body() dto: CrearOfertaDto): Promise<OfertaResumen> {
    return this.ofertas.crear(dto);
  }

  @Get()
  listar(): Promise<OfertaResumen[]> {
    return this.ofertas.listar();
  }
}
