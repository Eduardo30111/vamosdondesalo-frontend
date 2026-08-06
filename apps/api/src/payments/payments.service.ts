import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService, private realtime: RealtimeGateway) {}

  async createPayment(data: { orderId: string; method: string; amount: number }) {
    const orderExists = await this.prisma.order.findUnique({ where: { id: data.orderId } });
    if (!orderExists) {
      throw new BadRequestException('El pedido no existe');
    }

    const existingPayments = await this.prisma.payment.findMany({ where: { orderId: data.orderId } });
    const existingPaidSum = existingPayments.reduce((acc, p) => acc + p.amount, 0);

    if (orderExists.paymentStatus === 'PAID' && existingPaidSum >= orderExists.total) {
      throw new BadRequestException('El pedido ya se encuentra totalmente cobrado');
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: data.orderId,
        method: data.method as any,
        amount: data.amount,
      },
    });

    const newTotalPaid = existingPaidSum + data.amount;
    const isFullyPaid = newTotalPaid >= orderExists.total;

    // If fully paid, mark as PAID. If partial and was fiado, keep FIADO.
    const isFiated = !isFullyPaid && (orderExists.isFiated || orderExists.paymentStatus === 'FIADO');
    const paymentStatus = isFullyPaid ? 'PAID' : (isFiated ? 'FIADO' : 'UNPAID');

    const updated = await this.prisma.order.update({
      where: { id: data.orderId },
      data: { paymentStatus: paymentStatus as any, isFiated },
      include: { items: { include: { product: true } }, table: true, deliveryZone: true },
    });
    // Emit realtime update for order
    this.realtime.emitOrderStatusChanged(updated);

    return payment;
  }

  async confirmPayment(id: string) {
    const payment = await this.prisma.payment.update({
      where: { id },
      data: {},
    });

    const order = await this.prisma.order.findUnique({ where: { id: payment.orderId }, include: { items: { include: { product: true } }, table: true, deliveryZone: true } });
    if (order && order.type !== 'DELIVERY') {
      const updated = await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'PAID', isFiated: false },
        include: { items: { include: { product: true } }, table: true, deliveryZone: true },
      });
      this.realtime.emitOrderStatusChanged(updated);
    }

    return payment;
  }

  async getPaymentMethods() {
    const methods = ['CASH', 'NEQUI', 'BANCOLOMBIA', 'DAVIPLATA', 'TRANSFER', 'BREB'];
    const configs = await this.prisma.paymentMethodConfig.findMany();
    const result: any[] = [];
    for (const m of methods) {
      let config = configs.find((c) => c.method === m);
      if (!config) {
        config = await this.prisma.paymentMethodConfig.create({
          data: {
            method: m,
            enabled: false,
            qrUrl: null,
            key: null,
          },
        });
      }
      result.push(config);
    }
    return result;
  }

  async updatePaymentMethod(method: string, data: { qrUrl?: string; key?: string; enabled: boolean }) {
    return this.prisma.paymentMethodConfig.upsert({
      where: { method: method as any },
      update: data,
      create: { method: method as any, ...data },
    });
  }
}

