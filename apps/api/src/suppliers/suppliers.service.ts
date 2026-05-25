import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.supplier.findMany({ include: { products: true } });
  }

  create(data: { name: string; phone?: string }) {
    return this.prisma.supplier.create({ data });
  }

  update(id: string, data: { name?: string; phone?: string }) {
    return this.prisma.supplier.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.supplier.delete({ where: { id } });
  }

  async getPayable(id: string, from: Date, to: Date) {
    // Find all products for this supplier
    const products = await this.prisma.product.findMany({
      where: { supplierId: id },
    });

    const productIds = products.map(p => p.id);

    // Find all order items for those products in paid orders within date range
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: {
          status: 'PAID',
          createdAt: { gte: from, lte: to },
        },
      },
      include: { product: { select: { id: true, name: true, costPrice: true, salePrice: true } } },
    });

    // Group by product
    const productSummary = products.map(product => {
      const items = orderItems.filter(item => item.productId === product.id);
      const qtySold = items.reduce((sum, item) => sum + item.qty, 0);
      const totalPayable = qtySold * product.costPrice;
      return {
        productId: product.id,
        productName: product.name,
        costPrice: product.costPrice,
        qtySold,
        totalPayable,
      };
    }).filter(p => p.qtySold > 0);

    const totalPayable = productSummary.reduce((sum, p) => sum + p.totalPayable, 0);

    return {
      supplierId: id,
      from: from.toISOString(),
      to: to.toISOString(),
      totalPayable,
      products: productSummary,
    };
  }
}
