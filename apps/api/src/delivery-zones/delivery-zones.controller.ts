import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DeliveryZonesService } from './delivery-zones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('delivery-zones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryZonesController {
  constructor(private service: DeliveryZonesService) {}

  @Get()
  @Roles('ADMIN', 'VENDEDOR')
  findAll() {
    return this.service.findAll();
  }

  @Get('enabled')
  @Roles('ADMIN', 'VENDEDOR')
  findEnabled() {
    return this.service.findEnabled();
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() body: { name: string; fee: number; enabled?: boolean }) {
    return this.service.create(body);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() body: { name?: string; fee?: number; enabled?: boolean }) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
