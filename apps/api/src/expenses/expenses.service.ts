import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  findAll(type?: string) {
    const where: any = {};
    if (type) where.type = type;
    return this.prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  findByDateRange(from: Date, to: Date, type?: string) {
    const where: any = { date: { gte: from, lte: to } };
    if (type) where.type = type;
    return this.prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  create(data: { category: string; amount: number; type: string; date?: string; userId: string }) {
    return this.prisma.expense.create({
      data: {
        category: data.category,
        amount: data.amount,
        type: data.type as any,
        date: data.date ? new Date(data.date) : new Date(),
        userId: data.userId,
      },
    });
  }

  update(id: string, data: { category?: string; amount?: number; type?: string; date?: string }) {
    const updateData: any = { ...data };
    if (data.date) updateData.date = new Date(data.date);
    if (data.type) updateData.type = data.type;
    return this.prisma.expense.update({ where: { id }, data: updateData });
  }

  delete(id: string) {
    return this.prisma.expense.delete({ where: { id } });
  }
}
