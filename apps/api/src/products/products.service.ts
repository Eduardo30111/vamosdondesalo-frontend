import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

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
        supplier: dto.supplierId ? { connect: { id: dto.supplierId } } : undefined,
      },
    });

    // Si es vitrina, inicializar stock en 0
    if (product.preparationMode === 'VITRINA') {
      await this.prisma.vitrinaStock.create({
        data: { productId: product.id, qty: 0 },
      });
    }

    return this.prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { vitrinaStock: true },
    });
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
        preparationMode: dto.preparationMode as any,
        supplier: dto.supplierId ? { connect: { id: dto.supplierId } } : undefined,
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

    return this.prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { vitrinaStock: true },
    });
  }

  async delete(id: string) {
    return this.prisma.product.update({ where: { id }, data: { active: false } });
  }
}
