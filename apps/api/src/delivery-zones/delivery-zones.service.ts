import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeliveryZonesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.deliveryZone.findMany({ orderBy: { name: 'asc' } });
  }

  findEnabled() {
    return this.prisma.deliveryZone.findMany({ where: { enabled: true }, orderBy: { name: 'asc' } });
  }

  create(data: { name: string; fee: number; enabled?: boolean }) {
    return this.prisma.deliveryZone.create({ data });
  }

  update(id: string, data: { name?: string; fee?: number; enabled?: boolean }) {
    return this.prisma.deliveryZone.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.deliveryZone.delete({ where: { id } });
  }
}
