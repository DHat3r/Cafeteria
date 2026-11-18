import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { ClienteResumen, MensajeResponse, RegistroClienteResponse, SocioPerfilResponse } from '@cafeteria/shared';
import { AdminGuard } from '../auth/admin.guard.js';
import { ClientesService } from './clientes.service.js';
import { ConsultaSocioDto } from './consulta-socio.dto.js';
import { RegistroClienteDto } from './registro-cliente.dto.js';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  // Público: lo usa la página a la que lleva el QR del local.
  // Los límites cuentan por origen: la web llama a la API desde un solo servidor, así que valen como tope
  // global de la ruta. Eso también frena que alguien use estas rutas para llenar de correos a una víctima.
  @Post('registro')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  registrar(@Body() dto: RegistroClienteDto): Promise<RegistroClienteResponse> {
    return this.clientes.registrar(dto);
  }

  // Público: perfil y tarjeta del socio (puntos, ofertas, identificador). El token es el secreto: solo se
  // entrega al registrarse por primera vez y por correo.
  @Get('socio/:token')
  obtenerPerfilSocio(@Param('token') token: string): Promise<SocioPerfilResponse> {
    return this.clientes.obtenerPerfilSocio(token);
  }

  // Público: pide que se envíe al correo del socio el enlace a su tarjeta. Responde siempre lo mismo.
  @Post('consultar-socio')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  consultarSocio(@Body() dto: ConsultaSocioDto): Promise<MensajeResponse> {
    return this.clientes.consultarSocio(dto.contacto);
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
