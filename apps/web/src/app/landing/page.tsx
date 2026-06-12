'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

import { MapPin, Phone, Search, Clock, ShoppingCart, Plus, Minus, Trash2, X, ChevronLeft, ChevronRight, User, LayoutDashboard, ChefHat, ShoppingBag } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  salePrice: number;
  photoUrl: string | null;
  remaining?: number;
  preparationMode?: string;
}

interface AppConfig {
  business_name: string;
  business_logo_url: string;
  business_color: string;
  whatsapp_number: string;
  banners?: string[];
}

interface CartItem {
  product: Product;
  qty: number;
}

interface AuthUser {
  name: string;
  role: string;
}

export default function LandingPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [trackingCode, setTrackingCode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    address: '',
    zone: '',
  });
  const [deliveryZones, setDeliveryZones] = useState<Array<{ id: string; name: string; fee: number }>>([]);
  const [user, setUser] = useState<AuthUser | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    fetch(`${API_URL}/public/config`).then((r) => r.json()).then(setConfig);
    fetch(`${API_URL}/public/products`).then((r) => r.json()).then(setProducts);
    fetch(`${API_URL}/public/delivery-zones`).then((r) => r.json()).then(setDeliveryZones);
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
  }, [API_URL]);

  // Carrusel auto-play
  const banners = config?.banners?.length ? config.banners : [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&h=400&fit=crop',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&h=400&fit=crop',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&h=400&fit=crop',
  ];

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const nextBanner = useCallback(() => {
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevBanner = useCallback(() => {
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Cart functions
  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    const currentQty = existing ? existing.qty : 0;
    if (product.remaining !== undefined) {
      if (currentQty + 1 > product.remaining) {
        alert(`No hay suficiente stock en vitrina (Disponible: ${product.remaining})`);
        return;
      }
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
    setShowCart(true);
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.qty + delta;
            if (delta > 0 && item.product.remaining !== undefined) {
              if (nextQty > item.product.remaining) {
                alert(`No hay suficiente stock en vitrina (Disponible: ${item.product.remaining})`);
                return item;
              }
            }
            return { ...item, qty: Math.max(0, nextQty) };
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.salePrice * item.qty, 0);
  const deliveryFee = customerData.zone ? deliveryZones.find((z) => z.id === customerData.zone)?.fee || 0 : 0;
  const total = cartTotal + deliveryFee;
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleCheckout = async () => {
    if (!customerData.name || !customerData.phone || !customerData.address || !customerData.zone) {
      alert('Por favor completa todos los datos');
      return;
    }
    if (cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }
    // Validar stock para productos de vitrina
    for (const item of cart) {
      if (item.product.remaining !== undefined) {
        if (item.qty > item.product.remaining) {
          alert(`No hay suficiente stock de "${item.product.name}" en la vitrina (Disponible: ${item.product.remaining})`);
          return;
        }
      }
    }

    const zone = deliveryZones.find((z) => z.id === customerData.zone);

    try {
      const res = await fetch(`${API_URL}/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DELIVERY',
          customerName: customerData.name,
          customerPhone: customerData.phone,
          customerAddress: customerData.address,
          deliveryZoneId: customerData.zone,
          deliveryFee: zone?.fee || 0,
          items: cart.map((item) => ({
            productId: item.product.id,
            qty: item.qty,
            unitPrice: item.product.salePrice,
          })),
          total,
        }),
      });

      if (!res.ok) throw new Error('Error creando pedido');

      const order = await res.json();
      alert(`¡Pedido creado! Tu código de seguimiento es: ${order.trackingCode || 'SALO-XXXXX'}`);
      setCart([]);
      setShowCheckout(false);
      setShowCart(false);
      setCustomerData({ name: '', phone: '', address: '', zone: '' });
    } catch (err) {
      alert('Error al crear el pedido. Intenta de nuevo.');
    }
  };

  const bgColor = config?.business_color || '#F97316';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold" style={{ color: bgColor }}>
            {config?.business_name || 'Donde Salo!'}
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <ShoppingCart size={24} style={{ color: bgColor }} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
            
            {user ? (
              <div className="flex items-center gap-2">
                <Link 
                  href={user.role === 'ADMIN' ? '/admin' : user.role === 'VENDEDOR' ? '/pos' : '/cocina'}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-sm hover:opacity-90 transition"
                  style={{ backgroundColor: bgColor }}
                >
                  {user.role === 'ADMIN' && <LayoutDashboard size={16} />}
                  {user.role === 'VENDEDOR' && <ShoppingBag size={16} />}
                  {user.role === 'COCINA' && <ChefHat size={16} />}
                  {user.role === 'ADMIN' && 'Panel Admin'}
                  {user.role === 'VENDEDOR' && 'POS Vendedor'}
                  {user.role === 'COCINA' && 'Cocina'}
                </Link>
              </div>
            ) : (
              <Link href="/login" className="px-4 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:opacity-90 transition">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Banner Carrusel */}
      <div className="relative w-full h-48 md:h-72 lg:h-96 overflow-hidden">
        {banners.map((banner, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ${i === currentBanner ? 'opacity-100' : 'opacity-0'}`}
          >
            <img
              src={banner}
              alt={`Banner ${i + 1}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ))}
        {banners.length > 1 && (
          <>
            <button
              onClick={prevBanner}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-black/50 rounded-full flex items-center justify-center hover:bg-white transition"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextBanner}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-black/50 rounded-full flex items-center justify-center hover:bg-white transition"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentBanner(i)}
                  className={`w-2 h-2 rounded-full transition ${i === currentBanner ? 'bg-white w-6' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Track Order */}
      <section className="py-6 px-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
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
          <Link href={`/seguir-pedido?code=${encodeURIComponent(trackingCode)}`} className="px-6 py-3 text-white rounded-xl font-bold hover:opacity-90 transition flex items-center gap-2" style={{ backgroundColor: bgColor }}>
            <Clock size={18} /> Seguir
          </Link>
        </div>
      </section>

      {/* Product Showcase */}
      <section className="py-12 px-4 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Nuestros Productos</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div key={product.id} className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
              <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-700 relative">
                {product.photoUrl ? (
                  <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Sin imagen</div>
                )}
              </div>
              <h3 className="font-bold text-sm truncate">{product.name}</h3>
              <p className="text-xs text-gray-500 line-clamp-2 mb-2 flex-1">{product.description}</p>
              <div className="flex items-center justify-between mt-auto">
                <p className="text-lg font-bold" style={{ color: bgColor }}>${product.salePrice.toLocaleString('es-CO')}</p>
                <button
                  onClick={() => addToCart(product)}
                  className="p-2 rounded-xl text-white hover:opacity-90 transition"
                  style={{ backgroundColor: bgColor }}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {products.length === 0 && (
          <p className="text-center text-gray-400 py-12">No hay productos disponibles hoy</p>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <a href={`https://wa.me/${config?.whatsapp_number || '573001234567'}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-green-500 text-white rounded-full hover:scale-110 transition">
            <Phone size={20} />
          </a>
        </div>
        <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
          <MapPin size={16} /> Puerto Colombia, Colombia
        </div>
        <p className="text-sm text-gray-400">{config?.business_name || 'Donde Salo!'} {new Date().getFullYear()}</p>
      </footer>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 h-full shadow-2xl flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold">Tu Pedido</h2>
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 py-8">El carrito está vacío</p>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex gap-3 bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                    <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-600 relative overflow-hidden flex-shrink-0">
                      {item.product.photoUrl ? (
                        <img src={item.product.photoUrl} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Sin img</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{item.product.name}</h4>
                      <p className="text-sm" style={{ color: bgColor }}>${item.product.salePrice.toLocaleString('es-CO')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => updateQty(item.product.id, -1)} className="p-1 rounded bg-gray-200 dark:bg-gray-600">
                          <Minus size={14} />
                        </button>
                        <span className="font-bold w-6 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.product.id, 1)} className="p-1 rounded bg-gray-200 dark:bg-gray-600">
                          <Plus size={14} />
                        </button>
                        <button onClick={() => removeFromCart(item.product.id)} className="p-1 rounded text-red-500 ml-auto">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t dark:border-gray-700 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span className="font-bold">${cartTotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span style={{ color: bgColor }}>${cartTotal.toLocaleString('es-CO')}</span>
                </div>
                <button
                  onClick={() => { setShowCart(false); setShowCheckout(true); }}
                  className="w-full py-3 text-white rounded-xl font-bold hover:opacity-90 transition"
                  style={{ backgroundColor: bgColor }}
                >
                  Continuar →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCheckout(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold">Completa tu pedido</h2>
              <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Order summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 space-y-2">
                <h3 className="font-bold text-sm">Resumen</h3>
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span>{item.qty}x {item.product.name}</span>
                    <span>${(item.product.salePrice * item.qty).toLocaleString('es-CO')}</span>
                  </div>
                ))}
                <div className="border-t dark:border-gray-600 pt-2 flex justify-between font-bold">
                  <span>Subtotal</span>
                  <span>${cartTotal.toLocaleString('es-CO')}</span>
                </div>
              </div>

              {/* Customer form */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm">Tus datos</h3>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-orange-400"
                />
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-orange-400"
                />
                <input
                  type="text"
                  placeholder="Dirección completa"
                  value={customerData.address}
                  onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-orange-400"
                />
                <select
                  value={customerData.zone}
                  onChange={(e) => setCustomerData({ ...customerData, zone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Selecciona zona de domicilio</option>
                  {deliveryZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} — ${zone.fee.toLocaleString('es-CO')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Total with delivery */}
              {customerData.zone && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal productos</span>
                    <span>${cartTotal.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Domicilio</span>
                    <span>${deliveryFee.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="border-t dark:border-gray-600 pt-2 flex justify-between text-lg font-bold">
                    <span>Total a pagar</span>
                    <span style={{ color: bgColor }}>${total.toLocaleString('es-CO')}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleCheckout}
                className="w-full py-3 text-white rounded-xl font-bold hover:opacity-90 transition"
                style={{ backgroundColor: bgColor }}
              >
                Confirmar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
