import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StoresService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // 1. Verify/create default admin user
      let admin = await this.prisma.user.findUnique({
        where: { email: 'admin@salo.co' }
      });
      
      if (!admin) {
        const passwordHash = await bcrypt.hash('admin123', 10);
        admin = await this.prisma.user.create({
          data: {
            name: 'Admin Salo',
            email: 'admin@salo.co',
            passwordHash,
            role: 'ADMIN'
          }
        });
        console.log('👤 Created default admin user (admin@salo.co)');
      }

      // 2. Verify/create default store Donde Salo!
      let store = await this.prisma.store.findFirst({
        where: { name: 'Donde Salo!' }
      });

      if (!store) {
        store = await this.prisma.store.create({
          data: {
            name: 'Donde Salo!',
            description: 'El templo de los fritos y la comida rápida',
            whatsappNumber: '573001234567',
            category: 'RESTAURANT',
            plan: 'PRO',
            planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
            commissionRate: 0.0,
            balance: 100000.0,
            ownerId: admin.id,
          }
        });
        console.log('🏪 Created default store Donde Salo!');

        // Update admin user to link to this store
        await this.prisma.user.update({
          where: { id: admin.id },
          data: { storeId: store.id }
        });
      } else {
        // Just make sure Donde Salo! has 0.0 commission rate
        await this.prisma.store.update({
          where: { id: store.id },
          data: { commissionRate: 0.0 }
        });
        console.log('✅ Default store Donde Salo! commission rate set to 0%');
      }
    } catch (e) {
      console.error('Error during auto-initialization of store/admin:', e);
    }
  }

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

  async create(ownerId: string, data: { name: string; description?: string; logoUrl?: string; bannerUrl?: string; whatsappNumber: string; category: string; plan?: 'FREE' | 'PRO' | 'PREMIUM' }) {
    const existing = await this.prisma.store.findUnique({ where: { ownerId } });
    if (existing) throw new BadRequestException('El usuario ya tiene una tienda registrada');

    const planExpiresAt = new Date();
    planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);

    const commissionRate = 0.0;

    const store = await this.prisma.store.create({
      data: {
        name: data.name,
        description: data.description,
        logoUrl: data.logoUrl,
        bannerUrl: data.bannerUrl,
        whatsappNumber: data.whatsappNumber,
        category: data.category,
        plan: (data.plan || 'FREE') as any,
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

  async update(id: string, ownerId: string, isAdmin: boolean, data: { name?: string; description?: string; logoUrl?: string; bannerUrl?: string; whatsappNumber?: string; category?: string; customTheme?: string; customDomain?: string; promoMedia?: string; deliveryFeePuerto?: number; deliveryFeePradomar?: number; deliveryFeeSalgar?: number; deliveryFeeBarranquilla?: number }) {
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

  async remove(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Tienda no encontrada');

    await this.prisma.$transaction(async (tx) => {
      // 1. Clear storeId from users
      await tx.user.updateMany({
        where: { storeId: id },
        data: { storeId: null }
      });

      // 2. Delete all orders related to this store (this will cascade delete orderItems and payments)
      await tx.order.deleteMany({
        where: { storeId: id }
      });

      // 3. Delete the store (which cascades products due to onDelete: Cascade on Product.storeId)
      await tx.store.delete({
        where: { id }
      });
    });

    return { success: true };
  }
}
