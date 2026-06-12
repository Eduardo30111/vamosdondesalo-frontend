import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @Roles('ADMIN', 'VENDEDOR')
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'VENDEDOR')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'MERCHANT')
  create(@Request() req: any, @Body() dto: CreateProductDto) {
    const storeId = req.user.role === 'ADMIN' ? (dto as any).storeId : req.user.storeId;
    return this.productsService.create(dto, storeId);
  }

  @Put(':id')
  @Roles('ADMIN', 'MERCHANT')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    const storeId = req.user.role === 'ADMIN' ? (dto as any).storeId : req.user.storeId;
    return this.productsService.update(id, dto, req.user.id, req.user.role === 'ADMIN', storeId);
  }

  @Put(':id/receive-supplier')
  @Roles('ADMIN')
  receiveSupplierStock(@Param('id') id: string, @Body('qty') qty: number) {
    return this.productsService.receiveSupplierStock(id, qty);
  }

  @Put(':id/return-supplier')
  @Roles('ADMIN')
  returnSupplierStock(@Param('id') id: string, @Body('qty') qty: number) {
    return this.productsService.returnSupplierStock(id, qty);
  }

  @Delete(':id')
  @Roles('ADMIN')
  delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }
}
