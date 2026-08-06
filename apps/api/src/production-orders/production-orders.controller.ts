import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('production-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductionOrdersController {
  constructor(private readonly service: ProductionOrdersService) {}

  @Get()
  @Roles('ADMIN', 'VENDEDOR', 'COCINA')
  findAll() {
    return this.service.findAll();
  }

  @Get('pending')
  @Roles('ADMIN', 'VENDEDOR', 'COCINA')
  findPending() {
    return this.service.findPending();
  }

  @Post()
  @Roles('ADMIN', 'VENDEDOR')
  create(@Body() body: { productId: string; requestedQty: number; userId: string }) {
    return this.service.create(body.productId, body.requestedQty, body.userId);
  }

  @Put(':id/add-ready')
  @Roles('ADMIN', 'COCINA')
  addReady(@Param('id') id: string, @Body() body: { qty: number }) {
    return this.service.addReady(id, body.qty);
  }

  @Put(':id/complete')
  @Roles('ADMIN', 'COCINA')
  complete(@Param('id') id: string) {
    return this.service.complete(id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'COCINA', 'VENDEDOR')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
