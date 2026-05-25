import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createPayment(data: { orderId: string; method: string; amount: number; proofUrl?: string }) {
    const payment = await this.prisma.payment.create({
      data: {
        orderId: data.orderId,
        method: data.method as any,
        amount: data.amount,
        proofUrl: data.proofUrl,
        confirmed: data.method === 'CASH',
      },
    });

    if (data.method === 'CASH') {
      await this.prisma.order.update({
        where: { id: data.orderId },
        data: { status: 'PAID' },
      });
    }

    return payment;
  }

  async confirmPayment(id: string) {
    const payment = await this.prisma.payment.update({
      where: { id },
      data: { confirmed: true },
    });

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'PAID' },
    });

    return payment;
  }

  async getPaymentMethods() {
    return this.prisma.paymentMethodConfig.findMany();
  }

  async updatePaymentMethod(method: string, data: { qrUrl?: string; key?: string; enabled: boolean }) {
    return this.prisma.paymentMethodConfig.upsert({
      where: { method: method as any },
      update: data,
      create: { method: method as any, ...data },
    });
  }
}
