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
  getDailyReport(@Query('date') date?: string) {
    let targetDate: Date;
    if (date) {
      const parts = date.split('-');
      targetDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    } else {
      const now = new Date();
      const colombiaNow = new Date(now.getTime() - 5 * 60 * 60 * 1000);
      targetDate = new Date(Date.UTC(colombiaNow.getUTCFullYear(), colombiaNow.getUTCMonth(), colombiaNow.getUTCDate()));
    }
    return this.service.getDailyReport(targetDate);
  }

  @Get('monthly')
  getMonthlyReport(@Query('year') year?: string, @Query('month') month?: string) {
    let targetYear = year ? parseInt(year) : null;
    let targetMonth = month ? parseInt(month) : null;

    if (!targetYear || !targetMonth) {
      const now = new Date();
      const colombiaNow = new Date(now.getTime() - 5 * 60 * 60 * 1000);
      targetYear = targetYear || colombiaNow.getUTCFullYear();
      targetMonth = targetMonth || (colombiaNow.getUTCMonth() + 1);
    }

    return this.service.getMonthlyReport(targetYear, targetMonth);
  }

  @Get('weekly')
  getWeeklyReport(@Query('date') dateStr?: string) {
    let targetDate: Date;
    if (dateStr) {
      const parts = dateStr.split('-');
      targetDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    } else {
      const now = new Date();
      const colombiaNow = new Date(now.getTime() - 5 * 60 * 60 * 1000);
      targetDate = new Date(Date.UTC(colombiaNow.getUTCFullYear(), colombiaNow.getUTCMonth(), colombiaNow.getUTCDate()));
    }
    return this.service.getWeeklyReport(targetDate);
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
