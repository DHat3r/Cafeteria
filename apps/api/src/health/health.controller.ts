import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@cafeteria/shared';

// Endpoint para saber si la API está viva. Lo usan Docker (healthcheck) y el CI.
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return { status: 'ok' };
  }
}
