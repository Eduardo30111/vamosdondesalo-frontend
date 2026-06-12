import { Injectable } from '@nestjs/common';
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
    return this.prisma.product.findMany({
      where: { active: true },
      include: { vitrinaStock: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: { vitrinaStock: true },
    });
  }

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        photoUrl: dto.photoUrl,
        salePrice: dto.salePrice,
        costPrice: dto.costPrice,
        type: dto.type,
        preparationMode: (dto.preparationMode as any) ?? 'VITRINA',
        dailyStock: dto.dailyStock ?? 0,
        supplier: dto.supplierId ? { connect: { id: dto.supplierId } } : undefined,
      },
    });

    // Si es vitrina, inicializar stock
    if (product.preparationMode === 'VITRINA') {
      const initialStock = product.type === 'SUPPLIER' ? product.dailyStock : 0;
      await this.prisma.vitrinaStock.create({
        data: { productId: product.id, qty: initialStock },
      });

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

    const result = await this.prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { vitrinaStock: true },
    });

    this.realtime.emitVitrinaUpdated({ action: 'create', product: result });
    return result;
  }

  async update(id: string, dto: UpdateProductDto) {
    const current = await this.prisma.product.findUniqueOrThrow({ where: { id }, include: { vitrinaStock: true } });

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
        preparationMode: dto.preparationMode as any,
        supplier: dto.supplierId ? { connect: { id: dto.supplierId } } : (dto.type === 'OWN' ? { disconnect: true } : undefined),
      },
    });

    // Si cambia a VITRINA y no tiene stock, crearlo
    if (product.preparationMode === 'VITRINA' && !current.vitrinaStock) {
      await this.prisma.vitrinaStock.upsert({
        where: { productId: id },
        create: { productId: id, qty: 0 },
        update: {},
      });
    }

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

    const result = await this.prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { vitrinaStock: true },
    });

    this.realtime.emitVitrinaUpdated({ action: 'update', product: result });
    return result;
  }

  async receiveSupplierStock(id: string, qty: number) {
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        supplierReceivedQty: { increment: qty },
      },
    });

    await this.prisma.vitrinaStock.upsert({
      where: { productId: id },
      create: { productId: id, qty },
      update: { qty: { increment: qty } },
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

  async delete(id: string) {
    const deleted = await this.prisma.product.update({ where: { id }, data: { active: false } });
    this.realtime.emitVitrinaUpdated({ action: 'delete', id });
    return deleted;
  }
}
