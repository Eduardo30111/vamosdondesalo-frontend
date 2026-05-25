import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ExpensesController {
  constructor(private service: ExpensesService) {}

  @Get()
  findAll(@Query('type') type?: string) {
    return this.service.findAll(type);
  }

  @Get('range')
  findByDateRange(@Query('from') from: string, @Query('to') to: string, @Query('type') type?: string) {
    return this.service.findByDateRange(new Date(from), new Date(to), type);
  }

  @Post()
  create(@Body() body: { category: string; description: string; amount: number; type: string; date?: string }, @Request() req: any) {
    return this.service.create({ ...body, userId: req.user.id });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { category?: string; description?: string; amount?: number; type?: string; date?: string }) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
