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

    const products = await this.getAvailableProducts();

    const paymentMethods = await this.prisma.paymentMethodConfig.findMany({
      where: { enabled: true },
    });

    const deliveryZones = await this.prisma.deliveryZone.findMany({
      where: { enabled: true },
      orderBy: { name: 'asc' },
    });

    return { table, products, paymentMethods, deliveryZones };
  }

  @Get('products')
  async getProducts() {
    return this.getAvailableProducts();
  }

  @Get('config')
  async getConfig() {
    const configs = await this.prisma.appConfig.findMany();
    const map: Record<string, string> = {};
    configs.forEach(c => { map[c.key] = c.value; });
    return map;
  }

  @Get('delivery-zones')
  async getDeliveryZones() {
    return this.prisma.deliveryZone.findMany({ where: { enabled: true }, orderBy: { name: 'asc' } });
  }

  @Post('orders')
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get('orders/:id')
  async getOrderStatus(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Get('orders/track/:code')
  async trackOrder(@Param('code') code: string) {
    const order = await this.prisma.order.findUnique({
      where: { trackingCode: code },
      include: {
        items: { include: { product: true } },
        deliveryZone: true,
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  @Get('payment-methods')
  async getPaymentMethods() {
    return this.prisma.paymentMethodConfig.findMany({ where: { enabled: true } });
  }

  private async getAvailableProducts() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const dailyStocks = await this.prisma.dailyStock.findMany({
      where: { date, remaining: { gt: 0 } },
      include: { product: true },
    });
    const stocksMap = new Map(dailyStocks.map(s => [s.productId, s.remaining]));
    // Add kitchen ready production
    const productions = await this.prisma.kitchenProduction.findMany({
      where: { status: 'PREPARING' },
      include: { product: true },
    });
    for (const kp of productions) {
      const existing = stocksMap.get(kp.productId) ?? 0;
      stocksMap.set(kp.productId, existing + kp.readyQty);
    }
    const allProducts = await this.prisma.product.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    return allProducts
      .map((p) => {
        const remaining = stocksMap.get(p.id) ?? p.dailyStock;
        return { ...p, remaining, hasStock: remaining > 0 };
      })
      .filter((p) => p.hasStock);
  }
}
