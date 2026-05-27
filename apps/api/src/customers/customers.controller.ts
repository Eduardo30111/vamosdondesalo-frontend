import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Get()
  @Roles('ADMIN', 'VENDEDOR')
  findAll() {
    return this.service.findAll();
  }

  @Get('debtors')
  @Roles('ADMIN', 'VENDEDOR')
  findDebtors() {
    return this.service.findDebtors();
  }

  @Get('morosos')
  @Roles('ADMIN', 'VENDEDOR')
  findMorosos() {
    return this.service.findMorosos();
  }

  @Get('cedula/:cedula')
  @Roles('ADMIN', 'VENDEDOR')
  findByCedula(@Param('cedula') cedula: string) {
    return this.service.findByCedula(cedula);
  }

  @Get(':id')
  @Roles('ADMIN', 'VENDEDOR')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/history')
  @Roles('ADMIN', 'VENDEDOR')
  getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  @Post()
  @Roles('ADMIN', 'VENDEDOR')
  createOrFind(@Body() body: { cedula: string; name?: string; phone?: string }) {
    return this.service.createOrFind(body);
  }

  @Post(':id/charge')
  @Roles('ADMIN', 'VENDEDOR')
  charge(@Param('id') id: string, @Body() body: { amount: number }) {
    return this.service.charge(id, body.amount);
  }

  @Post(':id/payment')
  @Roles('ADMIN', 'VENDEDOR')
  payment(@Param('id') id: string, @Body() body: { amount: number }) {
    return this.service.payment(id, body.amount);
  }
}
