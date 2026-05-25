import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.table.findMany({ orderBy: { number: 'asc' } });
  }

  findByToken(qrToken: string) {
    return this.prisma.table.findUnique({ where: { qrToken } });
  }

  create(number: number) {
    return this.prisma.table.create({ data: { number } });
  }

  update(id: string, number: number) {
    return this.prisma.table.update({ where: { id }, data: { number } });
  }

  delete(id: string) {
    return this.prisma.table.delete({ where: { id } });
  }

  regenerateToken(id: string) {
    return this.prisma.table.update({
      where: { id },
      data: { qrToken: crypto.randomUUID() },
    });
  }
}
