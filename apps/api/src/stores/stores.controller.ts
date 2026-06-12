import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { StoresService } from './stores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('stores')
export class StoresController {
  constructor(private service: StoresService) {}

  @Get()
  findAllActive() {
    return this.service.findAllActive();
  }

  @Get('admin-list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAllAdmin() {
    return this.service.findAllAdmin();
  }

  @Get('my-store')
  @UseGuards(JwtAuthGuard)
  findMyStore(@Request() req: any) {
    return this.service.findByOwner(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MERCHANT')
  create(
    @Request() req: any,
    @Body() body: { name: string; description?: string; logoUrl?: string; bannerUrl?: string; whatsappNumber: string; category: string }
  ) {
    return this.service.create(req.user.id, body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MERCHANT')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const isAdmin = req.user.role === 'ADMIN';
    return this.service.update(id, req.user.id, isAdmin, body);
  }

  @Post(':id/recharge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  recharge(@Param('id') id: string, @Body('amount') amount: number) {
    return this.service.recharge(id, amount);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  approve(@Param('id') id: string, @Body('active') active: boolean) {
    return this.service.approve(id, active);
  }
}
