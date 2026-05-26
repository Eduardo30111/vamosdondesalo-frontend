'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { Plus, Minus, Trash2, ShoppingCart, Bike, CreditCard, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string | null;
  salePrice: number;
  photoUrl: string | null;
  remaining?: number;
}

interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  photoUrl: string | null;
}

export default function DomicilioPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [search, setSearch] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    Promise.all([
      fetch(`${base}/public/products`).then((r) => r.json()),
      fetch(`${base}/public/delivery-zones`).then((r) => r.json()),
    ])
      .then(([prods, zns]) => {
        setProducts(prods);
        setZones(zns);
      })
      .catch(() => toast.error('Error cargando datos'))
      .finally(() => setLoading(false));
  }, []);

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { productId: p.id, name: p.name, price: p.salePrice, qty: 1, photoUrl: p.photoUrl }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, qty } : i)));
  };

  const getSubtotal = () => cart.reduce((s, i) => s + i.price * i.qty, 0);
  const getDeliveryFee = () => {
    const zone = zones.find((z) => z.id === selectedZone);
    return zone?.fee || 0;
  };
  const getTotal = () => getSubtotal() + getDeliveryFee();

  const handleOrder = async () => {
    if (!customerName.trim()) { toast.error('Ingresa tu nombre'); return; }
    if (!customerPhone.trim()) { toast.error('Ingresa tu teléfono'); return; }
    if (!customerAddress.trim()) { toast.error('Ingresa tu dirección'); return; }
    if (!selectedZone) { toast.error('Selecciona una zona'); return; }
    if (cart.length === 0) { toast.error('Agrega productos'); return; }

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${base}/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DELIVERY',
          customerName,
          customerPhone,
          customerAddress,
          deliveryZoneId: selectedZone,
          items: cart.map((i) => ({ productId: i.productId, qty: i.qty })),
        }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.message || 'Error creando pedido');
      toast.success(`Pedido creado! Código: ${order.trackingCode}`);
      router.push(`/seguir-pedido?code=${order.trackingCode}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-salo-orange text-white py-4 px-4 flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><Bike size={20} /> Domicilio</h1>
        <span className="text-sm">{cart.length} items</span>
      </header>

      <div className="max-w-6xl mx-auto p-4 flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 mb-4 outline-none focus:ring-2 focus:ring-salo-orange"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:shadow-md transition"
              >
                <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-gray-100 dark:bg-gray-700 relative">
                  {product.photoUrl ? (
                    <Image src={product.photoUrl} alt={product.name} fill className="object-cover" sizes="150px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Sin imagen</div>
                  )}
                </div>
                <p className="font-medium text-xs truncate">{product.name}</p>
                <p className="text-salo-orange font-bold text-sm">{formatCurrency(product.salePrice)}</p>
                {typeof product.remaining === 'number' && (
                  <p className="text-[10px] text-gray-400">Disponible: {product.remaining}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 space-y-4">
          <h2 className="font-bold flex items-center gap-2"><ShoppingCart size={18} /> Tu Pedido</h2>

          <div className="space-y-2">
            <input type="text" placeholder="Tu nombre" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
            <input type="tel" placeholder="Teléfono" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
            <input type="text" placeholder="Dirección completa" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
            <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm">
              <option value="">Seleccionar zona...</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name} (+{formatCurrency(z.fee)})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.price)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.productId, item.qty - 1)} className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center"><Minus size={14} /></button>
                  <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                  <button onClick={() => updateQty(item.productId, item.qty + 1)} className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center"><Plus size={14} /></button>
                  <button onClick={() => updateQty(item.productId, 0)} className="ml-1 text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {cart.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Agrega productos</p>}
          </div>

          {getDeliveryFee() > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Domicilio:</span>
              <span>+{formatCurrency(getDeliveryFee())}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="font-medium">Total:</span>
            <span className="text-xl font-bold text-salo-orange">{formatCurrency(getTotal())}</span>
          </div>

          <button onClick={handleOrder} disabled={cart.length === 0} className="w-full py-3 rounded-xl bg-salo-orange text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
            <CreditCard size={16} /> Confirmar Pedido <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
