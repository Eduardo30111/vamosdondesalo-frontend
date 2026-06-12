import { Controller, Get, Post, Body, Delete, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PreparedAuthorizationsService } from './prepared-authorizations.service';
import { CreatePreparedAuthorizationDto } from './dto/create-prepared-authorization.dto';

@Controller('prepared-authorizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PreparedAuthorizationsController {
  constructor(private readonly service: PreparedAuthorizationsService) {}

  @Get()
  @Roles('ADMIN', 'COCINA')
  findToday() {
    return this.service.findToday();
  }

  @Post()
  @Roles('ADMIN', 'COCINA')
  authorize(@Body() dto: CreatePreparedAuthorizationDto, @Request() req: any) {
    return this.service.authorize(dto, req.user.id);
  }

  @Delete(':productId')
  @Roles('ADMIN', 'COCINA')
  revoke(@Param('productId') productId: string) {
    return this.service.revoke(productId);
  }
}
