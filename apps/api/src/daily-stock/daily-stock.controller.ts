import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { DailyStockService } from './daily-stock.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('daily-stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DailyStockController {
  constructor(private readonly service: DailyStockService) {}

  @Get('today')
  @Roles('ADMIN', 'VENDEDOR', 'COCINA')
  getToday() {
    return this.service.getToday();
  }

  @Get('today/available')
  getAvailableToday() {
    return this.service.getAvailableToday();
  }

  @Post('open')
  @Roles('ADMIN')
  openStock(@Body() body: { productId: string; initialQty: number }[]) {
    return this.service.openStock(body);
  }
}
