import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Limpiar tablas principales (sin dependencias circulares destructivas)
  try {
    // @ts-ignore
    await prisma.user.updateMany({ data: { storeId: null } });
  } catch { /* ignore */ }

  const tablas = [
    'payment', 'orderItem', 'order', 'productionOrder', 'vitrinaStock', 'product', 'table',
    'deliveryZone', 'user', 'store', 'supplier', 'paymentMethodConfig', 'appConfig',
  ];
  for (const t of tablas) {
    try {
      // @ts-ignore
      await prisma[t].deleteMany();
    } catch { /* ignore */ }
  }

  const hash = async (pw: string) => bcrypt.hash(pw, 10);

  const [admin, vendedor, cocina] = await Promise.all([
    prisma.user.create({ data: { name: 'Admin Salo', email: 'admin@salo.co', passwordHash: await hash('admin123'), role: 'ADMIN' } }),
    prisma.user.create({ data: { name: 'Vendedor María', email: 'vendedor@salo.co', passwordHash: await hash('vendedor123'), role: 'VENDEDOR' } }),
    prisma.user.create({ data: { name: 'Cocina Carlos', email: 'cocina@salo.co', passwordHash: await hash('cocina123'), role: 'COCINA' } }),
  ]);

  // Crear la tienda default "Donde Salo!" y asociarla al admin como propietario
  const store = await prisma.store.create({
    data: {
      name: 'Donde Salo!',
      description: 'El templo de los fritos y la comida rápida',
      whatsappNumber: '573001234567',
      category: 'RESTAURANT',
      plan: 'PRO',
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
      commissionRate: 0.0,
      balance: 100000.0, // Saldo inicial
      ownerId: admin.id,
    },
  });

  // Asociar los usuarios operativos de "Donde Salo!" a su respectiva tienda
  await prisma.user.updateMany({
    where: { id: { in: [admin.id, vendedor.id, cocina.id] } },
    data: { storeId: store.id },
  });

  const supplier = await prisma.supplier.create({ data: { name: 'Coca Cola Colombia', phone: '3001234567' } });

  type SeedProd = { name: string; description: string; salePrice: number; costPrice: number; type: 'OWN' | 'SUPPLIER'; preparationMode: 'VITRINA' | 'PREPARADO'; supplierId?: string; photoUrl: string };

  const productSeeds: SeedProd[] = [
    { name: 'Empanada de Carne', description: 'Empanada criolla de carne molida', salePrice: 3000, costPrice: 1500, type: 'OWN', preparationMode: 'VITRINA', photoUrl: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=300' },
    { name: 'Arepa de Huevo', description: 'Arepa frita con huevo adentro', salePrice: 5000, costPrice: 2500, type: 'OWN', preparationMode: 'VITRINA', photoUrl: 'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=300' },
    { name: 'Buñuelo', description: 'Buñuelo de queso recién hecho', salePrice: 2000, costPrice: 800, type: 'OWN', preparationMode: 'VITRINA', photoUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300' },
    { name: 'Dedos de Queso', description: 'Palitos de queso crocantes', salePrice: 4500, costPrice: 2000, type: 'OWN', preparationMode: 'VITRINA', photoUrl: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=300' },
    { name: 'Papa Rellena', description: 'Papa rellena de carne con hogao', salePrice: 4000, costPrice: 2000, type: 'OWN', preparationMode: 'VITRINA', photoUrl: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=300' },
    { name: 'Hamburguesa Especial', description: 'Carne 150g con queso, tocineta y verduras', salePrice: 12000, costPrice: 6000, type: 'OWN', preparationMode: 'PREPARADO', photoUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300' },
    { name: 'Perro Caliente', description: 'Salchicha americana con papa ripio y salsas', salePrice: 8000, costPrice: 3500, type: 'OWN', preparationMode: 'PREPARADO', photoUrl: 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=300' },
    { name: 'Coca Cola Personal', description: 'Gaseosa Coca Cola 350ml', salePrice: 3000, costPrice: 1800, type: 'SUPPLIER', preparationMode: 'VITRINA', supplierId: supplier.id, photoUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300' },
  ];

  const products = await Promise.all(
    productSeeds.map((p) =>
      prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          photoUrl: p.photoUrl,
          salePrice: p.salePrice,
          costPrice: p.costPrice,
          type: p.type,
          preparationMode: p.preparationMode,
          supplier: p.supplierId ? { connect: { id: p.supplierId } } : undefined,
          store: { connect: { id: store.id } },
        },
      }),
    ),
  );

  // Crear stock vitrina para productos VITRINA
  const vitrinaInitial: Record<string, number> = {
    'Empanada de Carne': 15,
    'Arepa de Huevo': 10,
    'Buñuelo': 20,
    'Dedos de Queso': 12,
    'Papa Rellena': 8,
    'Coca Cola Personal': 30,
  };

  await Promise.all(
    products
      .filter((p) => p.preparationMode === 'VITRINA')
      .map((p) =>
        prisma.vitrinaStock.create({
          data: {
            productId: p.id,
            qty: vitrinaInitial[p.name] ?? 10,
          },
        }),
      ),
  );

  await Promise.all([
    prisma.table.create({ data: { number: 1, qrToken: 'mesa-1-' + Date.now() } }),
    prisma.table.create({ data: { number: 2, qrToken: 'mesa-2-' + Date.now() } }),
  ]);

  await prisma.deliveryZone.createMany({
    data: [
      { name: 'Puerto Colombia', fee: 2500, enabled: true },
      { name: 'Pradomar', fee: 3000, enabled: true },
      { name: 'Salgar', fee: 5000, enabled: true },
      { name: 'Barranquilla', fee: 8000, enabled: true },
    ],
  });

  await prisma.paymentMethodConfig.createMany({
    data: [
      { method: 'CASH', enabled: true, key: 'Efectivo' },
      { method: 'NEQUI', enabled: true, qrUrl: 'https://via.placeholder.com/300x300?text=QR+Nequi', key: '3001234567' },
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

  console.log('✅ Seed completado exitosamente!');
  console.log('');
  console.log('Credenciales:');
  console.log('  Admin:    admin@salo.co / admin123');
  console.log('  Vendedor: vendedor@salo.co / vendedor123');
  console.log('  Cocina:   cocina@salo.co / cocina123');
}

main()
  .catch((e) => {
    console.error('❌ Seed falló:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
