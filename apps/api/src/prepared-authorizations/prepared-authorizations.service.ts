import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePreparedAuthorizationDto } from './dto/create-prepared-authorization.dto';

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable()
export class PreparedAuthorizationsService {
  constructor(private prisma: PrismaService) {}

  async findToday() {
    const date = getTodayDate();

    const availableProducts = await this.prisma.product.findMany({
      where: { active: true, preparationMode: 'PREPARADO' },
      orderBy: { name: 'asc' },
    });

    const authorizations = await this.prisma.preparedAuthorization.findMany({
      where: { date },
      include: { product: true },
      orderBy: { product: { name: 'asc' } },
    });

    const authorizedByProductId = new Map(authorizations.map((auth) => [auth.productId, auth]));

    return {
      availableProducts: availableProducts.map((product) => ({
        ...product,
        authorized: authorizedByProductId.has(product.id),
        authorizationId: authorizedByProductId.get(product.id)?.id,
      })),
      authorizedProducts: authorizations,
    };
  }

  async authorize(dto: CreatePreparedAuthorizationDto, userId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    if (product.preparationMode !== 'PREPARADO') {
      throw new BadRequestException('Solo productos PREPARADO pueden ser autorizados');
    }

    const date = getTodayDate();
    return this.prisma.preparedAuthorization.upsert({
      where: { productId_date: { productId: dto.productId, date } },
      create: { productId: dto.productId, userId, date },
      update: { userId },
    });
  }

  async revoke(productId: string) {
    const date = getTodayDate();
    const deleted = await this.prisma.preparedAuthorization.deleteMany({
      where: { productId, date },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Autorización no encontrada para hoy');
    }

    return { deleted: deleted.count };
  }
}
