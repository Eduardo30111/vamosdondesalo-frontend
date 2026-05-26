import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.credit.deleteMany();
  await prisma.cashClose.deleteMany();
  await prisma.waste.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.dailyStock.deleteMany();
  await prisma.kitchenProduction.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.deliveryZone.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();
  await prisma.paymentMethodConfig.deleteMany();
  await prisma.appConfig.deleteMany();

  const hash = async (pw: string) => bcrypt.hash(pw, 10);

  const [admin, vendedor, cocina] = await Promise.all([
    prisma.user.create({ data: { name: 'Admin Salo', email: 'admin@salo.co', passwordHash: await hash('admin123'), role: 'ADMIN' } }),
    prisma.user.create({ data: { name: 'Vendedor María', email: 'vendedor@salo.co', passwordHash: await hash('vendedor123'), role: 'VENDEDOR' } }),
    prisma.user.create({ data: { name: 'Cocina Carlos', email: 'cocina@salo.co', passwordHash: await hash('cocina123'), role: 'COCINA' } }),
  ]);

  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: 'Distribuidora El Sabor', phone: '3001234567' } }),
    prisma.supplier.create({ data: { name: 'Bebidas del Valle', phone: '3109876543' } }),
    prisma.supplier.create({ data: { name: 'Insumos La Costeña', phone: '3205551122' } }),
  ]);

  type ProdSeed = { name: string; description: string; salePrice: number; costPrice: number; type: 'OWN' | 'SUPPLIER'; supplierId?: string; dailyStock: number; photoUrl: string };

  const productSeeds: ProdSeed[] = [
    { name: 'Empanada de Carne', description: 'Empanada criolla de carne molida', salePrice: 3000, costPrice: 1500, type: 'OWN', dailyStock: 100, photoUrl: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=300' },
    { name: 'Empanada de Pollo', description: 'Empanada rellena de pollo desmechado', salePrice: 3000, costPrice: 1500, type: 'OWN', dailyStock: 100, photoUrl: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=300' },
    { name: 'Papa Rellena', description: 'Papa rellena de carne con hogao', salePrice: 4000, costPrice: 2000, type: 'OWN', dailyStock: 60, photoUrl: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=300' },
    { name: 'Arepa de Huevo', description: 'Arepa frita con huevo adentro', salePrice: 5000, costPrice: 2500, type: 'OWN', dailyStock: 50, photoUrl: 'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=300' },
    { name: 'Dedos de Queso', description: 'Palitos de queso crocantes', salePrice: 4500, costPrice: 2000, type: 'OWN', dailyStock: 80, photoUrl: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=300' },
    { name: 'Patacón con Todo', description: 'Patacón con carne, queso y salsas', salePrice: 8000, costPrice: 4000, type: 'OWN', dailyStock: 40, photoUrl: 'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=300' },
    { name: 'Salchipapa', description: 'Papas fritas con salchicha y salsas', salePrice: 10000, costPrice: 4500, type: 'OWN', dailyStock: 50, photoUrl: 'https://images.unsplash.com/photo-1630384060421-cb20aeb56983?w=300' },
    { name: 'Chorizo con Arepa', description: 'Chorizo santarosano con arepa', salePrice: 7000, costPrice: 3500, type: 'OWN', dailyStock: 40, photoUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300' },
    { name: 'Chicharrón', description: 'Chicharrón crocante con limón', salePrice: 6000, costPrice: 3000, type: 'OWN', dailyStock: 30, photoUrl: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=300' },
    { name: 'Buñuelo', description: 'Buñuelo de queso recién hecho', salePrice: 2000, costPrice: 800, type: 'OWN', dailyStock: 120, photoUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300' },
    { name: 'Almojábanas', description: 'Almojábanas recién horneadas', salePrice: 2500, costPrice: 1000, type: 'OWN', dailyStock: 80, photoUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300' },
    { name: 'Marranitas', description: 'Marranitas rellenas de queso y plátano', salePrice: 3500, costPrice: 1700, type: 'OWN', dailyStock: 60, photoUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300' },
    { name: 'Porción de Yuca', description: 'Yuca frita con salsa de ajo', salePrice: 4000, costPrice: 1800, type: 'OWN', dailyStock: 70, photoUrl: 'https://images.unsplash.com/photo-1630384060421-cb20aeb56983?w=300' },
    { name: 'Nuggets de Pollo', description: 'Nuggets de pollo empanizados x8', salePrice: 7000, costPrice: 3500, type: 'OWN', dailyStock: 50, photoUrl: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=300' },
    { name: 'Aros de Cebolla', description: 'Aros de cebolla empanizados x8', salePrice: 5000, costPrice: 2200, type: 'OWN', dailyStock: 60, photoUrl: 'https://images.unsplash.com/photo-1630384060421-cb20aeb56983?w=300' },
    { name: 'Gaseosa Personal', description: 'Coca-Cola, Pepsi o Sprite 350ml', salePrice: 3000, costPrice: 1800, type: 'SUPPLIER', supplierId: suppliers[1].id, dailyStock: 100, photoUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300' },
    { name: 'Jugo Natural', description: 'Jugo de lulo, mango o maracuyá', salePrice: 4000, costPrice: 2000, type: 'OWN', dailyStock: 60, photoUrl: 'https://images.unsplash.com/photo-1600271886742-c049cd451bba?w=300' },
    { name: 'Agua Botella', description: 'Agua cristal 600ml', salePrice: 2500, costPrice: 1200, type: 'SUPPLIER', supplierId: suppliers[1].id, dailyStock: 100, photoUrl: 'https://images.unsplash.com/photo-1560023907-5f339617ea55?w=300' },
    { name: 'Cerveza Nacional', description: 'Poker, Águila o Club Colombia', salePrice: 5000, costPrice: 3000, type: 'SUPPLIER', supplierId: suppliers[1].id, dailyStock: 80, photoUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300' },
    { name: 'Malteada', description: 'Malteada de chocolate o vainilla', salePrice: 7000, costPrice: 3500, type: 'OWN', dailyStock: 40, photoUrl: 'https://images.unsplash.com/photo-1600271886742-c049cd451bba?w=300' },
  ];

  const products = await Promise.all(productSeeds.map(p => prisma.product.create({ data: p as any })));

  await prisma.table.createMany({
    data: Array.from({ length: 5 }, (_, i) => ({ number: i + 1, qrToken: `mesa-${i + 1}-${Date.now()}` })),
  });

  await prisma.paymentMethodConfig.createMany({
    data: [
      { method: 'CASH', enabled: true, key: 'Efectivo' },
      { method: 'NEQUI', enabled: true, qrUrl: 'https://via.placeholder.com/300x300?text=QR+Nequi', key: '3001234567' },
      { method: 'BANCOLOMBIA', enabled: true, qrUrl: 'https://via.placeholder.com/300x300?text=QR+Bancolombia', key: '12345678901' },
      { method: 'DAVIPLATA', enabled: true, qrUrl: 'https://via.placeholder.com/300x300?text=QR+Daviplata', key: '3001234567' },
      { method: 'TRANSFER', enabled: false, key: 'Cuenta Bancolombia 12345678901' },
    ],
  });

  await prisma.deliveryZone.createMany({
    data: [
      { name: 'Puerto Colombia', fee: 3000, enabled: true },
      { name: 'Pradomar', fee: 3500, enabled: true },
      { name: 'Salgar', fee: 4000, enabled: true },
      { name: 'Calle 100', fee: 2500, enabled: true },
      { name: 'Andalucía', fee: 5000, enabled: true },
    ],
  });

  await prisma.appConfig.createMany({
    data: [
      { key: 'business_name', value: 'Donde Salo!' },
      { key: 'business_logo_url', value: '' },
      { key: 'business_color', value: '#F97316' },
      { key: 'whatsapp_number', value: '573001234567' },
      { key: 'whatsapp_message', value: 'Hola! Quiero hacer un pedido a Donde Salo!' },
    ],
  });

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  await prisma.dailyStock.createMany({
    data: products.map(p => ({ date: todayDate, productId: p.id, initialQty: p.dailyStock, remaining: p.dailyStock })),
  });

  await prisma.kitchenProduction.createMany({
    data: [
      { productId: products[0].id, startedQty: 20, readyQty: 5, status: 'PREPARING' },
      { productId: products[2].id, startedQty: 15, readyQty: 8, status: 'PREPARING' },
      { productId: products[3].id, startedQty: 10, readyQty: 10, status: 'READY' },
    ],
  });

  const customer1 = await prisma.customer.create({ data: { name: 'Juan Pérez', cedula: '1001234567', phone: '3001112233', totalDebt: 25000 } });
  const customer2 = await prisma.customer.create({ data: { name: 'María González', cedula: '1009876543', phone: '3104445566', totalDebt: 15000 } });
  const customer3 = await prisma.customer.create({ data: { name: 'Pedro López', cedula: '1005551234', phone: '3207778899', totalDebt: 0 } });
  const customer4 = await prisma.customer.create({ data: { name: 'Ana Torres', cedula: '1008889990', phone: '3001234567', totalDebt: 45000 } });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 35);

  await prisma.credit.createMany({
    data: [
      { customerId: customer1.id, amount: 15000, type: 'CHARGE', note: 'Empanadas para la oficina', createdAt: thirtyDaysAgo },
      { customerId: customer1.id, amount: 10000, type: 'CHARGE', note: 'Almuerzo familiar', createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      { customerId: customer2.id, amount: 20000, type: 'CHARGE', note: 'Pedido domicilio', createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      { customerId: customer2.id, amount: 5000, type: 'PAYMENT', note: 'Abono parcial', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { customerId: customer3.id, amount: 12000, type: 'CHARGE', note: 'Fiesta', createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { customerId: customer3.id, amount: 12000, type: 'PAYMENT', note: 'Pago completo', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      { customerId: customer4.id, amount: 25000, type: 'CHARGE', note: 'Cumpleaños', createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) },
      { customerId: customer4.id, amount: 20000, type: 'PAYMENT', note: 'Abono', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      { customerId: customer4.id, amount: 40000, type: 'CHARGE', note: 'Evento de fin de año', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    ],
  });

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const createdTables = await prisma.table.findMany();

  await prisma.order.create({
    data: {
      type: 'TABLE',
      tableId: createdTables[0]?.id,
      customerName: 'Cliente Demo Ayer 1',
      status: 'PAID',
      total: 16000,
      createdAt: yesterday,
      items: { create: [{ productId: products[0].id, qty: 2, unitPrice: 3000 }, { productId: products[6].id, qty: 1, unitPrice: 10000 }] },
      payments: { create: [{ method: 'CASH', amount: 16000, confirmed: true, createdAt: yesterday }] },
    },
  });

  await prisma.order.create({
    data: {
      type: 'TAKEAWAY',
      customerName: 'Cliente Demo Ayer 2',
      status: 'PAID',
      total: 24000,
      createdAt: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000),
      items: { create: [{ productId: products[5].id, qty: 2, unitPrice: 8000 }, { productId: products[7].id, qty: 1, unitPrice: 7000 }, { productId: products[14].id, qty: 1, unitPrice: 5000 }] },
      payments: { create: [{ method: 'NEQUI', amount: 24000, confirmed: true, createdAt: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000) }] },
    },
  });

  const today = new Date();
  await prisma.order.create({
    data: {
      type: 'TABLE',
      tableId: createdTables[1]?.id,
      customerName: 'Cliente Demo Hoy 1',
      status: 'PAID',
      total: 16000,
      createdAt: today,
      items: { create: [{ productId: products[0].id, qty: 2, unitPrice: 3000 }, { productId: products[6].id, qty: 1, unitPrice: 10000 }] },
      payments: { create: [{ method: 'CASH', amount: 16000, confirmed: true }] },
    },
  });

  await prisma.order.create({
    data: {
      type: 'TAKEAWAY',
      customerName: 'Cliente Demo Hoy 2',
      status: 'PAID',
      total: 24000,
      createdAt: today,
      items: { create: [{ productId: products[5].id, qty: 2, unitPrice: 8000 }, { productId: products[7].id, qty: 1, unitPrice: 7000 }, { productId: products[14].id, qty: 1, unitPrice: 5000 }] },
      payments: { create: [{ method: 'NEQUI', amount: 24000, confirmed: true }] },
    },
  });

  const zones = await prisma.deliveryZone.findMany();
  await prisma.order.create({
    data: {
      type: 'DELIVERY',
      customerName: 'Cliente Domicilio',
      customerPhone: '3001234567',
      customerAddress: 'Calle 10 #5-20, Puerto',
      deliveryZoneId: zones[0].id,
      deliveryFee: 3000,
      trackingCode: 'SALO-ABCDE',
      status: 'PREPARING',
      total: 19000,
      createdAt: today,
      items: { create: [{ productId: products[0].id, qty: 4, unitPrice: 3000 }, { productId: products[15].id, qty: 2, unitPrice: 3000 }] },
    },
  });

  await prisma.waste.createMany({
    data: [
      { productId: products[0].id, qty: 5, reason: 'DAMAGED', note: 'Se quemaron en la freidora', userId: admin.id, createdAt: today },
      { productId: products[9].id, qty: 3, reason: 'GIFTED', note: 'Cortesía para vecinos', userId: vendedor.id, createdAt: today },
      { productId: products[2].id, qty: 2, reason: 'LOST', note: 'Conteo de inventario no cuadra', userId: admin.id, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    ],
  });

  await prisma.expense.createMany({
    data: [
      { category: 'Gas', description: 'Cilindro de gas propano', amount: 85000, type: 'DAILY', date: today, userId: admin.id },
      { category: 'Limpieza', description: 'Productos de aseo', amount: 25000, type: 'DAILY', date: today, userId: admin.id },
      { category: 'Transporte', description: 'Gasolina moto domicilios', amount: 20000, type: 'DAILY', date: today, userId: vendedor.id },
      { category: 'Arriendo', description: 'Arriendo local mensual', amount: 2000000, type: 'MONTHLY', date: today, userId: admin.id },
      { category: 'Servicios', description: 'Luz, agua, internet', amount: 350000, type: 'MONTHLY', date: today, userId: admin.id },
      { category: 'Nómina', description: 'Salarios empleados', amount: 3500000, type: 'MONTHLY', date: today, userId: admin.id },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('Demo credentials:');
  console.log('  Admin:    admin@salo.co / admin123');
  console.log('  Vendedor: vendedor@salo.co / vendedor123');
  console.log('  Cocina:   cocina@salo.co / cocina123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
