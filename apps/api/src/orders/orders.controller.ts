import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @Roles('ADMIN', 'VENDEDOR', 'COCINA')
  findAll(@Query('status') status?: string) {
    return this.ordersService.findAll(status);
  }

  @Get('active')
  @Roles('ADMIN', 'VENDEDOR', 'COCINA')
  findActive() {
    return this.ordersService.findActive();
  }

  @Get('deliveries')
  @Roles('ADMIN', 'VENDEDOR')
  findDeliveries() {
    return this.ordersService.findDeliveries();
  }

  @Get(':id')
  @Roles('ADMIN', 'VENDEDOR', 'COCINA')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'VENDEDOR')
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Put(':id/status')
  @Roles('ADMIN', 'VENDEDOR', 'COCINA')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
