import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AccountingController {
  constructor(private service: AccountingService) {}

  @Get('daily')
  getDailyReport(@Query('date') date: string) {
    return this.service.getDailyReport(date ? new Date(date) : new Date());
  }

  @Get('monthly')
  getMonthlyReport(@Query('year') year: string, @Query('month') month: string) {
    const now = new Date();
    return this.service.getMonthlyReport(
      year ? parseInt(year) : now.getFullYear(),
      month ? parseInt(month) : now.getMonth() + 1,
    );
  }

  @Post('cash-close')
  closeCash(@Body() body: { date: string; actualCash: number; note?: string }, @Request() req: any) {
    return this.service.closeCash({ ...body, userId: req.user.id });
  }

  @Get('cash-closes')
  getCashCloses() {
    return this.service.getCashCloses();
  }
}
