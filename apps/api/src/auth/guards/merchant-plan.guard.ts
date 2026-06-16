import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MerchantPlanGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super Admin has absolute access
    if (user?.role === 'ADMIN') {
      return true;
    }

    if (!user) {
      throw new ForbiddenException('No estás autenticado');
    }

    // Fetch the store of this merchant or merchant staff
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { store: true },
    });

    if (!dbUser || !dbUser.storeId) {
      throw new ForbiddenException('No tienes una tienda asociada a tu cuenta');
    }

    const store = dbUser.store;
    if (!store) {
      throw new ForbiddenException('La tienda asociada no existe');
    }

    // If the plan is not PRO, throw Forbidden
    if (store.plan !== 'PRO') {
      throw new ForbiddenException('Esta funcionalidad está disponible únicamente en el Plan PRO');
    }

    // Attach storeId to request for service filters
    request.storeId = store.id;

    return true;
  }
}
