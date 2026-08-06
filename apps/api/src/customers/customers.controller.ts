import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
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
  charge(@Param('id') id: string, @Body() body: { amount: number; note?: string; createdAt?: string }) {
    let date: Date | undefined = undefined;
    if (body.createdAt) {
      const parsedDate = new Date(body.createdAt);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
      }
    }
    return this.service.charge(id, body.amount, body.note, date);
  }

  @Post(':id/payment')
  @Roles('ADMIN', 'VENDEDOR')
  payment(@Param('id') id: string, @Body() body: { amount: number; note?: string; paymentMethod?: string }) {
    let note = body.note;
    if (body.paymentMethod) {
      note = (note || 'Abono') + ` (${body.paymentMethod})`;
    }
    return this.service.payment(id, body.amount, note);
  }

  @Delete('credits/:creditId')
  @Roles('ADMIN')
  deleteCredit(@Param('creditId') creditId: string) {
    return this.service.deleteCredit(creditId);
  }

  @Put('credits/:creditId')
  @Roles('ADMIN')
  updateCredit(
    @Param('creditId') creditId: string,
    @Body() body: { amount: number; note?: string; createdAt?: string }
  ) {
    let date: Date | undefined = undefined;
    if (body.createdAt) {
      const parsedDate = new Date(body.createdAt);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
      }
    }
    return this.service.updateCredit(creditId, body.amount, body.note, date);
  }

  @Put(':id')
  @Roles('ADMIN', 'VENDEDOR')
  update(@Param('id') id: string, @Body() body: { name: string; cedula: string; phone?: string }) {
    return this.service.update(id, body);
  }
}
