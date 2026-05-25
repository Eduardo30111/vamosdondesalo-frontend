import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { WastesService } from './wastes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('wastes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WastesController {
  constructor(private service: WastesService) {}

  @Get()
  @Roles('ADMIN')
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.findAll(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Post()
  @Roles('ADMIN', 'VENDEDOR')
  create(@Body() body: { productId: string; qty: number; reason: string; note?: string }, @Request() req: any) {
    return this.service.create({ ...body, userId: req.user.id });
  }
}
