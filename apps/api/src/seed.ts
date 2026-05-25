import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (order matters for FK constraints)
  await prisma.credit.deleteMany();
  await prisma.cashClose.deleteMany();
  await prisma.waste.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.deliveryZone.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();
  await prisma.paymentMethodConfig.deleteMany();
  await prisma.appConfig.deleteMany();

  // Create users
  const hash = async (pw: string) => bcrypt.hash(pw, 10);

  const admin = await prisma.user.create({
    data: { name: 'Admin Salo', email: 'admin@salo.co', passwordHash: await hash('admin123'), role: 'ADMIN' },
  });
  const vendedor = await prisma.user.create({
    data: { name: 'Vendedor María', email: 'vendedor@salo.co', passwordHash: await hash('vendedor123'), role: 'VENDEDOR' },
  });
  await prisma.user.create({
    data: { name: 'Cocina Carlos', email: 'cocina@salo.co', passwordHash: await hash('cocina123'), role: 'COCINA' },
  });

  // Create suppliers
  const supplier1 = await prisma.supplier.create({
    data: { name: 'Distribuidora El Sabor', phone: '3001234567' },
  });
  const supplier2 = await prisma.supplier.create({
    data: { name: 'Bebidas del Valle', phone: '3109876543' },
  });

  // Create products
  const products = await Promise.all([
    prisma.product.create({ data: { name: 'Empanada de Carne', description: 'Empanada criolla de carne molida', salePrice: 3000, costPrice: 1500, type: 'OWN', dailyStock: 100, photoUrl: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=300' } }),
    prisma.product.create({ data: { name: 'Empanada de Pollo', description: 'Empanada rellena de pollo desmechado', salePrice: 3000, costPrice: 1500, type: 'OWN', dailyStock: 100, photoUrl: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=300' } }),
    prisma.product.create({ data: { name: 'Papa Rellena', description: 'Papa rellena de carne con hogao', salePrice: 4000, costPrice: 2000, type: 'OWN', dailyStock: 60, photoUrl: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=300' } }),
    prisma.product.create({ data: { name: 'Arepa de Huevo', description: 'Arepa frita con huevo adentro', salePrice: 5000, costPrice: 2500, type: 'OWN', dailyStock: 50, photoUrl: 'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=300' } }),
    prisma.product.create({ data: { name: 'Dedos de Queso', description: 'Palitos de queso crocantes', salePrice: 4500, costPrice: 2000, type: 'OWN', dailyStock: 80, photoUrl: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=300' } }),
    prisma.product.create({ data: { name: 'Patacón con Todo', description: 'Patacón con carne, queso y salsas', salePrice: 8000, costPrice: 4000, type: 'OWN', dailyStock: 40, photoUrl: 'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=300' } }),
    prisma.product.create({ data: { name: 'Salchipapa', description: 'Papas fritas con salchicha y salsas', salePrice: 10000, costPrice: 4500, type: 'OWN', dailyStock: 50, photoUrl: 'https://images.unsplash.com/photo-1630384060421-cb20aeb56983?w=300' } }),
    prisma.product.create({ data: { name: 'Chorizo con Arepa', description: 'Chorizo santarosano con arepa', salePrice: 7000, costPrice: 3500, type: 'OWN', dailyStock: 40, photoUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300' } }),
    prisma.product.create({ data: { name: 'Chicharrón', description: 'Chicharrón crocante con limón', salePrice: 6000, costPrice: 3000, type: 'OWN', dailyStock: 30, photoUrl: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=300' } }),
    prisma.product.create({ data: { name: 'Buñuelo', description: 'Buñuelo de queso recién hecho', salePrice: 2000, costPrice: 800, type: 'OWN', dailyStock: 120, photoUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300' } }),
    prisma.product.create({ data: { name: 'Combo Familiar', description: '10 empanadas + 5 papas rellenas + bebidas', salePrice: 45000, costPrice: 22000, type: 'OWN', dailyStock: 10, photoUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300' } }),
    prisma.product.create({ data: { name: 'Gaseosa Personal', description: 'Coca-Cola, Pepsi o Sprite 350ml', salePrice: 3000, costPrice: 1800, type: 'SUPPLIER', supplierId: supplier2.id, dailyStock: 100, photoUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300' } }),
    prisma.product.create({ data: { name: 'Jugo Natural', description: 'Jugo de lulo, mango o maracuyá', salePrice: 4000, costPrice: 2000, type: 'OWN', dailyStock: 60, photoUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300' } }),
    prisma.product.create({ data: { name: 'Agua Botella', description: 'Agua cristal 600ml', salePrice: 2500, costPrice: 1200, type: 'SUPPLIER', supplierId: supplier2.id, dailyStock: 100, photoUrl: 'https://images.unsplash.com/photo-1560023907-5f339617ea55?w=300' } }),
    prisma.product.create({ data: { name: 'Cerveza Nacional', description: 'Poker, Águila o Club Colombia', salePrice: 5000, costPrice: 3000, type: 'SUPPLIER', supplierId: supplier2.id, dailyStock: 80, photoUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300' } }),
  ]);

  // Create tables
  const tableData = Array.from({ length: 8 }, (_, i) => ({
    number: i + 1,
    qrToken: `mesa-${i + 1}-token-${Date.now()}`,
  }));
  await prisma.table.createMany({ data: tableData });

  // Create payment method configs
  await prisma.paymentMethodConfig.createMany({
    data: [
      { method: 'CASH', enabled: true, key: 'Efectivo' },
      { method: 'NEQUI', enabled: true, qrUrl: 'https://via.placeholder.com/300x300?text=QR+Nequi', key: '3001234567' },
      { method: 'BANCOLOMBIA', enabled: true, qrUrl: 'https://via.placeholder.com/300x300?text=QR+Bancolombia', key: '12345678901' },
      { method: 'DAVIPLATA', enabled: true, qrUrl: 'https://via.placeholder.com/300x300?text=QR+Daviplata', key: '3001234567' },
      { method: 'TRANSFER', enabled: false, key: 'Cuenta Bancolombia 12345678901' },
    ],
  });

  // === Phase 2 Seed Data ===

  // Delivery Zones
  await prisma.deliveryZone.createMany({
    data: [
      { name: 'Puerto', fee: 3000, enabled: true },
      { name: 'Pradomar', fee: 3500, enabled: true },
      { name: 'Salgar', fee: 4000, enabled: true },
    ],
  });

  // Customers with debts (Fiados)
  const customer1 = await prisma.customer.create({
    data: { name: 'Juan Pérez', cedula: '1001234567', phone: '3001112233', totalDebt: 25000 },
  });
  const customer2 = await prisma.customer.create({
    data: { name: 'María González', cedula: '1009876543', phone: '3104445566', totalDebt: 15000 },
  });
  const customer3 = await prisma.customer.create({
    data: { name: 'Carlos Rodríguez', cedula: '1005551234', phone: '3207778899', totalDebt: 0 },
  });

  // Credits history
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
    ],
  });

  // Demo orders (some paid today for dashboard/accounting)
  const today = new Date();
  const order1 = await prisma.order.create({
    data: {
      type: 'TABLE',
      customerName: 'Cliente Demo 1',
      status: 'PAID',
      total: 16000,
      createdAt: today,
      items: {
        create: [
          { productId: products[0].id, qty: 2, unitPrice: 3000 },
          { productId: products[6].id, qty: 1, unitPrice: 10000 },
        ],
      },
      payments: {
        create: [{ method: 'CASH', amount: 16000, confirmed: true }],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      type: 'TAKEAWAY',
      customerName: 'Cliente Demo 2',
      status: 'PAID',
      total: 24000,
      createdAt: today,
      items: {
        create: [
          { productId: products[5].id, qty: 2, unitPrice: 8000 },
          { productId: products[7].id, qty: 1, unitPrice: 7000 },
          { productId: products[14].id, qty: 1, unitPrice: 5000 },
        ],
      },
      payments: {
        create: [{ method: 'NEQUI', amount: 24000, confirmed: true }],
      },
    },
  });

  // A delivery order
  const zones = await prisma.deliveryZone.findMany();
  await prisma.order.create({
    data: {
      type: 'DELIVERY',
      customerName: 'Cliente Domicilio',
      customerPhone: '3001234567',
      customerAddress: 'Calle 10 #5-20, Puerto',
      deliveryZoneId: zones[0].id,
      deliveryFee: 3000,
      status: 'PREPARING',
      total: 19000,
      createdAt: today,
      items: {
        create: [
          { productId: products[0].id, qty: 4, unitPrice: 3000 },
          { productId: products[11].id, qty: 2, unitPrice: 3000 },
        ],
      },
    },
  });

  // Wastes (mermas)
  await prisma.waste.createMany({
    data: [
      { productId: products[0].id, qty: 5, reason: 'DAMAGED', note: 'Se quemaron en la freidora', userId: admin.id, createdAt: today },
      { productId: products[9].id, qty: 3, reason: 'GIFTED', note: 'Cortesía para vecinos', userId: vendedor.id, createdAt: today },
      { productId: products[2].id, qty: 2, reason: 'LOST', note: 'Conteo de inventario no cuadra', userId: admin.id, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    ],
  });

  // Expenses (gastos)
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

  // App Config
  await prisma.appConfig.createMany({
    data: [
      { key: 'whatsapp_number', value: '573001234567' },
      { key: 'whatsapp_message', value: 'Hola! Quiero hacer un pedido a Donde Salo!' },
      { key: 'business_name', value: 'Donde Salo!' },
      { key: 'business_logo_url', value: '' },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('Demo credentials:');
  console.log('  Admin:    admin@salo.co / admin123');
  console.log('  Vendedor: vendedor@salo.co / vendedor123');
  console.log('  Cocina:   cocina@salo.co / cocina123');
  console.log('');
  console.log('Phase 2 demo data:');
  console.log('  - 3 delivery zones (Puerto, Pradomar, Salgar)');
  console.log('  - 3 customers (2 with debt)');
  console.log('  - Credit history');
  console.log('  - 3 demo orders (2 paid + 1 delivery in progress)');
  console.log('  - 3 waste records');
  console.log('  - 6 expenses (3 daily + 3 monthly)');
  console.log('  - App config (WhatsApp, business name)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
