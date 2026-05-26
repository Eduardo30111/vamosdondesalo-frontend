import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class KitchenProductionService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  private getTodayDate() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  async findActive() {
    return this.prisma.kitchenProduction.findMany({
      where: { status: 'PREPARING' },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getVitrina() {
    const date = this.getTodayDate();
    const [productions, dailyStocks] = await Promise.all([
      this.prisma.kitchenProduction.findMany({
        where: { status: 'PREPARING' },
        include: { product: true },
      }),
      this.prisma.dailyStock.findMany({ where: { date }, include: { product: true } }),
    ]);

    const productMap = new Map<string, { productId: string; name: string; photoUrl: string | null; startedQty: number; readyQty: number; remainingStock: number }>();

    for (const ds of dailyStocks) {
      productMap.set(ds.productId, {
        productId: ds.productId,
        name: ds.product.name,
        photoUrl: ds.product.photoUrl,
        startedQty: 0,
        readyQty: 0,
        remainingStock: ds.remaining,
      });
    }

    for (const kp of productions) {
      const existing = productMap.get(kp.productId);
      if (existing) {
        existing.startedQty += kp.startedQty;
        existing.readyQty += kp.readyQty;
      } else {
        productMap.set(kp.productId, {
          productId: kp.productId,
          name: kp.product.name,
          photoUrl: kp.product.photoUrl,
          startedQty: kp.startedQty,
          readyQty: kp.readyQty,
          remainingStock: kp.product.dailyStock,
        });
      }
    }

    return Array.from(productMap.values());
  }

  async create(productId: string, startedQty: number) {
    const production = await this.prisma.kitchenProduction.create({
      data: { productId, startedQty, readyQty: 0, status: 'PREPARING' },
      include: { product: true },
    });
    this.realtime.server.emit('production:updated', production);
    return production;
  }

  async addReady(id: string, qty: number) {
    const production = await this.prisma.kitchenProduction.update({
      where: { id },
      data: { readyQty: { increment: qty } },
      include: { product: true },
    });
    this.realtime.server.emit('production:updated', production);
    return production;
  }

  async complete(id: string) {
    const production = await this.prisma.kitchenProduction.update({
      where: { id },
      data: { status: 'READY' },
      include: { product: true },
    });
    this.realtime.server.emit('production:updated', production);
    return production;
  }
}
