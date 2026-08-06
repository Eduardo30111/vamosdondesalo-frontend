import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database for Salo Store Puerto Colombia...');

  // Limpiar tablas principales
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

  // 1. Tienda de Comida: Donde Salo!
  const storeSalo = await prisma.store.create({
    data: {
      name: 'Donde Salo!',
      description: 'El auténtico sabor caribeño: fritos típicos, arepas de huevo y comidas rápidas en Puerto Colombia',
      whatsappNumber: '573001234567',
      category: 'COMIDA',
      plan: 'PRO',
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      commissionRate: 0.0,
      balance: 100000.0,
      ownerId: admin.id,
      logoUrl: '/puerto_gastronomia.jpg',
    },
  });

  // 2. Tienda de Artesanías: Artesanías Ventana al Mar
  const storeArtesanias = await prisma.store.create({
    data: {
      name: 'Artesanías Ventana al Mar',
      description: 'Souvenirs del Muelle, mochilas Wayuu, bisutería y recuerdos hechos a mano por artesanos locales',
      whatsappNumber: '573019876543',
      category: 'ARTESANIAS',
      plan: 'PRO',
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      commissionRate: 0.0,
      balance: 50000.0,
      ownerId: admin.id,
      logoUrl: '/puerto_artesanias.jpg',
    },
  });

  // 3. Tienda de Productos: Brisa & Sol Moda Playera
  const storeProductos = await prisma.store.create({
    data: {
      name: 'Brisa & Sol Moda Playera',
      description: 'Ropa playera, vestidos de baño, gafas de sol, calzado y accesorios veraniegos',
      whatsappNumber: '573024567890',
      category: 'PRODUCTOS',
      plan: 'FREE',
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      commissionRate: 0.0,
      balance: 0.0,
      ownerId: admin.id,
      logoUrl: '/puerto_faro.jpg',
    },
  });

  // 4. Tienda de Servicios: Puerto Colombia Surf & Tours
  const storeServicios = await prisma.store.create({
    data: {
      name: 'Puerto Colombia Surf & Tours',
      description: 'Clases de surf en Pradomar, paseos en lancha y recorridos turísticos guiados por el Muelle 1888',
      whatsappNumber: '573035678901',
      category: 'SERVICIOS',
      plan: 'PRO',
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      commissionRate: 0.0,
      balance: 80000.0,
      ownerId: admin.id,
      logoUrl: '/puerto_malecon.jpg',
    },
  });

  // 5. Tienda de Salud: Droguería & Salud Porteña
  const storeSalud = await prisma.store.create({
    data: {
      name: 'Droguería & Salud Porteña',
      description: 'Medicamentos, protectores solares, primeros auxilios y bienestar en el corazón de Puerto Colombia',
      whatsappNumber: '573046789012',
      category: 'SALUD',
      plan: 'FREE',
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      commissionRate: 0.0,
      balance: 0.0,
      ownerId: admin.id,
      logoUrl: '/logo.jpg',
    },
  });

  // Asociar usuarios al store principal
  await prisma.user.updateMany({
    where: { id: { in: [admin.id, vendedor.id, cocina.id] } },
    data: { storeId: storeSalo.id },
  });

  const supplier = await prisma.supplier.create({ data: { name: 'Distribuciones Caribe', phone: '3001234567' } });

  // Productos de Salo
  const saloProducts = [
    { name: 'Arepa de Huevo Especial', description: 'Arepa de huevo con carne molida y masa crocante', salePrice: 5000, costPrice: 2500, type: 'OWN' as const, preparationMode: 'VITRINA' as const, photoUrl: '/puerto_gastronomia.jpg', storeId: storeSalo.id },
    { name: 'Empanada de Carne Criolla', description: 'Empanada rellena de carne con sazón costeña', salePrice: 3000, costPrice: 1500, type: 'OWN' as const, preparationMode: 'VITRINA' as const, photoUrl: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=300', storeId: storeSalo.id },
    { name: 'Pescado Frito con Patacones', description: 'Mojarra dorada con arroz de coco, patacones y ensalada', salePrice: 25000, costPrice: 14000, type: 'OWN' as const, preparationMode: 'PREPARADO' as const, photoUrl: '/puerto_gastronomia.jpg', storeId: storeSalo.id },
    { name: 'Buñuelo Costeño', description: 'Buñuelo de queso recién frito', salePrice: 2000, costPrice: 800, type: 'OWN' as const, preparationMode: 'VITRINA' as const, photoUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300', storeId: storeSalo.id },
    { name: 'Dedos de Queso Caribe', description: 'Dedos hojaldrados de queso costeño', salePrice: 4500, costPrice: 2000, type: 'OWN' as const, preparationMode: 'VITRINA' as const, photoUrl: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=300', storeId: storeSalo.id },
  ];

  // Productos Artesanías
  const artesaniasProducts = [
    { name: 'Mochila Wayuu Tradicional', description: 'Tejida a mano con diseños geométricos caribeños', salePrice: 85000, costPrice: 50000, type: 'OWN' as const, preparationMode: 'VITRINA' as const, photoUrl: '/puerto_artesanias.jpg', storeId: storeArtesanias.id },
    { name: 'Sombrero Vueltiao Fino', description: 'Auténtico sombrero de caña flecha representativo de la costa', salePrice: 65000, costPrice: 40000, type: 'OWN' as const, preparationMode: 'VITRINA' as const, photoUrl: '/puerto_artesanias.jpg', storeId: storeArtesanias.id },
    { name: 'Miniatura Muelle de Puerto Colombia', description: 'Recuerdo decorativo en madera del histórico muelle', salePrice: 25000, costPrice: 12000, type: 'OWN' as const, preparationMode: 'VITRINA' as const, photoUrl: '/puerto_artesanias.jpg', storeId: storeArtesanias.id },
  ];

  // Productos Moda Playera
  const productosPlayera = [
    { name: 'Gafas de Sol Polarizadas UV400', description: 'Protección total para el sol caribeño con diseño moderno', salePrice: 35000, costPrice: 18000, type: 'OWN' as const, preparationMode: 'VITRINA' as const, photoUrl: '/puerto_malecon.jpg', storeId: storeProductos.id },
    { name: 'Salida de Baño Tropical', description: 'Tejido fresco y ligero ideal para caminar por el malecón', salePrice: 45000, costPrice: 24000, type: 'OWN' as const, preparationMode: 'VITRINA' as const, photoUrl: '/puerto_faro.jpg', storeId: storeProductos.id },
  ];

  // Servicios
  const serviciosProducts = [
    { name: 'Clase de Surf en Pradomar (2 Horas)', description: 'Incluye instructor certificado, tabla de surf y fotos de recuerdo', salePrice: 80000, costPrice: 30000, type: 'OWN' as const, preparationMode: 'PREPARADO' as const, photoUrl: '/puerto_malecon.jpg', storeId: storeServicios.id },
    { name: 'Tour Histórico Muelle 1888 & Faro', description: 'Recorrido guiado de 1.5h conociendo la historia de los inmigrantes', salePrice: 30000, costPrice: 10000, type: 'OWN' as const, preparationMode: 'PREPARADO' as const, photoUrl: '/puerto_faro.jpg', storeId: storeServicios.id },
  ];

  // Salud
  const saludProducts = [
    { name: 'Protector Solar SPF 50+ Resistente al Agua', description: 'Bloqueador dermatológico de alta duración para playa', salePrice: 42000, costPrice: 28000, type: 'OWN' as const, preparationMode: 'VITRINA' as const, photoUrl: '/puerto_faro.jpg', storeId: storeSalud.id },
    { name: 'Kit Primeros Auxilios & Hidratación', description: 'Suero oral, analgésicos, curas y gel de aloe vera refrescante', salePrice: 18000, costPrice: 10000, type: 'OWN' as const, preparationMode: 'VITRINA' as const, photoUrl: '/puerto_faro.jpg', storeId: storeSalud.id },
  ];

  const allSeedProducts = [
    ...saloProducts,
    ...artesaniasProducts,
    ...productosPlayera,
    ...serviciosProducts,
    ...saludProducts,
  ];

  const createdProducts = await Promise.all(
    allSeedProducts.map((p) =>
      prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          photoUrl: p.photoUrl,
          salePrice: p.salePrice,
          costPrice: p.costPrice,
          type: p.type,
          preparationMode: p.preparationMode,
          storeId: p.storeId,
        },
      }),
    ),
  );

  // Stock vitrina para productos VITRINA
  await Promise.all(
    createdProducts
      .filter((p) => p.preparationMode === 'VITRINA')
      .map((p) =>
        prisma.vitrinaStock.create({
          data: {
            productId: p.id,
            qty: 15,
          },
        }),
      ),
  );

  await Promise.all([
    prisma.table.create({ data: { number: 0, qrToken: 'recepcion-' + Date.now() } }),
    prisma.table.create({ data: { number: 1, qrToken: 'mesa-1-' + Date.now() } }),
    prisma.table.create({ data: { number: 2, qrToken: 'mesa-2-' + Date.now() } }),
  ]);

  await prisma.deliveryZone.createMany({
    data: [
      { name: 'Puerto Colombia Centro / Muelle', fee: 0, enabled: true },
      { name: 'Pradomar', fee: 0, enabled: true },
      { name: 'Salgar', fee: 0, enabled: true },
      { name: 'Barranquilla / Corredor Universitario', fee: 0, enabled: true },
    ],
  });

  await prisma.paymentMethodConfig.createMany({
    data: [
      { method: 'CASH', enabled: true, key: 'Efectivo en Tienda' },
      { method: 'NEQUI', enabled: true, qrUrl: '/puerto_faro.jpg', key: '3001234567' },
      { method: 'BANCOLOMBIA', enabled: true, key: 'Ahorros 123-456789-00' },
      { method: 'DAVIPLATA', enabled: true, key: '3001234567' },
    ],
  });

  await prisma.appConfig.createMany({
    data: [
      { key: 'business_name', value: 'Salo Store' },
      { key: 'business_logo_url', value: '/logo.jpg' },
      { key: 'business_color', value: '#F97316' },
      { key: 'whatsapp_number', value: '573001234567' },
      { key: 'whatsapp_message', value: '¡Hola! Quiero hacer un pedido a través de Salo Store Puerto Colombia' },
    ],
  });

  console.log('✅ Seed completado exitosamente para Salo Store Puerto Colombia!');
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
