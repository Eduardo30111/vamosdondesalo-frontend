import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { DailyStockService } from '../daily-stock/daily-stock.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private dailyStock: DailyStockService,
  ) {}

  async findAll(status?: string) {
    const where = status ? { status: status as any } : {};
    return this.prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        table: true,
        payments: true,
        deliveryZone: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive() {
    return this.prisma.order.findMany({
      where: { status: { in: ['PENDING', 'PREPARING', 'READY', 'IN_TRANSIT'] } },
      include: {
        items: { include: { product: true } },
        table: true,
        deliveryZone: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findDeliveries() {
    return this.prisma.order.findMany({
      where: { type: 'DELIVERY', status: { in: ['PENDING', 'PREPARING', 'READY', 'IN_TRANSIT'] } },
      include: {
        items: { include: { product: true } },
        deliveryZone: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        items: { include: { product: true } },
        table: true,
        payments: true,
        deliveryZone: true,
      },
    });
  }

  async create(dto: CreateOrderDto) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.items.map((i) => i.productId) } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    let total = 0;

    const items = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestException(`Producto ${item.productId} no encontrado`);
      const unitPrice = product.salePrice;
      total += unitPrice * item.qty;
      return { productId: item.productId, qty: item.qty, unitPrice, notes: item.notes };
    });

    // Calculate delivery fee
    let deliveryFee = 0;
    if (dto.type === 'DELIVERY' && dto.deliveryZoneId) {
      const zone = await this.prisma.deliveryZone.findUnique({ where: { id: dto.deliveryZoneId } });
      if (zone) deliveryFee = zone.fee;
    }

    total += deliveryFee;

    // Generate tracking code for delivery orders
    let trackingCode: string | undefined;
    if (dto.type === 'DELIVERY') {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      trackingCode = `SALO-${code}`;
    }

    const order = await this.prisma.order.create({
      data: {
        type: dto.type as any,
        tableId: dto.tableId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerAddress: dto.customerAddress,
        deliveryZoneId: dto.deliveryZoneId,
        deliveryFee,
        notes: dto.notes,
        total,
        trackingCode,
        items: { create: items },
      },
      include: {
        items: { include: { product: true } },
        table: true,
        deliveryZone: true,
      },
    });

    // Decrement daily stock
    for (const item of items) {
      await this.dailyStock.decrement(item.productId, item.qty);
    }

    this.realtime.emitOrderCreated(order);
    return order;
  }

  async updateStatus(id: string, status: string) {
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: status as any },
      include: {
        items: { include: { product: true } },
        table: true,
        deliveryZone: true,
      },
    });

    this.realtime.emitOrderStatusChanged(order);
    return order;
  }
}
