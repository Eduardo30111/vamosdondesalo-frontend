import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  async findAll() {
    await this.prisma.checkAndResetDailyStock();
    return this.prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { store: null },
          {
            store: {
              active: true,
            }
          }
        ]
      },
      include: { vitrinaStock: true, store: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllForUser(userId: string) {
    await this.prisma.checkAndResetDailyStock();
    const todayStr = this.prisma.getColombiaTodayStr();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { storeId: true, role: true },
    });

    const whereClause: any = { active: true };
    if (user?.role === 'ADMIN') {
      whereClause.OR = [
        { storeId: user.storeId },
        { storeId: null }
      ];
    } else {
      whereClause.storeId = user?.storeId || null;
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      include: {
        vitrinaStock: true,
        store: true,
        preparedAuthorizations: {
          where: { date: todayStr }
        }
      },
      orderBy: { name: 'asc' },
    });

    return products.map(p => {
      const isVitrina = p.preparationMode === 'VITRINA';
      const hasStock = isVitrina ? (p.vitrinaStock?.qty ?? 0) > 0 : false;
      const isAddedToday = isVitrina
        ? (p.vitrinaStock?.lastStockDate === todayStr || hasStock)
        : (p.preparedAuthorizations && p.preparedAuthorizations.length > 0);
      const isAgotado = isVitrina && isAddedToday && !hasStock;

      return {
        ...p,
        addedToday: !!isAddedToday,
        isAgotado: !!isAgotado,
        authorizedToday: !isVitrina ? (p.preparedAuthorizations && p.preparedAuthorizations.length > 0) : undefined,
      };
    });
  }

  async findOne(id: string) {
    return this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: { vitrinaStock: true },
    });
  }

  async create(dto: CreateProductDto, storeId?: string, ownerId?: string) {
    let targetStoreId = storeId;
    if (!targetStoreId && ownerId) {
      const store = await this.prisma.store.findUnique({ where: { ownerId } });
      if (store) targetStoreId = store.id;
    }

    let isIndependentStore = false;
    if (targetStoreId) {
      const store = await this.prisma.store.findUnique({ where: { id: targetStoreId } });
      if (!store) throw new NotFoundException('Tienda no encontrada');
      if (store.name !== 'Donde Salo!') {
        isIndependentStore = true;
      }

      if (store.plan === 'FREE') {
        const activeCount = await this.prisma.product.count({
          where: { storeId: targetStoreId, active: true }
        });
        if (activeCount >= 50) {
          throw new BadRequestException('El plan gratuito está limitado a un máximo de 50 productos activos');
        }
      }
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        photoUrl: dto.photoUrl,
        salePrice: dto.salePrice,
        costPrice: dto.costPrice ?? 0,
        type: dto.type,
        preparationMode: (dto.preparationMode as any) ?? 'VITRINA',
        dailyStock: dto.dailyStock ?? 0,
        saleType: dto.saleType ?? 'UNIT',
        prices: dto.prices,
        supplier: dto.supplierId ? { connect: { id: dto.supplierId } } : undefined,
        store: targetStoreId ? { connect: { id: targetStoreId } } : undefined,
      },
    });

    // Si es vitrina, inicializar stock
    if (product.preparationMode === 'VITRINA') {
      const todayStr = this.prisma.getColombiaTodayStr();
      const initialStock = (isIndependentStore || product.type === 'SUPPLIER') ? product.dailyStock : 0;
      await this.prisma.vitrinaStock.create({
        data: {
          productId: product.id,
          qty: initialStock,
          lastStockDate: initialStock > 0 ? todayStr : null,
        },
      });

      if (isIndependentStore) {
        // No creamos órdenes de producción para tiendas independientes
      } else {
        // Si es propio de vitrina, crear orden de producción automáticamente en cocina
        if (product.type === 'OWN' && product.dailyStock > 0) {
          await this.prisma.productionOrder.create({
            data: {
              productId: product.id,
              requestedQty: product.dailyStock,
              readyQty: 0,
              userId: 'system',
            },
          });
        } else if (product.type === 'SUPPLIER' && product.dailyStock > 0) {
          // Si es proveedor, registrar stock recibido
          await this.prisma.product.update({
            where: { id: product.id },
            data: { supplierReceivedQty: product.dailyStock },
          });
        }
      }
    }

    const result = await this.prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { vitrinaStock: true },
    });

    this.realtime.emitVitrinaUpdated({ action: 'create', product: result });
    return result;
  }

  async update(id: string, dto: UpdateProductDto, userId?: string, isAdmin?: boolean, storeId?: string) {
    const current = await this.prisma.product.findUniqueOrThrow({ where: { id }, include: { vitrinaStock: true } });
    
    let targetStoreId = storeId;
    if (!targetStoreId && userId && !isAdmin) {
      const store = await this.prisma.store.findUnique({ where: { ownerId: userId } });
      if (store) targetStoreId = store.id;
    }

    if (!isAdmin && current.storeId && current.storeId !== targetStoreId) {
      throw new BadRequestException('No tienes permiso para modificar este producto');
    }

    if (dto.active === true && current.active === false && current.storeId) {
      const store = await this.prisma.store.findUnique({ where: { id: current.storeId } });
      if (store) {
        if (store.plan === 'FREE') {
          const activeCount = await this.prisma.product.count({
            where: { storeId: current.storeId, active: true }
          });
          if (activeCount >= 50) {
            throw new BadRequestException('El plan gratuito está limitado a un máximo de 50 productos activos');
          }
        }
      }
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        photoUrl: dto.photoUrl,
        salePrice: dto.salePrice,
        costPrice: dto.costPrice,
        type: dto.type,
        dailyStock: dto.dailyStock,
        saleType: dto.saleType,
        prices: dto.prices,
        preparationMode: dto.preparationMode as any,
        supplier: dto.supplierId ? { connect: { id: dto.supplierId } } : (dto.type === 'OWN' ? { disconnect: true } : undefined),
        active: dto.active,
      },
    });

    let isIndependentStore = false;
    if (product.storeId) {
      const store = await this.prisma.store.findUnique({ where: { id: product.storeId } });
      if (store && store.name !== 'Donde Salo!') {
        isIndependentStore = true;
      }
    }

    // Si cambia a VITRINA y no tiene stock, crearlo
    if (product.preparationMode === 'VITRINA' && !current.vitrinaStock) {
      const initialQty = (isIndependentStore && dto.dailyStock !== undefined) ? dto.dailyStock : 0;
      await this.prisma.vitrinaStock.upsert({
        where: { productId: id },
        create: { productId: id, qty: initialQty },
        update: {},
      });
    }

    if (isIndependentStore) {
      // Para tiendas independientes, sincronizamos el stock directamente
      if (product.preparationMode === 'VITRINA' && dto.dailyStock !== undefined) {
        await this.prisma.vitrinaStock.upsert({
          where: { productId: id },
          create: { productId: id, qty: dto.dailyStock },
          update: { qty: dto.dailyStock },
        });
      }
    } else {
      // Lógica original de Donde Salo! (Cocina para OWN, directo para SUPPLIER)
      // Si es propio de vitrina y tiene dailyStock, sincronizar con cocina
      if (product.preparationMode === 'VITRINA' && product.type === 'OWN' && dto.dailyStock !== undefined) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const todayOrder = await this.prisma.productionOrder.findFirst({
          where: {
            productId: id,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        if (todayOrder) {
          await this.prisma.productionOrder.update({
            where: { id: todayOrder.id },
            data: { requestedQty: dto.dailyStock },
          });
        } else if (dto.dailyStock > 0) {
          await this.prisma.productionOrder.create({
            data: {
              productId: id,
              requestedQty: dto.dailyStock,
              readyQty: 0,
              userId: 'system',
            },
          });
        }
      }

      // Si es proveedor y tiene dailyStock, cargar directamente en el stock
      if (product.preparationMode === 'VITRINA' && product.type === 'SUPPLIER' && dto.dailyStock !== undefined) {
        await this.prisma.product.update({
          where: { id },
          data: { supplierReceivedQty: dto.dailyStock },
        });
        await this.prisma.vitrinaStock.upsert({
          where: { productId: id },
          create: { productId: id, qty: dto.dailyStock },
          update: { qty: dto.dailyStock },
        });
      }
    }

    const result = await this.prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { vitrinaStock: true },
    });

    this.realtime.emitVitrinaUpdated({ action: 'update', product: result });
    return result;
  }

  async receiveSupplierStock(id: string, qty: number) {
    const todayStr = this.prisma.getColombiaTodayStr();
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        supplierReceivedQty: { increment: qty },
      },
    });

    await this.prisma.vitrinaStock.upsert({
      where: { productId: id },
      create: { productId: id, qty, lastStockDate: todayStr },
      update: { qty: { increment: qty }, lastStockDate: todayStr },
    });

    this.realtime.emitVitrinaUpdated({ action: 'receiveSupplierStock', product: updated });
    return updated;
  }

  async returnSupplierStock(id: string, qty: number) {
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        supplierReturnedQty: { increment: qty },
      },
    });

    await this.prisma.vitrinaStock.upsert({
      where: { productId: id },
      create: { productId: id, qty: 0 },
      update: { qty: { decrement: qty } },
    });

    this.realtime.emitVitrinaUpdated({ action: 'returnSupplierStock', product: updated });
    return updated;
  }

  async addVitrinaStock(id: string, qty: number) {
    const todayStr = this.prisma.getColombiaTodayStr();
    await this.prisma.vitrinaStock.upsert({
      where: { productId: id },
      create: { productId: id, qty, lastStockDate: todayStr },
      update: { qty: { increment: qty }, lastStockDate: todayStr },
    });

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { vitrinaStock: true },
    });

    this.realtime.emitVitrinaUpdated({ action: 'update', product });
    return product;
  }

  async delete(id: string, isAdmin = true, storeId?: string) {
    const product = await this.prisma.product.findUniqueOrThrow({ where: { id } });
    if (!isAdmin && product.storeId !== storeId) {
      throw new BadRequestException('No tienes permiso para eliminar este producto');
    }
    const deleted = await this.prisma.product.update({ where: { id }, data: { active: false } });
    this.realtime.emitVitrinaUpdated({ action: 'delete', id });
    return deleted;
  }
}
