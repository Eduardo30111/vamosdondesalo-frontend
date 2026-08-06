import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateOrderDto } from './dto/create-order.dto';

function mapOrderLegacyStatus(order: any) {
  if (!order) return order;
  // Compatibilidad: la UI actual espera `order.status` como fulfillmentStatus.
  return { ...order, status: order.fulfillmentStatus };
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  async findAll(status?: string) {
    const where = status ? { fulfillmentStatus: status as any } : {};
    return this.prisma.order
      .findMany({
        where,
      include: {
        items: { include: { product: true } },
        table: true,
        payments: true,
        deliveryZone: true,
      },
      orderBy: { createdAt: 'desc' },
    })
      .then((orders) => orders.map(mapOrderLegacyStatus));
  }

  async findActive() {
    // Cuentas activas = pedidos NO pagados
    return this.prisma.order
      .findMany({
      where: { fulfillmentStatus: { in: ['PENDING', 'PREPARING', 'READY', 'DELIVERED'] } },
      include: {
        items: { include: { product: true } },
        table: true,
        deliveryZone: true,
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    })
      .then((orders) => orders.map(mapOrderLegacyStatus));
  }

  async findCuentasActivas() {
    // Pedidos entregados pero NO pagados → esperan cobro
    return this.prisma.order
      .findMany({
      where: {
        fulfillmentStatus: { in: ['DELIVERED', 'READY'] },
        paymentStatus: 'UNPAID',
      },
      include: {
        items: { include: { product: true } },
        table: true,
        deliveryZone: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    })
      .then((orders) => orders.map(mapOrderLegacyStatus));
  }

  async findCocina() {
    // Solo pedidos PREPARADO que están en cocina
    return this.prisma.order
      .findMany({
      where: {
        fulfillmentStatus: { in: ['PENDING', 'PREPARING', 'READY'] },
        items: { some: { isPrep: true } },
      },
      include: {
        items: {
          where: { isPrep: true },
          include: { product: true },
        },
        table: true,
        deliveryZone: true,
      },
      orderBy: { createdAt: 'asc' },
    })
      .then((orders) => orders.map(mapOrderLegacyStatus));
  }

  async findDeliveries() {
    const now = new Date();
    const colombiaDate = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const year = colombiaDate.getUTCFullYear();
    const month = colombiaDate.getUTCMonth();
    const day = colombiaDate.getUTCDate();
    const start = new Date(Date.UTC(year, month, day, 5, 0, 0, 0));

    return this.prisma.order
      .findMany({
        where: {
          type: 'DELIVERY',
          OR: [
            { fulfillmentStatus: { in: ['PENDING', 'PREPARING', 'READY', 'IN_TRANSIT'] } },
            {
              fulfillmentStatus: 'DELIVERED',
              createdAt: { gte: start },
            },
          ],
        },
        include: {
          items: { include: { product: true } },
          deliveryZone: true,
        },
        orderBy: { createdAt: 'asc' },
      })
      .then((orders) => orders.map(mapOrderLegacyStatus));
  }

  async findByDate(dateStr: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    
    // We parse targetDate using UTC values to avoid local server timezone offsets when parsing YYYY-MM-DD
    const year = targetDate.getUTCFullYear();
    const month = targetDate.getUTCMonth();
    const day = targetDate.getUTCDate();
    
    // Colombia local day boundary (UTC-5)
    // 00:00:00 Colombia is 05:00:00 UTC
    // 23:59:59 Colombia is 04:59:59 UTC the next day
    const start = new Date(Date.UTC(year, month, day, 5, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, day + 1, 4, 59, 59, 999));
    
    return this.prisma.order
      .findMany({
        where: {
          createdAt: { gte: start, lte: end },
          paymentStatus: { in: ['PAID', 'FIADO'] },
          fulfillmentStatus: { not: 'CANCELLED' },
        },
        include: {
          items: { include: { product: true } },
          payments: true,
          table: true,
          deliveryZone: true,
        },
        orderBy: { createdAt: 'desc' },
      })
      .then((orders) => orders.map(mapOrderLegacyStatus));
  }

  async findOne(id: string) {
    return this.prisma.order
      .findUniqueOrThrow({
      where: { id },
      include: {
        items: { include: { product: true } },
        table: true,
        payments: true,
        deliveryZone: true,
      },
    })
      .then(mapOrderLegacyStatus);
  }

  async create(dto: CreateOrderDto) {
    await this.prisma.checkAndResetDailyStock();
    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.items.map((i) => i.productId) } },
      include: { vitrinaStock: true, store: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    let total = 0;

    // Validate vitrina stock before proceeding
    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (product && product.preparationMode === 'VITRINA') {
        const isFreeStore = product.store?.plan === 'FREE';
        if (isFreeStore) {
          // Bypass stock validation for FREE stores
          continue;
        }

        const stock = product.vitrinaStock?.qty ?? 0;
        if (item.qty > stock) {
          throw new BadRequestException(`Stock insuficiente para "${product.name}" (Disponible: ${stock}, Solicitado: ${item.qty})`);
        }
      }
    }

    const items = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestException(`Producto ${item.productId} no encontrado`);
      const unitPrice = item.unitPrice !== undefined ? item.unitPrice : product.salePrice;
      total += unitPrice * item.qty;
      return {
        productId: item.productId,
        qty: item.qty,
        unitPrice,
        notes: item.notes,
        isPrep: product.preparationMode === 'PREPARADO',
      };
    });

    // Calculate delivery fee
    let deliveryFee = 0;
    if (dto.type === 'DELIVERY' && dto.deliveryZoneId) {
      const zone = await this.prisma.deliveryZone.findUnique({ where: { id: dto.deliveryZoneId } });
      if (zone) {
        let baseFee = zone.fee;
        const zoneNameClean = zone.name.toLowerCase().trim();

        if (dto.storeId) {
          const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
          if (store && store.name !== 'Donde Salo!') {
            if (zoneNameClean.includes('puerto')) {
              baseFee = store.deliveryFeePuerto;
            } else if (zoneNameClean.includes('pradomar')) {
              baseFee = store.deliveryFeePradomar;
            } else if (zoneNameClean.includes('salgar')) {
              baseFee = store.deliveryFeeSalgar;
            } else if (zoneNameClean.includes('barranquilla')) {
              baseFee = store.deliveryFeeBarranquilla;
            }
          }
        }

        deliveryFee = baseFee;
        const subtotal = total; // total is the items subtotal here
        if (zoneNameClean.includes('puerto colombia') || zoneNameClean.includes('puerto col') || zoneNameClean.includes('pradomar')) {
          if (subtotal > 10000) {
            deliveryFee = 0;
          }
        } else if (zoneNameClean.includes('salgar')) {
          if (subtotal >= 18000) {
            deliveryFee = 0;
          }
        }
      }
    }

    const itemsSubtotal = total;
    total += deliveryFee;

    // Generate tracking code for delivery orders
    let trackingCode: string | undefined;
    if (dto.type === 'DELIVERY') {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      trackingCode = `SALO-${code}`;
    }

    // Reglas VITRINA vs PREPARADO
    const hasPrepItem = items.some((item) => item.isPrep);
    // Vitrina-only orders are immediately READY (no kitchen needed), prep orders start as PENDING
    const initialFulfillmentStatus = hasPrepItem ? 'PENDING' : 'READY';
    // All orders start UNPAID — payment is registered separately via /payments or /orders/:id/fiar
    const initialPaymentStatus = 'UNPAID';

    const order = await this.prisma.$transaction(async (tx) => {
      // No commission charged
      return tx.order.create({
        data: {
          type: dto.type as any,
          tableId: dto.tableId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerAddress: dto.customerAddress,
          customerDoc: dto.customerDoc,
          deliveryZoneId: dto.deliveryZoneId,
          deliveryFee,
          notes: dto.notes,
          total,
          trackingCode,
          fulfillmentStatus: initialFulfillmentStatus as any,
          paymentStatus: initialPaymentStatus as any,
          items: { create: items },
          storeId: dto.storeId,
        },
        include: {
          items: { include: { product: true } },
          table: true,
          deliveryZone: true,
        },
      });
    });

    // Si no tiene items preparados (todos vitrina), descontar stock vitrina
    if (!hasPrepItem) {
      for (const item of items) {
        const product = productMap.get(item.productId);
        if (product && product.preparationMode === 'VITRINA') {
          const isFreeStore = product.store?.plan === 'FREE';
          if (isFreeStore) {
            // Bypass stock decrement for FREE stores
            continue;
          }

          await this.prisma.vitrinaStock.updateMany({
            where: { productId: item.productId },
            data: { qty: { decrement: item.qty } },
          });
        }
      }
      this.realtime.server.emit('vitrina:updated', { orderId: order.id });
    } else {
      // Emitir a cocina
      this.realtime.emitOrderCreated(order);
    }

    return mapOrderLegacyStatus(order);
  }

  async addItems(
    id: string,
    items: Array<{ productId: string; qty: number; notes?: string }>,
  ) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      include: { vitrinaStock: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate vitrina stock before proceeding
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (product && product.preparationMode === 'VITRINA') {
        const stock = product.vitrinaStock?.qty ?? 0;
        if (item.qty > stock) {
          throw new BadRequestException(`Stock insuficiente para "${product.name}" (Disponible: ${stock}, Solicitado: ${item.qty})`);
        }
      }
    }

    const newItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestException(`Producto ${item.productId} no encontrado`);
      const unitPrice = product.salePrice;
      return {
        orderId: id,
        productId: item.productId,
        qty: item.qty,
        unitPrice,
        notes: item.notes,
        isPrep: product.preparationMode === 'PREPARADO',
      };
    });

    // Create the new items
    await this.prisma.orderItem.createMany({ data: newItems });

    // Recalculate total from ALL items (existing + new)
    const allItems = await this.prisma.orderItem.findMany({ where: { orderId: id } });
    const itemsTotal = allItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);

    // Fetch existing order to get deliveryFee and current fulfillmentStatus
    const existing = await this.prisma.order.findUniqueOrThrow({ where: { id } });
    const newTotal = itemsTotal + (existing.deliveryFee ?? 0);

    // Determine if fulfillmentStatus needs to change
    const hasPrepItem = newItems.some((item) => item.isPrep);
    const fulfillmentUpdate: Record<string, any> = {};
    if (hasPrepItem && existing.fulfillmentStatus === 'READY') {
      fulfillmentUpdate.fulfillmentStatus = 'PREPARING';
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: { total: newTotal, updatedAt: new Date(), ...fulfillmentUpdate },
      include: {
        items: { include: { product: true } },
        table: true,
        deliveryZone: true,
        payments: true,
      },
    });

    // Handle vitrina stock decrement for VITRINA items
    const vitrinaItems = newItems.filter((item) => !item.isPrep);
    for (const item of vitrinaItems) {
      await this.prisma.vitrinaStock.updateMany({
        where: { productId: item.productId },
        data: { qty: { decrement: item.qty } },
      });
    }
    if (vitrinaItems.length > 0) {
      this.realtime.server.emit('vitrina:updated', { orderId: order.id });
    }

    // Emit to kitchen if there are prep items
    if (hasPrepItem) {
      this.realtime.emitOrderCreated(order);
    }

    return mapOrderLegacyStatus(order);
  }

  async fiar(id: string, customerId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new BadRequestException('Pedido no encontrado');
    }

    const existingPayments = await this.prisma.payment.findMany({ where: { orderId: id } });
    const paidSum = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    if (paidSum >= order.total) {
      throw new BadRequestException('El pedido ya se encuentra totalmente cobrado');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { paymentStatus: 'FIADO', isFiated: true, updatedAt: new Date() },
      include: { items: { include: { product: true } }, table: true, deliveryZone: true },
    });
    const legacy = mapOrderLegacyStatus(updated);
    this.realtime.emitOrderStatusChanged(legacy);
    return legacy;
  }

  async pagar(id: string) {
    const updated = await this.prisma.order.update({
      where: { id },
      data: { paymentStatus: 'PAID', isFiated: false, updatedAt: new Date() },
      include: { items: { include: { product: true } }, table: true, deliveryZone: true },
    });
    const legacy = mapOrderLegacyStatus(updated);
    this.realtime.emitOrderStatusChanged(legacy);
    return legacy;
  }

  async cancelar(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new Error('Pedido no encontrado');
    
    // Devolver stock vitrina si aplica
    for (const item of order.items) {
      if (!item.isPrep) {
        await this.prisma.vitrinaStock.updateMany({
          where: { productId: item.productId },
          data: { qty: { increment: item.qty } },
        });
      }
    }
    
    return this.prisma.order.update({
      where: { id },
      data: { fulfillmentStatus: 'CANCELLED', paymentStatus: 'CANCELLED', updatedAt: new Date() },
      include: { items: { include: { product: true } } },
    }).then(mapOrderLegacyStatus);
  }

  async updateStatus(id: string, status: string) {
    // Block delivery status advancement if prepared items are not ready from kitchen
    if (status === 'IN_TRANSIT' || status === 'DELIVERED') {
      const existingOrder = await this.prisma.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (existingOrder && existingOrder.type === 'DELIVERY') {
        const hasPrepItems = existingOrder.items.some((item) => item.isPrep);
        if (hasPrepItems && existingOrder.fulfillmentStatus !== 'READY' && existingOrder.fulfillmentStatus !== 'IN_TRANSIT' && existingOrder.fulfillmentStatus !== 'DELIVERED') {
          throw new BadRequestException('No se puede avanzar el pedido. Hay productos preparados que aún no están listos en cocina.');
        }
      }
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: { fulfillmentStatus: status as any },
      include: {
        items: { include: { product: true } },
        table: true,
        deliveryZone: true,
      },
    });

    let updatedOrder = order;

    // If a delivery order is marked READY in cocina, move it immediately to IN_TRANSIT
    if (status === 'READY' && order.type === 'DELIVERY') {
      updatedOrder = await this.prisma.order.update({
        where: { id },
        data: { fulfillmentStatus: 'IN_TRANSIT' },
        include: {
          items: { include: { product: true } },
          table: true,
          deliveryZone: true,
        },
      });
    }

    const legacy = mapOrderLegacyStatus(updatedOrder);
    this.realtime.emitOrderStatusChanged(legacy);
    return legacy;
  }

  async findStoreOrders(storeId: string, status?: string) {
    const where: any = { storeId };
    if (status) where.fulfillmentStatus = status as any;
    return this.prisma.order
      .findMany({
        where,
        include: {
          items: { include: { product: true } },
          table: true,
          payments: true,
          deliveryZone: true,
        },
        orderBy: { createdAt: 'desc' },
      })
      .then((orders) => orders.map(mapOrderLegacyStatus));
  }

  async findStoreActive(storeId: string) {
    return this.prisma.order
      .findMany({
        where: {
          storeId,
          fulfillmentStatus: { in: ['PENDING', 'PREPARING', 'READY', 'DELIVERED'] },
        },
        include: {
          items: { include: { product: true } },
          table: true,
          deliveryZone: true,
          payments: true,
        },
        orderBy: { createdAt: 'asc' },
      })
      .then((orders) => orders.map(mapOrderLegacyStatus));
  }

  async findStoreCocina(storeId: string) {
    return this.prisma.order
      .findMany({
        where: {
          storeId,
          fulfillmentStatus: { in: ['PENDING', 'PREPARING', 'READY'] },
          items: { some: { isPrep: true } },
        },
        include: {
          items: {
            where: { isPrep: true },
            include: { product: true },
          },
          table: true,
          deliveryZone: true,
        },
        orderBy: { createdAt: 'asc' },
      })
      .then((orders) => orders.map(mapOrderLegacyStatus));
  }

  async findStoreDeliveries(storeId: string) {
    return this.prisma.order
      .findMany({
        where: {
          storeId,
          type: 'DELIVERY',
          fulfillmentStatus: { in: ['PENDING', 'PREPARING', 'READY', 'IN_TRANSIT', 'DELIVERED'] },
        },
        include: {
          items: { include: { product: true } },
          deliveryZone: true,
        },
        orderBy: { createdAt: 'asc' },
      })
      .then((orders) => orders.map(mapOrderLegacyStatus));
  }

  async findStoreOrdersByOwner(ownerId: string, status?: string) {
    const store = await this.prisma.store.findUnique({ where: { ownerId } });
    if (!store) throw new BadRequestException('El usuario no posee una tienda');
    return this.findStoreOrders(store.id, status);
  }

  async findStoreActiveByOwner(ownerId: string) {
    const store = await this.prisma.store.findUnique({ where: { ownerId } });
    if (!store) throw new BadRequestException('El usuario no posee una tienda');
    return this.findStoreActive(store.id);
  }

  async findStoreCocinaByOwner(ownerId: string) {
    const store = await this.prisma.store.findUnique({ where: { ownerId } });
    if (!store) throw new BadRequestException('El usuario no posee una tienda');
    return this.findStoreCocina(store.id);
  }

  async findStoreDeliveriesByOwner(ownerId: string) {
    const store = await this.prisma.store.findUnique({ where: { ownerId } });
    if (!store) throw new BadRequestException('El usuario no posee una tienda');
    return this.findStoreDeliveries(store.id);
  }

  async removeItem(orderId: string, itemId: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { product: { include: { store: true } } },
    });
    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('Producto del pedido no encontrado');
    }

    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

    const isFreeStore = item.product?.store?.plan === 'FREE';

    // Restore stock if it's VITRINA and not FREE plan
    if (item.product?.preparationMode === 'VITRINA' && !isFreeStore) {
      await this.prisma.vitrinaStock.updateMany({
        where: { productId: item.productId },
        data: { qty: { increment: item.qty } },
      });
    }

    // Delete item
    await this.prisma.orderItem.delete({ where: { id: itemId } });

    // Check remaining items
    const remainingItems = order.items.filter((i) => i.id !== itemId);
    if (remainingItems.length === 0) {
      // Delete empty order to keep vitrina clean
      await this.prisma.order.delete({ where: { id: orderId } });
      this.realtime.server.emit('vitrina:updated', { orderId });
      return { success: true, deletedOrder: true };
    }

    // Recalculate total
    const newItemsTotal = remainingItems.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
    const newTotal = newItemsTotal + (order.deliveryFee ?? 0);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { total: newTotal, updatedAt: new Date() },
      include: {
        items: { include: { product: true } },
        table: true,
        deliveryZone: true,
        payments: true,
      },
    });

    this.realtime.server.emit('vitrina:updated', { orderId });
    return mapOrderLegacyStatus(updated);
  }

  async editItem(orderId: string, itemId: string, qty?: number, unitPrice?: number) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { product: { include: { store: true } } },
    });
    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('Producto del pedido no encontrado');
    }

    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

    const isFreeStore = item.product?.store?.plan === 'FREE';

    const updateData: Record<string, any> = {};

    if (unitPrice !== undefined) {
      updateData.unitPrice = unitPrice;
    }

    if (qty !== undefined && qty !== item.qty) {
      if (qty <= 0) {
        return this.removeItem(orderId, itemId);
      }

      if (item.product?.preparationMode === 'VITRINA' && !isFreeStore) {
        // Adjust stock by difference
        const diff = qty - item.qty;
        if (diff > 0) {
          const stock = await this.prisma.vitrinaStock.findUnique({ where: { productId: item.productId } });
          const currentStock = stock?.qty ?? 0;
          if (diff > currentStock) {
            throw new BadRequestException(`Stock insuficiente (Disponible: ${currentStock}, Adicional solicitado: ${diff})`);
          }
          await this.prisma.vitrinaStock.updateMany({
            where: { productId: item.productId },
            data: { qty: { decrement: diff } },
          });
        } else {
          await this.prisma.vitrinaStock.updateMany({
            where: { productId: item.productId },
            data: { qty: { increment: Math.abs(diff) } },
          });
        }
      }

      updateData.qty = qty;
    }

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: updateData,
    });

    // Recalculate total
    const allItems = await this.prisma.orderItem.findMany({ where: { orderId } });
    const newItemsTotal = allItems.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
    const newTotal = newItemsTotal + (order.deliveryFee ?? 0);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { total: newTotal, updatedAt: new Date() },
      include: {
        items: { include: { product: true } },
        table: true,
        deliveryZone: true,
        payments: true,
      },
    });

    this.realtime.server.emit('vitrina:updated', { orderId });
    return mapOrderLegacyStatus(updated);
  }

  async getCocinaDailySummary(monthStr?: string) {
    const targetMonth = monthStr || new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 7);
    const [year, month] = targetMonth.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) + 5 * 60 * 60 * 1000);
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) + 5 * 60 * 60 * 1000 - 1);

    const [productionOrders, preparedItems] = await Promise.all([
      this.prisma.productionOrder.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { product: true },
      }),
      this.prisma.orderItem.findMany({
        where: {
          isPrep: true,
          order: {
            createdAt: { gte: start, lte: end },
            fulfillmentStatus: { notIn: ['PENDING', 'PREPARING', 'CANCELLED'] },
          },
        },
        include: {
          product: true,
          order: {
            select: { createdAt: true },
          },
        },
      }),
    ]);

    const getColombiaDate = (date: Date) => {
      const col = new Date(date.getTime() - 5 * 60 * 60 * 1000);
      return `${col.getUTCFullYear()}-${String(col.getUTCMonth() + 1).padStart(2, '0')}-${String(col.getUTCDate()).padStart(2, '0')}`;
    };

    const dailyData: Record<string, { vitrina: Record<string, { name: string; qty: number }>; preparados: Record<string, { name: string; qty: number }> }> = {};

    const ensureDate = (dateStr: string) => {
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { vitrina: {}, preparados: {} };
      }
    };

    productionOrders.forEach((po) => {
      const dateStr = getColombiaDate(po.createdAt);
      ensureDate(dateStr);
      const prodId = po.productId;
      if (!dailyData[dateStr].vitrina[prodId]) {
        dailyData[dateStr].vitrina[prodId] = { name: po.product.name, qty: 0 };
      }
      dailyData[dateStr].vitrina[prodId].qty += po.readyQty;
    });

    preparedItems.forEach((item) => {
      const dateStr = getColombiaDate(item.order.createdAt);
      ensureDate(dateStr);
      const prodId = item.productId;
      if (!dailyData[dateStr].preparados[prodId]) {
        dailyData[dateStr].preparados[prodId] = { name: item.product.name, qty: 0 };
      }
      dailyData[dateStr].preparados[prodId].qty += item.qty;
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        vitrina: Object.entries(data.vitrina).map(([productId, info]) => ({ productId, ...info })),
        preparados: Object.entries(data.preparados).map(([productId, info]) => ({ productId, ...info })),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async getDeliveriesDailySummary(monthStr?: string) {
    const targetMonth = monthStr || new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 7);
    const [year, month] = targetMonth.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) + 5 * 60 * 60 * 1000);
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) + 5 * 60 * 60 * 1000 - 1);

    const orders = await this.prisma.order.findMany({
      where: {
        type: 'DELIVERY',
        fulfillmentStatus: 'DELIVERED',
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: { include: { product: true } },
        deliveryZone: true,
      },
    });

    const getColombiaDate = (date: Date) => {
      const col = new Date(date.getTime() - 5 * 60 * 60 * 1000);
      return `${col.getUTCFullYear()}-${String(col.getUTCMonth() + 1).padStart(2, '0')}-${String(col.getUTCDate()).padStart(2, '0')}`;
    };

    const dailyData: Record<string, { totalOrders: number; totalSales: number; totalDeliveryFees: number; orders: any[] }> = {};

    orders.forEach((order) => {
      const dateStr = getColombiaDate(order.createdAt);
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { totalOrders: 0, totalSales: 0, totalDeliveryFees: 0, orders: [] };
      }
      dailyData[dateStr].totalOrders++;
      dailyData[dateStr].totalSales += order.total;
      dailyData[dateStr].totalDeliveryFees += order.deliveryFee;
      dailyData[dateStr].orders.push(mapOrderLegacyStatus(order));
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
}
