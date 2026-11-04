import { Controller, Get } from '@nestjs/common';

// Endpoint para saber si la API está viva. Lo usan Docker (healthcheck) y el CI.
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
