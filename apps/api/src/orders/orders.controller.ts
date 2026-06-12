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

  @Get('cuentas-activas')
  @Roles('ADMIN', 'VENDEDOR')
  findCuentasActivas() {
    return this.ordersService.findCuentasActivas();
  }

  @Get('cocina')
  @Roles('ADMIN', 'VENDEDOR', 'COCINA')
  findCocina() {
    return this.ordersService.findCocina();
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

  @Put(':id/fiar')
  @Roles('ADMIN', 'VENDEDOR')
  fiar(@Param('id') id: string, @Body() body: { customerId: string }) {
    return this.ordersService.fiar(id, body.customerId);
  }

  @Put(':id/add-items')
  @Roles('ADMIN', 'VENDEDOR')
  addItems(@Param('id') id: string, @Body() body: { items: Array<{ productId: string; qty: number; notes?: string }> }) {
    return this.ordersService.addItems(id, body.items);
  }

  @Put(':id/pagar')
  @Roles('ADMIN', 'VENDEDOR')
  pagar(@Param('id') id: string) {
    return this.ordersService.pagar(id);
  }

  @Put(':id/cancelar')
  @Roles('ADMIN', 'VENDEDOR')
  cancelar(@Param('id') id: string) {
    return this.ordersService.cancelar(id);
  }

  @Put(':id/status')
  @Roles('ADMIN', 'VENDEDOR', 'COCINA')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
