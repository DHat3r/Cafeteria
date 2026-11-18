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
  registrar(@Body() dto: RegistroClienteDto) {
    return this.clientes.registrar(dto);
  }

  // Público: perfil y tarjeta del socio (puntos, ofertas, identificador)
  @Get('socio/:token')
  obtenerPerfilSocio(@Param('token') token: string) {
    return this.clientes.obtenerPerfilSocio(token);
  }

  // Público: consulta de socio por teléfono o correo para recuperar tarjeta
  @Post('consultar-socio')
  @HttpCode(200)
  consultarSocio(@Body('contacto') contacto: string) {
    return this.clientes.consultarSocio(contacto);
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
