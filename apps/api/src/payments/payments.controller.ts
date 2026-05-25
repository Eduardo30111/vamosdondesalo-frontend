import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @Roles('ADMIN', 'VENDEDOR')
  create(@Body() body: { orderId: string; method: string; amount: number; proofUrl?: string }) {
    return this.paymentsService.createPayment(body);
  }

  @Put(':id/confirm')
  @Roles('ADMIN', 'VENDEDOR')
  confirm(@Param('id') id: string) {
    return this.paymentsService.confirmPayment(id);
  }

  @Get('methods')
  @Roles('ADMIN', 'VENDEDOR')
  getMethods() {
    return this.paymentsService.getPaymentMethods();
  }

  @Put('methods/:method')
  @Roles('ADMIN')
  updateMethod(@Param('method') method: string, @Body() body: { qrUrl?: string; key?: string; enabled: boolean }) {
    return this.paymentsService.updatePaymentMethod(method, body);
  }
}
