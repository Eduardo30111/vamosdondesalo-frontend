import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.customer.findMany({
      include: { credits: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { name: 'asc' },
    });
  }

  findDebtors() {
    return this.prisma.customer.findMany({
      where: { totalDebt: { gt: 0 } },
      include: { credits: { orderBy: { createdAt: 'desc' } } },
      orderBy: { totalDebt: 'desc' },
    });
  }

  async getHistory(customerId: string) {
    return this.prisma.credit.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMorosos() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const customers = await this.prisma.customer.findMany({
      where: { totalDebt: { gt: 0 } },
      include: { credits: { orderBy: { createdAt: 'desc' } } },
      orderBy: { totalDebt: 'desc' },
    });
    return customers.filter((c) => {
      const lastPayment = c.credits.find((cr) => cr.type === 'PAYMENT');
      const lastCharge = c.credits.find((cr) => cr.type === 'CHARGE');
      const lastActivity = lastPayment || lastCharge;
      if (!lastActivity) return true;
      return new Date(lastActivity.createdAt) < thirtyDaysAgo;
    });
  }

  async findByCedula(cedula: string) {
    return this.prisma.customer.findUnique({ where: { cedula } });
  }

  async findById(id: string) {
    return this.prisma.customer.findUniqueOrThrow({
      where: { id },
      include: { credits: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async createOrFind(data: { cedula: string; name?: string; phone?: string }) {
    const existing = await this.prisma.customer.findUnique({ where: { cedula: data.cedula } });
    if (existing) return existing;
    if (!data.name) throw new NotFoundException('Cliente no encontrado, se requiere nombre');
    return this.prisma.customer.create({
      data: { name: data.name, cedula: data.cedula, phone: data.phone },
    });
  }

  async charge(customerId: string, amount: number, note?: string, createdAt?: Date) {
    const [credit] = await this.prisma.$transaction([
      this.prisma.credit.create({
        data: { 
          customerId, 
          amount, 
          type: 'CHARGE',
          note,
          createdAt: createdAt ? new Date(createdAt) : undefined,
        },
      }),
      this.prisma.customer.update({
        where: { id: customerId },
        data: { totalDebt: { increment: amount } },
      }),
    ]);
    return credit;
  }

  async payment(customerId: string, amount: number, note?: string) {
    const customer = await this.prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    const actualAmount = Math.min(amount, customer.totalDebt);
    const [credit] = await this.prisma.$transaction([
      this.prisma.credit.create({
        data: { 
          customerId, 
          amount: actualAmount, 
          type: 'PAYMENT',
          note,
        },
      }),
      this.prisma.customer.update({
        where: { id: customerId },
        data: { totalDebt: { decrement: actualAmount } },
      }),
    ]);
    return credit;
  }
}
