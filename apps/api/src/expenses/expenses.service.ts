import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(type?: string, storeId?: string, year?: number, month?: number) {
    const where: any = {};
    if (type) where.type = type;
    if (storeId) {
      const users = await this.prisma.user.findMany({ where: { storeId } });
      const userIds = users.map((u) => u.id);
      where.userId = { in: userIds };
    }

    // Default to current month/year if not provided
    const targetYear = year ? Number(year) : new Date().getFullYear();
    const targetMonth = month ? Number(month) : (new Date().getMonth() + 1);

    const startOfMonth = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    where.date = {
      gte: startOfMonth,
      lte: endOfMonth,
    };

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

  async findScheduled(storeId?: string, year?: number, month?: number) {
    const where: any = {};
    if (storeId) {
      const users = await this.prisma.user.findMany({ where: { storeId } });
      const userIds = users.map((u) => u.id);
      where.userId = { in: userIds };
    }

    const targetYear = year ? Number(year) : new Date().getFullYear();
    const targetMonth = month ? Number(month) : (new Date().getMonth() + 1);

    const startOfMonth = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    where.date = {
      gte: startOfMonth,
      lte: endOfMonth,
    };

    return this.prisma.scheduledExpense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  createScheduled(data: { name: string; description?: string; amount: number; date?: string; userId: string }) {
    return this.prisma.scheduledExpense.create({
      data: {
        name: data.name,
        description: data.description,
        amount: data.amount,
        date: data.date ? new Date(data.date.includes('T') ? data.date : data.date + 'T12:00:00Z') : new Date(),
        userId: data.userId,
      },
    });
  }

  updateScheduled(id: string, data: { name?: string; description?: string; amount?: number; date?: string }) {
    const updateData: any = { ...data };
    if (data.date) {
      updateData.date = new Date(data.date.includes('T') ? data.date : data.date + 'T12:00:00Z');
    }
    return this.prisma.scheduledExpense.update({ where: { id }, data: updateData });
  }

  deleteScheduled(id: string) {
    return this.prisma.scheduledExpense.delete({ where: { id } });
  }

  async payScheduled(id: string, amount: number, userId: string) {
    const scheduled = await this.prisma.scheduledExpense.findUnique({ where: { id } });
    if (!scheduled) {
      throw new Error('Deuda o gasto programado no encontrado');
    }

    const updated = await this.prisma.scheduledExpense.update({
      where: { id },
      data: {
        paidAmount: {
          increment: amount,
        },
      },
    });

    // Create a new DAILY expense in the Expense table representing the abono
    await this.prisma.expense.create({
      data: {
        category: 'Abono de Deuda',
        description: `Abono a: ${scheduled.name}${scheduled.description ? ' - ' + scheduled.description : ''}`,
        amount: amount,
        type: 'DAILY',
        date: new Date(),
        userId: userId,
      },
    });

    return updated;
  }
}
