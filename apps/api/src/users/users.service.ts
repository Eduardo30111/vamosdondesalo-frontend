import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('El email ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, role: dto.role as any },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const data: any = { name: dto.name, email: dto.email, role: dto.role as any };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  async findByStore(storeId: string) {
    return this.prisma.user.findMany({
      where: { storeId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
  }

  async createForStore(storeId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('El email ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, role: dto.role as any, storeId },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async updateForStore(id: string, storeId: string, dto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findFirst({ where: { id, storeId } });
    if (!existingUser) throw new ConflictException('Usuario no encontrado en esta tienda');

    const data: any = { name: dto.name, email: dto.email, role: dto.role as any };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async deleteForStore(id: string, storeId: string) {
    const existingUser = await this.prisma.user.findFirst({ where: { id, storeId } });
    if (!existingUser) throw new ConflictException('Usuario no encontrado en esta tienda');

    return this.prisma.user.delete({ where: { id } });
  }

  async findByStoreOwner(ownerId: string) {
    const store = await this.prisma.store.findUnique({ where: { ownerId } });
    if (!store) throw new ConflictException('Tienda no encontrada para este usuario');
    return this.findByStore(store.id);
  }

  async createForStoreOwner(ownerId: string, dto: CreateUserDto) {
    const store = await this.prisma.store.findUnique({ where: { ownerId } });
    if (!store) throw new ConflictException('Tienda no encontrada para este usuario');
    return this.createForStore(store.id, dto);
  }

  async updateForStoreOwner(id: string, ownerId: string, dto: UpdateUserDto) {
    const store = await this.prisma.store.findUnique({ where: { ownerId } });
    if (!store) throw new ConflictException('Tienda no encontrada para este usuario');
    return this.updateForStore(id, store.id, dto);
  }

  async deleteForStoreOwner(id: string, ownerId: string) {
    const store = await this.prisma.store.findUnique({ where: { ownerId } });
    if (!store) throw new ConflictException('Tienda no encontrada para este usuario');
    return this.deleteForStore(id, store.id);
  }
}
