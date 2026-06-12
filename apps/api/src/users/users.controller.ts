import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Get('store')
  @Roles('ADMIN', 'MERCHANT')
  findStoreUsers(@Request() req: any) {
    return this.usersService.findByStoreOwner(req.user.id);
  }

  @Post('store')
  @Roles('ADMIN', 'MERCHANT')
  createStoreUser(@Request() req: any, @Body() dto: CreateUserDto) {
    return this.usersService.createForStoreOwner(req.user.id, dto);
  }

  @Put('store/:id')
  @Roles('ADMIN', 'MERCHANT')
  updateStoreUser(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateForStoreOwner(id, req.user.id, dto);
  }

  @Delete('store/:id')
  @Roles('ADMIN', 'MERCHANT')
  deleteStoreUser(@Request() req: any, @Param('id') id: string) {
    return this.usersService.deleteForStoreOwner(id, req.user.id);
  }
}
