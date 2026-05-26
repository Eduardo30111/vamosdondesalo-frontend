import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class DailyStockService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  private getTodayDate() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  async getToday() {
    const date = this.getTodayDate();
    return this.prisma.dailyStock.findMany({
      where: { date },
      include: { product: true },
      orderBy: { product: { name: 'asc' } },
    });
  }

  async getAvailableToday() {
    const date = this.getTodayDate();
    const stocks = await this.prisma.dailyStock.findMany({
      where: { date, remaining: { gt: 0 } },
      include: { product: true },
      orderBy: { product: { name: 'asc' } },
    });
    // Also include products without daily stock (legacy fallback)
    const allProducts = await this.prisma.product.findMany({
      where: { active: true },
      include: {
        dailyStocks: { where: { date } },
        kitchenProductions: { where: { status: 'PREPARING' } },
      },
    });
    return allProducts.map((p) => {
      const stock = p.dailyStocks[0];
      const kitchenReady = p.kitchenProductions.reduce((sum, kp) => sum + kp.readyQty, 0);
      return {
        ...p,
        remaining: stock ? stock.remaining + kitchenReady : p.dailyStock + kitchenReady,
        hasStock: stock ? stock.remaining + kitchenReady > 0 : p.dailyStock + kitchenReady > 0,
      };
    }).filter((p) => p.hasStock);
  }

  async openStock(entries: { productId: string; initialQty: number }[]) {
    const date = this.getTodayDate();
    await this.prisma.$transaction(
      entries.map((e) =>
        this.prisma.dailyStock.upsert({
          where: { date_productId: { date, productId: e.productId } },
          update: { initialQty: e.initialQty, remaining: e.initialQty, soldQty: 0 },
          create: { date, productId: e.productId, initialQty: e.initialQty, remaining: e.initialQty },
        }),
      ),
    );
    this.realtime.server.emit('daily_stock:changed', { date: date.toISOString() });
    return this.getToday();
  }

  async decrement(productId: string, qty: number) {
    const date = this.getTodayDate();
    const stock = await this.prisma.dailyStock.findFirst({ where: { date, productId } });
    if (!stock) return;
    const newRemaining = Math.max(0, stock.remaining - qty);
    await this.prisma.dailyStock.update({
      where: { id: stock.id },
      data: { soldQty: { increment: qty }, remaining: newRemaining },
    });
    this.realtime.server.emit('daily_stock:changed', { productId, date: date.toISOString() });
    return { productId, remaining: newRemaining };
  }
}
