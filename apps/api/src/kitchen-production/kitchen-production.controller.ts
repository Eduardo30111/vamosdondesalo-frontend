import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { KitchenProductionService } from './kitchen-production.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('kitchen-production')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KitchenProductionController {
  constructor(private readonly service: KitchenProductionService) {}

  @Get('active')
  @Roles('ADMIN', 'VENDEDOR', 'COCINA')
  findActive() {
    return this.service.findActive();
  }

  @Get('vitrina')
  findVitrina() {
    return this.service.getVitrina();
  }

  @Post()
  @Roles('ADMIN', 'COCINA')
  create(@Body() body: { productId: string; startedQty: number }) {
    return this.service.create(body.productId, body.startedQty);
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
}
