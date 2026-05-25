import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppConfigController {
  constructor(private service: AppConfigService) {}

  @Get()
  @Roles('ADMIN')
  getAll() {
    return this.service.getAll();
  }

  @Put()
  @Roles('ADMIN')
  setMany(@Body() body: Record<string, string>) {
    return this.service.setMany(body);
  }
}
