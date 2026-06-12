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

    // Group by product using received minus returned quantities
    const productSummary = products.map(product => {
      const received = product.supplierReceivedQty ?? 0;
      const returned = product.supplierReturnedQty ?? 0;
      const net = received - returned;
      const totalPayable = net * product.costPrice;
      return {
        productId: product.id,
        productName: product.name,
        costPrice: product.costPrice,
        receivedQty: received,
        returnedQty: returned,
        netQty: net,
        totalPayable,
      };
    });

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
