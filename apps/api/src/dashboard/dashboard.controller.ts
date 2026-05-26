import { Controller, Get, UseGuards } from '@nestjs/common';
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
  getWeeklyChart() {
    return this.dashboardService.getWeeklyChart();
  }

  @Get('top-products')
  @Roles('ADMIN', 'VENDEDOR')
  getTopProducts() {
    return this.dashboardService.getTopProducts();
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
