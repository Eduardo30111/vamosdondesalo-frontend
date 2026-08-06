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
    configs.forEach((c) => { map[c.key] = c.value; });
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
    const uppercaseCode = code.toUpperCase();
    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          { trackingCode: uppercaseCode },
          { customerDoc: code }
        ]
      },
      include: {
        items: { include: { product: true } },
        deliveryZone: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (orders.length === 0) throw new NotFoundException('Pedido no encontrado');
    return orders;
  }

  @Get('payment-methods')
  async getPaymentMethods() {
    return this.prisma.paymentMethodConfig.findMany({ where: { enabled: true } });
  }

  private async getAvailableProducts() {
    await this.prisma.checkAndResetDailyStock();
    const now = new Date();
    // Colombia timezone America/Bogota (UTC-5)
    const colombiaTime = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const year = colombiaTime.getFullYear();
    const month = String(colombiaTime.getMonth() + 1).padStart(2, '0');
    const day = String(colombiaTime.getDate()).padStart(2, '0');
    const todayDateStr = `${year}-${month}-${day}`;

    const [vitrinaProducts, preparedProducts, todayAuthorizations] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          active: true,
          preparationMode: 'VITRINA',
          OR: [
            { store: null },
            {
              store: {
                active: true,
              }
            }
          ]
        },
        include: { vitrinaStock: true, store: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.findMany({
        where: {
          active: true,
          preparationMode: 'PREPARADO',
          OR: [
            { store: null },
            {
              store: {
                active: true,
              }
            }
          ]
        },
        include: { store: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.preparedAuthorization.findMany({
        where: { date: todayDateStr },
        select: { productId: true },
      }),
    ]);

    const authorizedProductIds = new Set(todayAuthorizations.map((a) => a.productId));

    const visibleVitrina = vitrinaProducts
      .filter((p) => p.vitrinaStock?.lastStockDate === todayDateStr || (p.vitrinaStock?.qty ?? 0) > 0)
      .map((p) => {
        const qty = p.vitrinaStock?.qty ?? 0;
        const isFreeStore = p.store?.plan === 'FREE';
        const isAgotado = qty <= 0;
        return {
          ...p,
          remaining: isFreeStore ? undefined : qty,
          hasStock: qty > 0,
          isAgotado,
        };
      });

    const visiblePrepared = preparedProducts
      .filter((p) => authorizedProductIds.has(p.id))
      .map((p) => ({
        ...p,
        hasStock: true,
        isAgotado: false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return [...visibleVitrina, ...visiblePrepared];
  }
}
