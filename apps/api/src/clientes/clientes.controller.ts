import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import type { ClienteResumen, MensajeResponse } from '@cafeteria/shared';
import { AdminGuard } from '../auth/admin.guard.js';
import { ClientesService } from './clientes.service.js';
import { RegistroClienteDto } from './registro-cliente.dto.js';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  // Público: lo usa la página a la que lleva el QR del local.
  @Post('registro')
  @HttpCode(200)
  registrar(@Body() dto: RegistroClienteDto): Promise<MensajeResponse> {
    return this.clientes.registrar(dto);
  }

  // Público: lo usa la página del enlace de baja de cada correo.
  @Post('baja/:token')
  @HttpCode(200)
  darDeBaja(@Param('token') token: string): Promise<MensajeResponse> {
    return this.clientes.darDeBaja(token);
  }

  @Get()
  @UseGuards(AdminGuard)
  listar(): Promise<ClienteResumen[]> {
    return this.clientes.listar();
  }
}
