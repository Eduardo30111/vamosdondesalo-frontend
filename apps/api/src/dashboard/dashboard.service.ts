import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const [
      ordersToday,
      salesToday,
      activeOrders,
      topProducts,
      activeDeliveries,
      weeklySales,
      hourlyOrders,
      vendorSales,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: today }, status: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.order.count({
        where: { status: { in: ['PENDING', 'PREPARING', 'READY', 'IN_TRANSIT'] } },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { qty: true },
        where: { order: { createdAt: { gte: today } } },
        orderBy: { _sum: { qty: 'desc' } },
        take: 5,
      }),
      this.prisma.order.count({
        where: { type: 'DELIVERY', status: { in: ['PENDING', 'PREPARING', 'READY', 'IN_TRANSIT'] } },
      }),
      // Weekly sales grouped by day
      this.prisma.order.findMany({
        where: { createdAt: { gte: weekAgo }, status: 'PAID' },
        select: { total: true, createdAt: true },
      }),
      // Hourly orders today
      this.prisma.order.findMany({
        where: { createdAt: { gte: today } },
        select: { createdAt: true },
      }),
      // Vendor (user) sales - from payments today
      this.prisma.order.findMany({
        where: { createdAt: { gte: today }, status: 'PAID' },
        select: { total: true, customerName: true },
      }),
    ]);

    // Calculate today's profit
    const orderItemsToday = await this.prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: today }, status: 'PAID' } },
      include: { product: { select: { costPrice: true } } },
    });
    const supplierCosts = orderItemsToday.reduce((sum, item) => sum + item.qty * item.product.costPrice, 0);
    const todaySalesTotal = salesToday._sum.total || 0;
    const profitToday = todaySalesTotal - supplierCosts;

    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    // Process weekly sales by day
    const weeklyByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      weeklyByDay[key] = 0;
    }
    weeklySales.forEach(order => {
      const key = order.createdAt.toISOString().split('T')[0];
      if (weeklyByDay[key] !== undefined) weeklyByDay[key] += order.total;
    });

    // Process hourly data
    const hourlyData: number[] = new Array(24).fill(0);
    hourlyOrders.forEach(order => {
      const hour = order.createdAt.getHours();
      hourlyData[hour]++;
    });

    return {
      ordersToday,
      salesToday: todaySalesTotal,
      activeOrders,
      profitToday,
      activeDeliveries,
      topProducts: topProducts.map((p) => ({
        name: productMap.get(p.productId) || 'Desconocido',
        count: p._sum.qty || 0,
      })),
      weeklySales: Object.entries(weeklyByDay).map(([date, total]) => ({ date, total })),
      hourlyOrders: hourlyData,
    };
  }
}
