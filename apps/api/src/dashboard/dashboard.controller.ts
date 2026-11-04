import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { Dashboard } from '@cafeteria/shared';
import { AdminGuard } from '../auth/admin.guard.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
@UseGuards(AdminGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  obtener(@Query('desde') desde?: string, @Query('hasta') hasta?: string): Promise<Dashboard> {
    return this.dashboard.obtener(desde, hasta);
  }
}
