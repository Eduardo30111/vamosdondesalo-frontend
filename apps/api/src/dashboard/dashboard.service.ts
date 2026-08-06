import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private getTodayRange() {
    const now = new Date();
    // Colombia timezone America/Bogota (UTC-5)
    // Convert current UTC time to Colombia time
    const colombiaTime = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    
    // Start of the day in Colombia local time
    const startColombia = new Date(colombiaTime);
    startColombia.setUTCHours(0, 0, 0, 0);
    
    // End of the day in Colombia local time
    const endColombia = new Date(colombiaTime);
    endColombia.setUTCHours(23, 59, 59, 999);
    
    // Convert back to UTC for queries
    const start = new Date(startColombia.getTime() + 5 * 60 * 60 * 1000);
    const end = new Date(endColombia.getTime() + 5 * 60 * 60 * 1000);
    
    return { start, end };
  }

  private getRange(fromStr?: string, toStr?: string) {
    if (!fromStr || !toStr) {
      return this.getTodayRange();
    }
    const fromParts = fromStr.split('-');
    const toParts = toStr.split('-');
    const startColombia = new Date(Date.UTC(parseInt(fromParts[0]), parseInt(fromParts[1]) - 1, parseInt(fromParts[2]), 0, 0, 0, 0));
    const endColombia = new Date(Date.UTC(parseInt(toParts[0]), parseInt(toParts[1]) - 1, parseInt(toParts[2]), 23, 59, 59, 999));
    const start = new Date(startColombia.getTime() + 5 * 60 * 60 * 1000);
    const end = new Date(endColombia.getTime() + 5 * 60 * 60 * 1000);
    return { start, end };
  }

  async getStats() {
    await this.prisma.checkAndResetDailyStock();
    const { start, end } = this.getTodayRange();

    const [
      ordersToday,
      salesTodayAgg,
      activeOrders,
      activeDeliveries,
      kitchenPending,
      expensesToday,
      wastesToday,
    ] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: start, lte: end }, fulfillmentStatus: { not: 'CANCELLED' } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: start, lte: end }, paymentStatus: { in: ['PAID', 'FIADO'] }, fulfillmentStatus: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      this.prisma.order.count({ where: { fulfillmentStatus: { in: ['PENDING', 'PREPARING', 'READY', 'DELIVERED'] } } }),
      this.prisma.order.count({ where: { type: 'DELIVERY', fulfillmentStatus: { not: 'DELIVERED' } } }),
      this.prisma.order.count({ where: { fulfillmentStatus: 'PENDING' } }),
      this.prisma.expense.aggregate({ where: { date: { gte: start, lte: end }, type: 'DAILY' }, _sum: { amount: true } }),
      this.prisma.waste.findMany({ where: { createdAt: { gte: start, lte: end } }, include: { product: { select: { costPrice: true } } } }),
    ]);

    const totalSales = salesTodayAgg._sum.total || 0;

    const orderItemsToday = await this.prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: start, lte: end }, paymentStatus: { in: ['PAID', 'FIADO'] }, fulfillmentStatus: { not: 'CANCELLED' } } },
      include: { product: { select: { costPrice: true, type: true, name: true } } },
    });

    const costProducts = orderItemsToday.reduce((sum, item) => sum + item.qty * item.product.costPrice, 0);
    const wasteCost = wastesToday.reduce((sum, w) => sum + w.qty * w.product.costPrice, 0);
    const expensesTodayTotal = expensesToday._sum.amount || 0;
    const profitToday = totalSales - costProducts - expensesTodayTotal - wasteCost;

    // Compute top products from order items sold today
    const productStatsTodayMap = new Map<string, { name: string; count: number; totalRevenue: number }>();
    orderItemsToday.forEach(item => {
      const pId = item.productId;
      const stats = productStatsTodayMap.get(pId) || { name: item.product.name, count: 0, totalRevenue: 0 };
      stats.count += item.qty;
      stats.totalRevenue += item.qty * item.unitPrice;
      productStatsTodayMap.set(pId, stats);
    });

    const sortedTopProductsToday = Array.from(productStatsTodayMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topProduct = sortedTopProductsToday.length > 0
      ? { name: sortedTopProductsToday[0].name, count: sortedTopProductsToday[0].count }
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
      topProducts: sortedTopProductsToday,
    };
  }

  async getWeeklyChart(from?: string, to?: string) {
    let start: Date;
    let end: Date;
    let fromColombia: Date;
    let toColombia: Date;

    if (from && to) {
      const r = this.getRange(from, to);
      start = r.start;
      end = r.end;
      const fromParts = from.split('-');
      const toParts = to.split('-');
      fromColombia = new Date(Date.UTC(parseInt(fromParts[0]), parseInt(fromParts[1]) - 1, parseInt(fromParts[2]), 0, 0, 0, 0));
      toColombia = new Date(Date.UTC(parseInt(toParts[0]), parseInt(toParts[1]) - 1, parseInt(toParts[2]), 0, 0, 0, 0));
    } else {
      const now = new Date();
      const nowColombia = new Date(now.getTime() - 5 * 3600000);
      const weekAgoColombia = new Date(nowColombia);
      weekAgoColombia.setUTCDate(weekAgoColombia.getUTCDate() - 6);
      weekAgoColombia.setUTCHours(0, 0, 0, 0);
      start = new Date(weekAgoColombia.getTime() + 5 * 3600000);

      const endColombia = new Date(nowColombia);
      endColombia.setUTCHours(23, 59, 59, 999);
      end = new Date(endColombia.getTime() + 5 * 3600000);

      fromColombia = weekAgoColombia;
      toColombia = new Date(nowColombia);
      toColombia.setUTCHours(0, 0, 0, 0);
    }

    const sales = await this.prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end }, paymentStatus: { in: ['PAID', 'FIADO'] }, fulfillmentStatus: { not: 'CANCELLED' } },
      select: { total: true, createdAt: true },
    });

    const weeklyByDay: Record<string, number> = {};
    const loopDate = new Date(fromColombia);
    while (loopDate.getTime() <= toColombia.getTime()) {
      const key = loopDate.toISOString().split('T')[0];
      weeklyByDay[key] = 0;
      loopDate.setUTCDate(loopDate.getUTCDate() + 1);
    }

    sales.forEach((order) => {
      const localDate = new Date(order.createdAt.getTime() - 5 * 3600000);
      const key = localDate.toISOString().split('T')[0];
      if (weeklyByDay[key] !== undefined) weeklyByDay[key] += order.total;
    });

    return Object.entries(weeklyByDay).map(([date, total]) => ({ date, total }));
  }

  async getTopProducts(from?: string, to?: string) {
    const { start, end } = this.getRange(from, to);
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          fulfillmentStatus: { not: 'CANCELLED' },
        },
      },
      include: {
        product: {
          select: { name: true },
        },
      },
    });

    const productStatsMap = new Map<string, { name: string; count: number; totalRevenue: number }>();
    orderItems.forEach(item => {
      const pId = item.productId;
      const stats = productStatsMap.get(pId) || { name: item.product?.name || 'Desconocido', count: 0, totalRevenue: 0 };
      stats.count += item.qty;
      stats.totalRevenue += item.qty * item.unitPrice;
      productStatsMap.set(pId, stats);
    });

    return Array.from(productStatsMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  async getHourly() {
    const { start, end } = this.getTodayRange();
    const hourlyOrders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end }, fulfillmentStatus: { not: 'CANCELLED' } },
      select: { createdAt: true, total: true },
    });

    const hourlyData: number[] = new Array(24).fill(0);
    hourlyOrders.forEach((order) => {
      const localDate = new Date(order.createdAt.getTime() - 5 * 3600000);
      const hour = localDate.getUTCHours();
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
    const { start, end } = this.getTodayRange();
    const paidOrders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end }, paymentStatus: { in: ['PAID', 'FIADO'] }, fulfillmentStatus: { not: 'CANCELLED' } },
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
