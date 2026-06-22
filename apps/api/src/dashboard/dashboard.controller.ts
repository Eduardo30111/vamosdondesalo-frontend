import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @Roles('ADMIN', 'VENDEDOR')
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('weekly-chart')
  @Roles('ADMIN')
  getWeeklyChart(@Query('from') from?: string, @Query('to') to?: string) {
    return this.dashboardService.getWeeklyChart(from, to);
  }

  @Get('top-products')
  @Roles('ADMIN', 'VENDEDOR')
  getTopProducts(@Query('from') from?: string, @Query('to') to?: string) {
    return this.dashboardService.getTopProducts(from, to);
  }

  @Get('hourly')
  @Roles('ADMIN')
  getHourly() {
    return this.dashboardService.getHourly();
  }

  @Get('top-sellers')
  @Roles('ADMIN')
  getTopSellers() {
    return this.dashboardService.getTopSellers();
  }
}
