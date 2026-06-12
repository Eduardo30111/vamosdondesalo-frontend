import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  async getDailyReport(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [sales, payments, expenses, wastes, monthlyExpenses] = await Promise.all([
      // Total sales (orders that are paid)
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          paymentStatus: { in: ['PAID', 'FIADO'] },
        },
        _sum: { total: true },
        _count: true,
      }),
      // Sales by payment method
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { createdAt: { gte: startOfDay, lte: endOfDay } },
        _sum: { amount: true },
      }),
      // Daily expenses
      this.prisma.expense.aggregate({
        where: { date: { gte: startOfDay, lte: endOfDay }, type: 'DAILY' },
        _sum: { amount: true },
      }),
      // Wastes cost
      this.prisma.waste.findMany({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } },
        include: { product: { select: { costPrice: true } } },
      }),
      // Monthly expenses (prorated)
      this.prisma.expense.aggregate({
        where: { type: 'MONTHLY' },
        _sum: { amount: true },
      }),
    ]);

    // Calculate supplier costs from sold items
    const orderItems = await this.prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: startOfDay, lte: endOfDay }, paymentStatus: { in: ['PAID', 'FIADO'] } } },
      include: { product: { select: { costPrice: true } } },
    });

    const totalSales = sales._sum.total || 0;
    const supplierCosts = orderItems.reduce((sum, item) => sum + item.qty * item.product.costPrice, 0);
    const wasteCost = wastes.reduce((sum, w) => sum + w.qty * w.product.costPrice, 0);
    const dailyExpenses = expenses._sum.amount || 0;
    const monthlyExpensesProrated = (monthlyExpenses._sum.amount || 0) / 30;
    const netProfit = totalSales - supplierCosts - wasteCost - dailyExpenses - monthlyExpensesProrated;
    const margin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    // Expected cash = cash payments of the day
    const cashPayments = payments.find(p => p.method === 'CASH');
    const expectedCash = cashPayments?._sum.amount || 0;

    return {
      date: startOfDay.toISOString(),
      totalSales,
      orderCount: sales._count,
      salesByMethod: payments.map(p => ({ method: p.method, amount: p._sum.amount || 0 })),
      supplierCosts,
      wasteCost,
      dailyExpenses,
      monthlyExpensesProrated: Math.round(monthlyExpensesProrated),
      netProfit: Math.round(netProfit),
      margin: Math.round(margin * 100) / 100,
      expectedCash,
    };
  }

  async getMonthlyReport(year: number, month: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, month, 0).getDate();

    const [sales, payments, dailyExpenses, monthlyExpenses, wastes] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          paymentStatus: { in: ['PAID', 'FIADO'] },
        },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { date: { gte: startOfMonth, lte: endOfMonth }, type: 'DAILY' },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { type: 'MONTHLY' },
        _sum: { amount: true },
      }),
      this.prisma.waste.findMany({
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
        include: { product: { select: { costPrice: true } } },
      }),
    ]);

    const orderItems = await this.prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: startOfMonth, lte: endOfMonth }, paymentStatus: { in: ['PAID', 'FIADO'] } } },
      include: { product: { select: { costPrice: true } } },
    });

    const totalSales = sales._sum.total || 0;
    const supplierCosts = orderItems.reduce((sum, item) => sum + item.qty * item.product.costPrice, 0);
    const wasteCost = wastes.reduce((sum, w) => sum + w.qty * w.product.costPrice, 0);
    const totalDailyExpenses = dailyExpenses._sum.amount || 0;
    const totalMonthlyExpenses = monthlyExpenses._sum.amount || 0;
    const netProfit = totalSales - supplierCosts - wasteCost - totalDailyExpenses - totalMonthlyExpenses;
    const margin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    return {
      year,
      month,
      daysInMonth,
      totalSales,
      orderCount: sales._count,
      salesByMethod: payments.map(p => ({ method: p.method, amount: p._sum.amount || 0 })),
      supplierCosts,
      wasteCost,
      totalDailyExpenses,
      totalMonthlyExpenses,
      netProfit: Math.round(netProfit),
      margin: Math.round(margin * 100) / 100,
    };
  }

  async closeCash(data: { date: string; actualCash: number; note?: string; userId?: string }) {
    const report = await this.getDailyReport(new Date(data.date));
    const difference = data.actualCash - report.expectedCash;

    return this.prisma.cashClose.create({
      data: {
        date: new Date(data.date),
        expectedCash: report.expectedCash,
        actualCash: data.actualCash,
        difference,
        note: data.note,
        userId: data.userId,
      },
      include: { user: { select: { name: true } } },
    });
  }

  async getCashCloses(limit = 30) {
    return this.prisma.cashClose.findMany({
      orderBy: { date: 'desc' },
      take: limit,
      include: { user: { select: { name: true } } },
    });
  }
}
