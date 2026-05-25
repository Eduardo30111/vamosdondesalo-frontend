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
      include: { supplier: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.product.findUniqueOrThrow({ where: { id }, include: { supplier: true } });
  }

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto as any });
  }

  async update(id: string, dto: UpdateProductDto) {
    return this.prisma.product.update({ where: { id }, data: dto as any });
  }

  async delete(id: string) {
    return this.prisma.product.update({ where: { id }, data: { active: false } });
  }
}
