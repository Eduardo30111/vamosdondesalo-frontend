import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  async getStats() {
    const { start, end } = this.getTodayRange();

    const [
      ordersToday,
      salesTodayAgg,
      activeOrders,
      activeDeliveries,
      kitchenPending,
      topProducts,
      expensesToday,
      wastesToday,
    ] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: start } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: start }, paymentStatus: { in: ['PAID', 'FIADO'] } },
        _sum: { total: true },
      }),
      this.prisma.order.count({ where: { fulfillmentStatus: { in: ['PENDING', 'PREPARING', 'READY', 'DELIVERED'] } } }),
      this.prisma.order.count({ where: { type: 'DELIVERY', fulfillmentStatus: { not: 'DELIVERED' } } }),
      this.prisma.order.count({ where: { fulfillmentStatus: 'PENDING' } }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { qty: true },
        where: { order: { createdAt: { gte: start } } },
        orderBy: { _sum: { qty: 'desc' } },
        take: 5,
      }),
      this.prisma.expense.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } }),
      this.prisma.waste.findMany({ where: { createdAt: { gte: start } }, include: { product: { select: { costPrice: true } } } }),
    ]);

    const totalSales = salesTodayAgg._sum.total || 0;

    const orderItemsToday = await this.prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: start }, paymentStatus: { in: ['PAID', 'FIADO'] } } },
      include: { product: { select: { costPrice: true, type: true } } },
    });

    const costProducts = orderItemsToday.reduce((sum, item) => sum + item.qty * item.product.costPrice, 0);
    const wasteCost = wastesToday.reduce((sum, w) => sum + w.qty * w.product.costPrice, 0);
    const expensesTodayTotal = expensesToday._sum.amount || 0;
    const profitToday = totalSales - costProducts - expensesTodayTotal - wasteCost;

    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    const topProduct = topProducts.length > 0
      ? { name: productMap.get(topProducts[0].productId) || 'N/A', count: topProducts[0]._sum.qty || 0 }
      : { name: 'N/A', count: 0 };

    return {
      ordersToday,
      totalSalesToday: totalSales,
      activeOrders,
      deliveryActive: activeDeliveries,
      kitchenPending,
      topProduct,
      profitToday,
      costProducts,
      wasteCost,
      expensesToday: expensesTodayTotal,
      topProducts: topProducts.map((p) => ({ name: productMap.get(p.productId) || 'Desconocido', count: p._sum.qty || 0 })),
    };
  }

  async getWeeklyChart() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const weeklySales = await this.prisma.order.findMany({
      where: { createdAt: { gte: weekAgo }, paymentStatus: { in: ['PAID', 'FIADO'] } },
      select: { total: true, createdAt: true },
    });

    const weeklyByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      weeklyByDay[key] = 0;
    }

    weeklySales.forEach((order) => {
      const key = order.createdAt.toISOString().split('T')[0];
      if (weeklyByDay[key] !== undefined) weeklyByDay[key] += order.total;
    });

    return Object.entries(weeklyByDay).map(([date, total]) => ({ date, total }));
  }

  async getTopProducts() {
    const { start } = this.getTodayRange();
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { qty: true },
      where: { order: { createdAt: { gte: start } } },
      orderBy: { _sum: { qty: 'desc' } },
      take: 10,
    });

    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return topProducts.map((p) => ({
      name: productMap.get(p.productId) || 'Desconocido',
      count: p._sum.qty || 0,
    }));
  }

  async getHourly() {
    const { start } = this.getTodayRange();
    const hourlyOrders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true, total: true },
    });

    const hourlyData: number[] = new Array(24).fill(0);
    hourlyOrders.forEach((order) => {
      const hour = order.createdAt.getHours();
      hourlyData[hour]++;
    });

    const peakHourIndex = hourlyData.indexOf(Math.max(...hourlyData));
    const peakHour = `${peakHourIndex}:00`;

    return {
      hourlyOrders: hourlyData,
      peakHour,
    };
  }

  async getTopSellers() {
    const { start } = this.getTodayRange();
    const paidOrders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start }, paymentStatus: { in: ['PAID', 'FIADO'] } },
      select: { total: true, customerName: true },
    });

    const salesMap: Record<string, number> = {};
    paidOrders.forEach((o) => {
      salesMap[o.customerName] = (salesMap[o.customerName] || 0) + o.total;
    });

    return Object.entries(salesMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }
}
