import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.store.findMany({
      where: { active: true },
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.store.findMany({
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        products: { where: { active: true } },
        owner: { select: { name: true, email: true } }
      }
    });
    if (!store) throw new NotFoundException('Tienda no encontrada');
    return store;
  }

  async findByOwner(ownerId: string) {
    const store = await this.prisma.store.findUnique({
      where: { ownerId },
      include: { products: true }
    });
    if (!store) throw new NotFoundException('Tienda no encontrada para este usuario');
    return store;
  }

  async create(ownerId: string, data: { name: string; description?: string; logoUrl?: string; bannerUrl?: string; whatsappNumber: string; category: string; plan?: 'FREE' | 'PRO' }) {
    const existing = await this.prisma.store.findUnique({ where: { ownerId } });
    if (existing) throw new BadRequestException('El usuario ya tiene una tienda registrada');

    const planExpiresAt = new Date();
    planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);

    const planSelected = data.plan || 'FREE';
    const commissionRate = planSelected === 'PRO' ? 0.04 : 0.08;

    const store = await this.prisma.store.create({
      data: {
        name: data.name,
        description: data.description,
        logoUrl: data.logoUrl,
        bannerUrl: data.bannerUrl,
        whatsappNumber: data.whatsappNumber,
        category: data.category,
        plan: planSelected as any,
        planExpiresAt,
        commissionRate,
        ownerId,
        active: true,
      }
    });

    await this.prisma.user.update({
      where: { id: ownerId },
      data: { storeId: store.id }
    });

    return store;
  }

  async update(id: string, ownerId: string, isAdmin: boolean, data: { name?: string; description?: string; logoUrl?: string; bannerUrl?: string; whatsappNumber?: string; category?: string }) {
    const store = await this.findOne(id);
    if (!isAdmin && store.ownerId !== ownerId) {
      throw new BadRequestException('No tienes permiso para modificar esta tienda');
    }

    return this.prisma.store.update({
      where: { id },
      data
    });
  }

  async recharge(id: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('El monto debe ser mayor a cero');
    await this.findOne(id);
    return this.prisma.store.update({
      where: { id },
      data: { balance: { increment: amount } }
    });
  }

  async approve(id: string, active: boolean) {
    return this.prisma.store.update({
      where: { id },
      data: { active }
    });
  }
}
