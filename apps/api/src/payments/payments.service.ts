import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService, private realtime: RealtimeGateway) {}

  async createPayment(data: { orderId: string; method: string; amount: number }) {
    const orderExists = await this.prisma.order.findUnique({ where: { id: data.orderId } });
    if (orderExists && orderExists.paymentStatus === 'PAID') {
      throw new BadRequestException('El pedido ya se encuentra cobrado');
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: data.orderId,
        method: data.method as any,
        amount: data.amount,
      },
    });

    // If the order exists, mark it as PAID and emit update
    const order = await this.prisma.order.findUnique({ where: { id: data.orderId }, include: { items: { include: { product: true } }, table: true, deliveryZone: true } });
    if (order) {
      const updated = await this.prisma.order.update({
        where: { id: data.orderId },
        data: { paymentStatus: 'PAID', isFiated: false },
        include: { items: { include: { product: true } }, table: true, deliveryZone: true },
      });
      // Emit realtime update for order
      this.realtime.emitOrderStatusChanged(updated);
    }

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
