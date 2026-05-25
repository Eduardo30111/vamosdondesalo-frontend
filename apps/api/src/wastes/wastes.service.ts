import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WastesService {
  constructor(private prisma: PrismaService) {}

  findAll(from?: Date, to?: Date) {
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }
    return this.prisma.waste.findMany({
      where,
      include: { product: true, user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { productId: string; qty: number; reason: string; note?: string; userId: string }) {
    const waste = await this.prisma.waste.create({
      data: {
        productId: data.productId,
        qty: data.qty,
        reason: data.reason as any,
        note: data.note,
        userId: data.userId,
      },
      include: { product: true, user: { select: { id: true, name: true } } },
    });

    // Reduce daily stock
    await this.prisma.product.update({
      where: { id: data.productId },
      data: { dailyStock: { decrement: data.qty } },
    });

    return waste;
  }

  async getTotalCost(from: Date, to: Date) {
    const wastes = await this.prisma.waste.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { product: { select: { costPrice: true } } },
    });
    return wastes.reduce((sum, w) => sum + w.qty * w.product.costPrice, 0);
  }
}
