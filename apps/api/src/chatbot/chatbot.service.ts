import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatbotService {
  constructor(private prisma: PrismaService) {}

  async getChatbotConfig(storeId: string) {
    let config = await this.prisma.chatbotConfig.findUnique({
      where: { storeId },
    });
    if (!config) {
      config = await this.prisma.chatbotConfig.create({
        data: { storeId },
      });
    }
    return config;
  }

  async updateChatbotConfig(storeId: string, data: any) {
    // Prevent manual updates to metrics fields
    const { conversations, ordersGenerated, salesAttributed, id, storeId: sId, ...updateData } = data;
    
    return this.prisma.chatbotConfig.update({
      where: { storeId },
      data: updateData,
    });
  }

  async isChatbotActive(storeId: string): Promise<boolean> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { chatbotConfig: true },
    });
    
    if (!store) return false;
    
    // Auto-create config if missing
    let config = store.chatbotConfig;
    if (!config) {
      config = await this.prisma.chatbotConfig.create({
        data: { storeId },
      });
    }

    const isPremium = store.plan === 'PREMIUM';
    const isExpired = new Date() > new Date(store.planExpiresAt);

    if (!isPremium || isExpired) {
      // Deactivate chatbot in database if currently set to active
      if (config.active) {
        await this.prisma.chatbotConfig.update({
          where: { storeId },
          data: { active: false },
        });
      }
      return false;
    }

    return config.active;
  }

  async getAvailableProducts(storeId: string) {
    const now = new Date();
    // Colombia timezone America/Bogota (UTC-5)
    const colombiaTime = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const year = colombiaTime.getFullYear();
    const month = String(colombiaTime.getMonth() + 1).padStart(2, '0');
    const day = String(colombiaTime.getDate()).padStart(2, '0');
    const todayDateStr = `${year}-${month}-${day}`;

    const [vitrinaProducts, preparedProducts, todayAuthorizations] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          storeId,
          active: true,
          preparationMode: 'VITRINA',
        },
        include: { vitrinaStock: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.findMany({
        where: {
          storeId,
          active: true,
          preparationMode: 'PREPARADO',
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.preparedAuthorization.findMany({
        where: {
          date: todayDateStr,
          product: { storeId },
        },
        select: { productId: true },
      }),
    ]);

    const authorizedProductIds = new Set(todayAuthorizations.map((a) => a.productId));

    const vitrinaList = vitrinaProducts
      .filter((p) => p.vitrinaStock?.lastStockDate === todayDateStr || (p.vitrinaStock?.qty ?? 0) > 0)
      .map((p) => {
        const qty = p.vitrinaStock?.qty ?? 0;
        return {
          id: p.id,
          name: p.name,
          price: p.salePrice,
          stock: qty,
          isAgotado: qty <= 0,
          status: qty > 0 ? 'DISPONIBLE' : 'AGOTADO',
        };
      });

    const preparedList = preparedProducts
      .filter((p) => authorizedProductIds.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.salePrice,
        stock: 99, // On-demand default
        isAgotado: false,
        status: 'DISPONIBLE',
      }));

    return [...vitrinaList, ...preparedList];
  }

  async getChatbotContext(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { chatbotConfig: true },
    });

    if (!store) {
      throw new NotFoundException('Tienda no encontrada');
    }

    // Lazy load config if missing
    let config = store.chatbotConfig;
    if (!config) {
      config = await this.prisma.chatbotConfig.create({
        data: { storeId },
      });
    }

    const [products, paymentConfigs] = await Promise.all([
      this.getAvailableProducts(storeId),
      this.prisma.paymentMethodConfig.findMany({
        where: { enabled: true },
      }),
    ]);

    return {
      storeName: store.name,
      category: store.category,
      businessHours: config.businessHours,
      language: config.language,
      tone: config.tone,
      promotions: config.promotions || 'Ninguna promoción activa',
      featuredProducts: config.featuredProducts || 'Ninguno en específico',
      autoMessages: config.autoMessages || '',
      deliveryInfo: {
        puertoColombia: store.deliveryFeePuerto,
        pradomar: store.deliveryFeePradomar,
        salgar: store.deliveryFeeSalgar,
        barranquilla: store.deliveryFeeBarranquilla,
      },
      paymentMethods: paymentConfigs.map((p) => p.method),
      products,
    };
  }
}
