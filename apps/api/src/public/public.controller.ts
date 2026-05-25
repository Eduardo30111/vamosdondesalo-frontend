import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';

@Controller('public')
export class PublicController {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
  ) {}

  @Get('menu/:tableToken')
  async getMenu(@Param('tableToken') tableToken: string) {
    const table = await this.prisma.table.findUnique({ where: { qrToken: tableToken } });
    if (!table) throw new NotFoundException('Mesa no encontrada');

    const products = await this.prisma.product.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    const paymentMethods = await this.prisma.paymentMethodConfig.findMany({
      where: { enabled: true },
    });

    const deliveryZones = await this.prisma.deliveryZone.findMany({
      where: { enabled: true },
      orderBy: { name: 'asc' },
    });

    return { table, products, paymentMethods, deliveryZones };
  }

  @Post('orders')
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get('orders/:id')
  async getOrderStatus(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Get('payment-methods')
  async getPaymentMethods() {
    return this.prisma.paymentMethodConfig.findMany({ where: { enabled: true } });
  }

  @Get('delivery-zones')
  async getDeliveryZones() {
    return this.prisma.deliveryZone.findMany({ where: { enabled: true }, orderBy: { name: 'asc' } });
  }

  @Get('config')
  async getConfig() {
    const configs = await this.prisma.appConfig.findMany();
    const map: Record<string, string> = {};
    configs.forEach(c => { map[c.key] = c.value; });
    return map;
  }
}
