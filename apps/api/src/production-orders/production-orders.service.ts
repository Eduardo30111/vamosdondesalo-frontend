import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class ProductionOrdersService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  async findAll() {
    return this.prisma.productionOrder.findMany({
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findPending() {
    const orders = await this.prisma.productionOrder.findMany({
      where: { readyQty: { lt: this.prisma.productionOrder.fields.requestedQty } },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });
    return orders.map((o) => ({
      ...o,
      remaining: o.requestedQty - o.readyQty,
    }));
  }

  async create(productId: string, requestedQty: number, userId: string) {
    const productionOrder = await this.prisma.productionOrder.create({
      data: { productId, requestedQty, readyQty: 0, userId },
      include: { product: true },
    });
    this.realtime.server.emit('production:updated', productionOrder);
    return productionOrder;
  }

  async addReady(id: string, qty: number) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!order) throw new NotFoundException('Orden de producción no encontrada');

    const updated = await this.prisma.productionOrder.update({
      where: { id },
      data: { readyQty: { increment: qty } },
      include: { product: true },
    });

    const todayStr = this.prisma.getColombiaTodayStr();
    // Incrementar stock vitrina del producto
    await this.prisma.vitrinaStock.upsert({
      where: { productId: order.productId },
      create: { productId: order.productId, qty, lastStockDate: todayStr },
      update: { qty: { increment: qty }, lastStockDate: todayStr },
    });

    this.realtime.server.emit('production:updated', updated);
    this.realtime.server.emit('vitrina:updated', { productId: order.productId, qty: qty, lastStockDate: todayStr });
    return updated;
  }

  async complete(id: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!order) throw new NotFoundException('Orden de producción no encontrada');

    const remainingToAdd = order.requestedQty - order.readyQty;

    const updated = await this.prisma.productionOrder.update({
      where: { id },
      data: { readyQty: order.requestedQty },
      include: { product: true },
    });

    if (remainingToAdd > 0) {
      const todayStr = this.prisma.getColombiaTodayStr();
      await this.prisma.vitrinaStock.upsert({
        where: { productId: order.productId },
        create: { productId: order.productId, qty: remainingToAdd, lastStockDate: todayStr },
        update: { qty: { increment: remainingToAdd }, lastStockDate: todayStr },
      });
      this.realtime.server.emit('vitrina:updated', { productId: order.productId, qty: remainingToAdd, lastStockDate: todayStr });
    }

    this.realtime.server.emit('production:updated', updated);
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.prisma.productionOrder.delete({
      where: { id },
    });
    this.realtime.server.emit('production:updated', { id, deleted: true });
    return deleted;
  }
}
