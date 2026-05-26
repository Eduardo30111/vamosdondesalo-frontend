'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, Bike, Search, Clock } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  salePrice: number;
  photoUrl: string | null;
}

interface AppConfig {
  business_name: string;
  business_logo_url: string;
  business_color: string;
  whatsapp_number: string;
}

export default function LandingPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [trackingCode, setTrackingCode] = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/public/config`)
      .then((r) => r.json())
      .then(setConfig);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/public/products`)
      .then((r) => r.json())
      .then(setProducts);
  }, []);

  const bgColor = config?.business_color || '#F97316';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <header className="relative bg-gradient-to-br from-orange-500 to-red-600 text-white py-20 px-4 text-center" style={{ background: `linear-gradient(135deg, ${bgColor}, #c2410c)` }}>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4">{config?.business_name || 'Donde Salo!'}</h1>
        <p className="text-lg md:text-xl opacity-90 mb-8 max-w-lg mx-auto">Fritos criollos recién hechos. Pide a domicilio o escanea en la mesa.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/domicilio/nuevo" className="px-8 py-4 bg-white text-orange-600 rounded-2xl font-bold text-lg shadow-lg hover:scale-105 transition inline-flex items-center justify-center gap-2">
            <Bike size={20} /> Pedir Domicilio
          </Link>
          <a href={`https://wa.me/${config?.whatsapp_number || '573001234567'}`} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-green-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:scale-105 transition inline-flex items-center justify-center gap-2">
            <Phone size={20} /> WhatsApp
          </a>
        </div>
      </header>

      {/* Track Order */}
      <section className="py-8 px-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-md mx-auto flex gap-2">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Código de seguimiento (ej: SALO-ABCDE)"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <Link href={`/seguir-pedido?code=${encodeURIComponent(trackingCode)}`} className="px-6 py-3 bg-salo-orange text-white rounded-xl font-bold hover:opacity-90 transition flex items-center gap-2">
            <Clock size={18} /> Seguir
          </Link>
        </div>
      </section>

      {/* Product Showcase */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-10">Nuestros Productos</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.slice(0, 8).map((product) => (
            <div key={product.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-700 relative">
                {product.photoUrl ? (
                  <Image src={product.photoUrl} alt={product.name} fill className="object-cover" sizes="200px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Sin imagen</div>
                )}
              </div>
              <h3 className="font-bold text-sm truncate">{product.name}</h3>
              <p className="text-xs text-gray-500 line-clamp-2 mb-2">{product.description}</p>
              <p className="text-lg font-bold text-orange-500">${product.salePrice.toLocaleString('es-CO')}</p>
            </div>
          ))}
        </div>
        {products.length === 0 && (
          <p className="text-center text-gray-400 py-12">No hay productos disponibles hoy</p>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
          <MapPin size={16} /> Puerto Colombia, Colombia
        </div>
        <p className="text-sm text-gray-400">{config?.business_name || 'Donde Salo!'} {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
