import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TablesService } from './tables.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('tables')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class TablesController {
  constructor(private tablesService: TablesService) {}

  @Get()
  findAll() {
    return this.tablesService.findAll();
  }

  @Post()
  create(@Body() body: { number: number }) {
    return this.tablesService.create(body.number);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { number: number }) {
    return this.tablesService.update(id, body.number);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tablesService.delete(id);
  }

  @Post(':id/regenerate-token')
  regenerateToken(@Param('id') id: string) {
    return this.tablesService.regenerateToken(id);
  }
}
