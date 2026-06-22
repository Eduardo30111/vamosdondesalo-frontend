import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(type?: string, storeId?: string) {
    const where: any = {};
    if (type) where.type = type;
    if (storeId) {
      const users = await this.prisma.user.findMany({ where: { storeId } });
      const userIds = users.map((u) => u.id);
      where.userId = { in: userIds };
    }
    return this.prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findByDateRange(from: Date, to: Date, type?: string, storeId?: string) {
    const where: any = { date: { gte: from, lte: to } };
    if (type) where.type = type;
    if (storeId) {
      const users = await this.prisma.user.findMany({ where: { storeId } });
      const userIds = users.map((u) => u.id);
      where.userId = { in: userIds };
    }
    return this.prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  create(data: { category: string; description?: string; amount: number; type: string; date?: string; userId: string }) {
    return this.prisma.expense.create({
      data: {
        category: data.category,
        description: data.description,
        amount: data.amount,
        type: data.type as any,
        date: data.date ? new Date(data.date.includes('T') ? data.date : data.date + 'T12:00:00Z') : new Date(),
        userId: data.userId,
      },
    });
  }

  update(id: string, data: { category?: string; description?: string; amount?: number; type?: string; date?: string }) {
    const updateData: any = { ...data };
    if (data.date) {
      updateData.date = new Date(data.date.includes('T') ? data.date : data.date + 'T12:00:00Z');
    }
    if (data.type) updateData.type = data.type;
    return this.prisma.expense.update({ where: { id }, data: updateData });
  }

  delete(id: string) {
    return this.prisma.expense.delete({ where: { id } });
  }
}
