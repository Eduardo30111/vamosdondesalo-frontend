'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatErrorMessage } from '@/lib/error-handler';

import {
  MapPin,
  Phone,
  Search,
  Clock,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  LayoutDashboard,
  ChefHat,
  ShoppingBag,
  ArrowLeft,
  CheckCircle,
  Store as StoreIcon,
  HelpCircle
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  salePrice: number;
  photoUrl: string | null;
  remaining?: number;
  preparationMode?: string;
  storeId: string | null;
  store?: Store | null;
}

interface AppConfig {
  business_name: string;
  business_logo_url: string;
  business_color: string;
  whatsapp_number: string;
  delivery_fee_puerto?: string;
  delivery_fee_pradomar?: string;
  delivery_fee_salgar?: string;
  delivery_fee_barranquilla?: string;
}

interface Store {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  whatsappNumber: string;
  category: string;
  active: boolean;
  plan?: 'FREE' | 'PRO';
  customTheme?: string | null;
  customDomain?: string | null;
  promoMedia?: string | null;
  deliveryFeePuerto?: number;
  deliveryFeePradomar?: number;
  deliveryFeeSalgar?: number;
  deliveryFeeBarranquilla?: number;
}

interface CartItem {
  product: Product;
  qty: number;
}

interface AuthUser {
  name: string;
  role: string;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  NEQUI: 'Nequi',
  BANCOLOMBIA: 'Bancolombia',
  DAVIPLATA: 'Daviplata',
  TRANSFER: 'Transferencia',
  BREB: 'Breb',
};

export default function LandingPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [trackingCode, setTrackingCode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([{ method: 'CASH', enabled: true }]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('CASH');
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    address: '',
    zone: '',
    doc: '',
    nacional: false,
  });
  const [deliveryZones, setDeliveryZones] = useState<Array<{ id: string; name: string; fee: number }>>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [searchStoreQuery, setSearchStoreQuery] = useState('');
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [checkoutSuccessOrders, setCheckoutSuccessOrders] = useState<Array<{ trackingCode: string; storeName: string; whatsappUrl: string }>>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // States for 3D Photo Tilt Effect
  const [tiltCoords, setTiltCoords] = useState({ x: 0, y: 0 });
  const [hoveredPhotoIdx, setHoveredPhotoIdx] = useState<number | null>(null);

  const handlePhotoMouseMove = (e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setTiltCoords({ x, y });
    setHoveredPhotoIdx(idx);
  };

  const handlePhotoMouseLeave = () => {
    setTiltCoords({ x: 0, y: 0 });
    setHoveredPhotoIdx(null);
  };

  useEffect(() => {
    setCurrentPromoIndex(0);
  }, [selectedStore]);

  let promoMediaItems: Array<{ url: string; type: 'IMAGE' | 'VIDEO'; publicId: string }> = [];
  if (selectedStore?.promoMedia) {
    try {
      promoMediaItems = JSON.parse(selectedStore.promoMedia);
    } catch (e) {
      console.error('Error parsing promoMedia:', e);
    }
  }

  const promoMediaSerialized = selectedStore?.promoMedia || '';
  useEffect(() => {
    if (selectedStore?.plan !== 'PRO' || promoMediaItems.length <= 1) return;
    
    const currentItem = promoMediaItems[currentPromoIndex];
    if (currentItem?.type === 'VIDEO') return;

    const interval = setInterval(() => {
      setCurrentPromoIndex((prev) => (prev + 1) % promoMediaItems.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedStore, currentPromoIndex, promoMediaSerialized, promoMediaItems.length]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    // Load config
    fetch(`${API_URL}/public/config`)
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          setConfig(data);
        } else {
          console.error('Expected config object, got:', data);
        }
      })
      .catch((e) => console.error('Error fetching config:', e));

    // Load products
    fetch(`${API_URL}/public/products`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.error('Expected array of products, got:', data);
          setProducts([]);
        }
      })
      .catch((e) => {
        console.error('Error fetching products:', e);
        setProducts([]);
      });

    // Load stores
    fetch(`${API_URL}/stores`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStores(data);
        } else {
          console.error('Expected array of stores, got:', data);
          setStores([]);
        }
      })
      .catch((e) => {
        console.error('Error fetching stores:', e);
        setStores([]);
      });

    // Load delivery zones
    fetch(`${API_URL}/public/delivery-zones`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDeliveryZones(data);
        } else {
          console.error('Expected array of delivery zones, got:', data);
          setDeliveryZones([]);
        }
      })
      .catch((e) => {
        console.error('Error fetching delivery zones:', e);
        setDeliveryZones([]);
      });

    // Load payment methods
    fetch(`${API_URL}/public/payment-methods`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPaymentMethods(data);
        } else {
          setPaymentMethods([{ method: 'CASH', enabled: true }]);
        }
      })
      .catch((e) => {
        console.error('Error fetching payment methods:', e);
        setPaymentMethods([{ method: 'CASH', enabled: true }]);
      });
    
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
    toast.success(`${product.name} agregado al pedido`, { duration: 1500 });
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

  // Group cart items by store
  const getGroupedCart = useCallback(() => {
    return cart.reduce<Record<string, { store: Store | { id: string; name: string; whatsappNumber: string; logoUrl: string | null; category: string }; items: CartItem[] }>>((acc, item) => {
      const storeVal = item.product.store || {
        id: 'legacy-salo',
        name: config?.business_name || 'Donde Salo!',
        whatsappNumber: config?.whatsapp_number || '573001234567',
        logoUrl: config?.business_logo_url || null,
        category: 'RESTAURANT',
      };
      const storeId = storeVal.id;
      if (!acc[storeId]) {
        acc[storeId] = { store: storeVal as any, items: [] };
      }
      acc[storeId].items.push(item);
      return acc;
    }, {});
  }, [cart, config]);

  const getStoreDeliveryFee = useCallback((storeSubtotal: number, store?: any) => {
    if (customerData.nacional) return 0;
    if (!customerData.zone) return 0;
    const deliveryZonesArray = Array.isArray(deliveryZones) ? deliveryZones : [];
    const zone = deliveryZonesArray.find((z) => z.id === customerData.zone);
    if (!zone) return 0;
    
    const zoneNameClean = zone.name.toLowerCase().trim();

    // Determine the fee based on zone for the specific store
    let baseFee = zone.fee;
    const isLegacyOrSalo = !store || store.id === 'legacy-salo' || store.name === 'Donde Salo!';

    if (isLegacyOrSalo) {
      // Use global config fees for the official store
      if (zoneNameClean.includes('puerto')) {
        baseFee = parseFloat(config?.delivery_fee_puerto || '') || zone.fee;
      } else if (zoneNameClean.includes('pradomar')) {
        baseFee = parseFloat(config?.delivery_fee_pradomar || '') || zone.fee;
      } else if (zoneNameClean.includes('salgar')) {
        baseFee = parseFloat(config?.delivery_fee_salgar || '') || zone.fee;
      } else if (zoneNameClean.includes('barranquilla')) {
        baseFee = parseFloat(config?.delivery_fee_barranquilla || '') || zone.fee;
      }
    } else {
      // Use store-specific delivery fees for independent stores
      if (zoneNameClean.includes('puerto')) {
        baseFee = store.deliveryFeePuerto ?? zone.fee;
      } else if (zoneNameClean.includes('pradomar')) {
        baseFee = store.deliveryFeePradomar ?? zone.fee;
      } else if (zoneNameClean.includes('salgar')) {
        baseFee = store.deliveryFeeSalgar ?? zone.fee;
      } else if (zoneNameClean.includes('barranquilla')) {
        baseFee = store.deliveryFeeBarranquilla ?? zone.fee;
      }
    }
    
    // Free delivery thresholds
    if (zoneNameClean.includes('puerto colombia') || zoneNameClean.includes('puerto col') || zoneNameClean.includes('pradomar')) {
      if (storeSubtotal > 10000) {
        return 0;
      }
    } else if (zoneNameClean.includes('salgar')) {
      if (storeSubtotal >= 18000) {
        return 0;
      }
    }
    return baseFee;
  }, [customerData.zone, customerData.nacional, deliveryZones, config]);

  // Totals calculations
  const groupedCart = getGroupedCart();
  const storeTotals = Object.keys(groupedCart).map((storeId) => {
    const group = groupedCart[storeId];
    const subtotal = group.items.reduce((sum, item) => sum + item.product.salePrice * item.qty, 0);
    const deliveryFee = getStoreDeliveryFee(subtotal, group.store);
    return {
      storeId,
      storeName: group.store.name,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
    };
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.product.salePrice * item.qty, 0);
  const totalDeliveryFee = storeTotals.reduce((sum, t) => sum + t.deliveryFee, 0);
  const grandTotal = cartTotal + totalDeliveryFee;
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleCheckout = async () => {
    if (checkoutLoading) return;
    if (!customerData.name || !customerData.phone || !customerData.address || (!customerData.nacional && !customerData.zone)) {
      alert('Por favor completa todos los datos');
      return;
    }
    if (cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    // Validate vitrina stock
    for (const item of cart) {
      if (item.product.remaining !== undefined) {
        if (item.qty > item.product.remaining) {
          alert(`No hay suficiente stock de "${item.product.name}" (Disponible: ${item.product.remaining})`);
          return;
        }
      }
    }

    setCheckoutLoading(true);
    try {
      const createdOrders: Array<{ trackingCode: string; storeName: string; whatsappUrl: string }> = [];
      const keys = Object.keys(groupedCart);
      
      setCheckoutSuccessOrders([]);

      for (const storeId of keys) {
        const group = groupedCart[storeId];
        const storeSubtotal = group.items.reduce((sum, item) => sum + item.product.salePrice * item.qty, 0);
        const storeDeliveryFee = getStoreDeliveryFee(storeSubtotal, group.store);
        
        const payload = {
          type: 'DELIVERY',
          customerName: customerData.name,
          customerPhone: customerData.phone,
          customerAddress: customerData.address + (customerData.nacional ? ' (ENVÍO NACIONAL - Cuadrar por WhatsApp)' : ''),
          customerDoc: customerData.doc || undefined,
          deliveryZoneId: customerData.nacional ? undefined : customerData.zone,
          deliveryFee: storeDeliveryFee,
          items: group.items.map((item) => ({
            productId: item.product.id,
            qty: item.qty,
            unitPrice: item.product.salePrice,
          })),
          total: storeSubtotal + storeDeliveryFee,
          storeId: storeId === 'legacy-salo' ? undefined : storeId,
          notes: `Método de pago: ${METHOD_LABELS[selectedPaymentMethod] || selectedPaymentMethod}`,
        };

        try {
          const res = await fetch(`${API_URL}/public/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.message || `Error en tienda ${group.store.name}`);
          }
          const order = await res.json();
          
          // Construct WhatsApp URL
          const message = encodeURIComponent(
            `*Vamos Donde Salo - Pedido Confirmado*\n\n` +
            `*Código:* ${order.trackingCode || 'N/A'}\n` +
            `*Tienda:* ${group.store.name}\n` +
            `*Cliente:* ${customerData.name}\n` +
            `*Teléfono:* ${customerData.phone}\n` +
            `*Dirección:* ${customerData.address}${customerData.nacional ? ' (Envío Nacional)' : ''}\n\n` +
            `*Método de Pago:* ${METHOD_LABELS[selectedPaymentMethod] || selectedPaymentMethod}\n\n` +
            `*Productos:*\n` +
            group.items.map((it) => `- ${it.qty}x ${it.product.name} ($${it.product.salePrice.toLocaleString('es-CO')})`).join('\n') + `\n\n` +
            `*Subtotal:* $${storeSubtotal.toLocaleString('es-CO')}\n` +
            `*Domicilio:* ${customerData.nacional ? 'Envío Nacional (A convenir por WhatsApp)' : `$${storeDeliveryFee.toLocaleString('es-CO')}`}\n` +
            `*Total:* $${(storeSubtotal + storeDeliveryFee).toLocaleString('es-CO')}\n\n` +
            `Por favor, confirma mi pedido. ¡Muchas gracias!`
          );
          const rawPhone = group.store.whatsappNumber.replace('+', '').replace(/\s+/g, '').trim();
          const whatsappUrl = `https://wa.me/${rawPhone}?text=${message}`;

          createdOrders.push({
            trackingCode: order.trackingCode || 'SALO-XXXXX',
            storeName: group.store.name,
            whatsappUrl,
          });
        } catch (err) {
          console.error(err);
          toast.error(formatErrorMessage(err, `Problema registrando el pedido en ${group.store.name}`));
          return;
        }
      }

      if (createdOrders.length > 0) {
        setCheckoutSuccessOrders(createdOrders);
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  const bgColor = (selectedStore && selectedStore.plan === 'PRO' && selectedStore.customTheme)
    ? selectedStore.customTheme
    : (config?.business_color || '#F97316');

  // Filter stores
  const storesArray = Array.isArray(stores) ? stores : [];
  const productsArray = Array.isArray(products) ? products : [];
  const deliveryZonesArray = Array.isArray(deliveryZones) ? deliveryZones : [];

  const defaultStore = storesArray.find((s) => s && s.name && s.name.toLowerCase().includes('donde salo'));
  const otherStores = storesArray.filter((s) => s && s.active && s.name && !s.name.toLowerCase().includes('donde salo'));

  const filteredStores = otherStores.filter((s) => {
    const matchesCategory = selectedCategory === 'TODOS' || s.category === selectedCategory;
    const matchesSearch = (s.name && s.name.toLowerCase().includes(searchStoreQuery.toLowerCase())) || 
                          (s.description && s.description.toLowerCase().includes(searchStoreQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Filter products for the selected store
  const storeProducts = productsArray.filter((p) => {
    if (!selectedStore) return true;
    const isDefaultSelected = selectedStore.name && (selectedStore.name.toLowerCase().includes('donde salo') || selectedStore.id === 'legacy-salo');
    if (isDefaultSelected) {
      return !p.storeId || p.storeId === selectedStore.id || (defaultStore && p.storeId === defaultStore.id);
    }
    return p.storeId === selectedStore.id;
  }).filter((p) => {
    const matchesSearch = (p.name && p.name.toLowerCase().includes(searchProductQuery.toLowerCase())) || 
                          (p.description && p.description.toLowerCase().includes(searchProductQuery.toLowerCase()));
    return matchesSearch;
  });

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'RESTAURANT': return 'Comida / Restaurantes';
      case 'SALUD': return 'Salud';
      case 'TIENDA': return 'Tiendas';
      case 'COMPRA_VENTA': return 'Compra y Venta';
      default: return category;
    }
  };

  return (
    <div className="relative overflow-hidden min-h-screen bg-[#FFF8F0] dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col font-sans transition-colors duration-300">

      {/* Header */}
      <header className="relative z-40 sticky top-0 bg-white/80 dark:bg-gray-850/80 backdrop-blur-md shadow-xs border-b border-gray-100 dark:border-gray-800 transition">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <button onClick={() => setSelectedStore(null)} className="flex items-center gap-2.5 text-xl font-bold" style={{ color: bgColor }}>
            <img
              src="/logo.jpg"
              alt="Logo Vamos Donde Salo"
              className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-700 shadow-sm"
            />
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">{config?.business_name || 'Vamos Donde Salo'}</span>
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <ShoppingCart size={22} style={{ color: bgColor }} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>
            
            {user ? (
              <div className="flex items-center gap-2">
                <Link 
                  href={
                    user.role === 'ADMIN' 
                      ? '/admin' 
                      : user.role === 'MERCHANT' 
                      ? '/merchant' 
                      : user.role === 'VENDEDOR' || user.role === 'MERCHANT_STAFF'
                      ? '/pos' 
                      : '/cocina'
                  }
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-sm hover:opacity-90 shadow-sm transition"
                  style={{ backgroundColor: bgColor }}
                >
                  {user.role === 'ADMIN' && <LayoutDashboard size={15} />}
                  {user.role === 'MERCHANT' && <StoreIcon size={15} />}
                  {(user.role === 'VENDEDOR' || user.role === 'MERCHANT_STAFF') && <ShoppingBag size={15} />}
                  {user.role === 'COCINA' && <ChefHat size={15} />}
                  {user.role === 'ADMIN' && 'Panel Admin'}
                  {user.role === 'MERCHANT' && 'Mi Tienda'}
                  {(user.role === 'VENDEDOR' || user.role === 'MERCHANT_STAFF') && 'Ventas POS'}
                  {user.role === 'COCINA' && 'Cocina'}
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/register-merchant" className="text-sm font-semibold hover:opacity-85 text-gray-600 dark:text-gray-300">
                  Soy Comerciante
                </Link>
                <Link href="/login" className="px-4 py-2 bg-gray-950 dark:bg-gray-100 dark:text-gray-900 text-white rounded-xl font-bold text-sm hover:opacity-90 transition">
                  Entrar
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow relative z-10">
        {!selectedStore ? (
          // Marketplace View
          <div>
            {/* Hero Section */}
            <section className="relative overflow-hidden py-12 md:py-20 px-4 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border-b border-gray-100 dark:border-gray-800">
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6 text-center lg:text-left">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                    <StoreIcon size={12} /> Portal Marketplace Local
                  </span>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
                    Tus productos favoritos <br/>
                    <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">de la manera más rápida</span>
                  </h1>
                  <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0 font-medium">
                    Explora y compra de forma rápida y sencilla en todos los comercios locales de Puerto Colombia y Salgar. Elige productos frescos, fritos tradicionales y más, todo con entrega a domicilio directa y pago contra entrega.
                  </p>

                  {/* Track Order Input */}
                  <div className="max-w-md mx-auto lg:mx-0 flex gap-2 pt-2">
                    <div className="flex-1 relative">
                      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Seguimiento (ej: SALO-ABCDE)"
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-orange-400 shadow-xs text-sm transition focus:shadow-md"
                      />
                    </div>
                    <Link 
                      href={`/seguir-pedido?code=${encodeURIComponent(trackingCode)}`} 
                      className="px-5 py-3 text-white rounded-2xl font-bold hover:opacity-95 shadow-md transition flex items-center gap-2 text-sm shrink-0" 
                      style={{ backgroundColor: bgColor }}
                    >
                      <Clock size={16} /> Seguir
                    </Link>
                  </div>
                </div>

                {/* Staggered dynamic tilt photos */}
                <div className="relative h-[340px] md:h-[420px] w-full flex items-center justify-center">
                  {/* Beach photo 1 */}
                  <div
                    onMouseMove={(e) => handlePhotoMouseMove(e, 0)}
                    onMouseLeave={handlePhotoMouseLeave}
                    className="absolute left-[5%] top-[10%] w-[50%] aspect-video md:w-[48%] rounded-2xl overflow-hidden shadow-lg border border-white/40 dark:border-gray-700/40 cursor-pointer select-none z-10 bg-gray-200 dark:bg-gray-800"
                    style={{
                      transform: hoveredPhotoIdx === 0
                        ? `perspective(1000px) rotateX(${-tiltCoords.y * 12}deg) rotateY(${tiltCoords.x * 12}deg) scale3d(1.06, 1.06, 1.06) translateZ(15px) rotate(-6deg)`
                        : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0) rotate(-6deg)',
                      transition: hoveredPhotoIdx === 0 ? 'none' : 'transform 0.4s ease-out',
                    }}
                  >
                    <img src="/hero_beach1.jpg" alt="Playas de Puerto Colombia" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-xs py-2 px-3 text-white text-[11px] font-bold text-center truncate">
                      Playas de Puerto Colombia
                    </div>
                  </div>

                  {/* Beach photo 2 */}
                  <div
                    onMouseMove={(e) => handlePhotoMouseMove(e, 1)}
                    onMouseLeave={handlePhotoMouseLeave}
                    className="absolute right-[5%] top-[5%] w-[55%] aspect-video md:w-[52%] rounded-2xl overflow-hidden shadow-xl border border-white/40 dark:border-gray-700/40 cursor-pointer select-none z-20 bg-gray-200 dark:bg-gray-800"
                    style={{
                      transform: hoveredPhotoIdx === 1
                        ? `perspective(1000px) rotateX(${-tiltCoords.y * 12}deg) rotateY(${tiltCoords.x * 12}deg) scale3d(1.06, 1.06, 1.06) translateZ(15px) rotate(3deg)`
                        : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0) rotate(3deg)',
                      transition: hoveredPhotoIdx === 1 ? 'none' : 'transform 0.4s ease-out',
                    }}
                  >
                    <img src="/hero_beach2.jpg" alt="Plaza de Puerto Colombia" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-xs py-2 px-3 text-white text-[11px] font-bold text-center truncate">
                      Plaza de Puerto Colombia
                    </div>
                  </div>

                  {/* Beach photo 3 */}
                  <div
                    onMouseMove={(e) => handlePhotoMouseMove(e, 2)}
                    onMouseLeave={handlePhotoMouseLeave}
                    className="absolute left-[20%] bottom-[8%] w-[52%] aspect-video md:w-[48%] rounded-2xl overflow-hidden shadow-md border border-white/40 dark:border-gray-700/40 cursor-pointer select-none z-30 bg-gray-200 dark:bg-gray-800"
                    style={{
                      transform: hoveredPhotoIdx === 2
                        ? `perspective(1000px) rotateX(${-tiltCoords.y * 12}deg) rotateY(${tiltCoords.x * 12}deg) scale3d(1.06, 1.06, 1.06) translateZ(15px) rotate(-2deg)`
                        : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0) rotate(-2deg)',
                      transition: hoveredPhotoIdx === 2 ? 'none' : 'transform 0.4s ease-out',
                    }}
                  >
                    <img src="/hero_beach3.jpg" alt="Malecón de Puerto Colombia" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-xs py-2 px-3 text-white text-[11px] font-bold text-center truncate">
                      Malecón de Puerto Colombia
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Showcase Fritos Donde Salo! */}
            {defaultStore && (
              <section className="py-12 px-4 max-w-6xl mx-auto space-y-8 relative z-10">
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-2xl transition duration-300 relative overflow-hidden">
                  <div className="space-y-3 text-center md:text-left relative z-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white uppercase tracking-wider">
                      ★ Tienda Original Destacada
                    </div>
                    <h2 className="text-3xl font-black">{defaultStore.name}</h2>
                    <p className="text-white/95 text-sm md:text-base max-w-xl leading-relaxed">
                      {defaultStore.description || 'El templo de los mejores fritos y comida rápida. Arepas de huevo, empanadas, hamburguesas y más.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedStore({
                      ...defaultStore,
                      id: defaultStore.id || 'legacy-salo'
                    })}
                    className="px-6 py-4 bg-white text-orange-600 font-extrabold rounded-2xl hover:bg-orange-50 active:scale-95 transition shadow-md w-full md:w-auto text-center shrink-0 relative z-10 text-sm"
                  >
                    Ver Menú Completo →
                  </button>
                </div>

                {/* Real-time Administrative Stock Products */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-250/50 dark:border-gray-800 pb-3">
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>🍽️ Fritos & Productos en Stock (Donde Salo!)</span>
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">Disponibles ahora según stock de la tienda</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {productsArray.filter((p) => !p.storeId || (defaultStore && p.storeId === defaultStore.id)).slice(0, 4).map((product) => (
                      <div key={product.id} className="bg-white dark:bg-gray-800/60 rounded-3xl p-3 shadow-xs border border-gray-150/40 dark:border-gray-700/60 flex flex-col hover:shadow-md transition">
                        <div className="aspect-square rounded-2xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-700 relative border border-gray-100 dark:border-gray-700/50">
                          {product.photoUrl ? (
                            <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Sin imagen</div>
                          )}
                        </div>
                        <h3 className="font-bold text-sm truncate px-1 text-gray-900 dark:text-white">{product.name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3 mt-1 px-1 flex-grow leading-relaxed">{product.description}</p>
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-gray-700 px-1">
                          <p className="text-base font-extrabold text-orange-500">${product.salePrice.toLocaleString('es-CO')}</p>
                          <button
                            onClick={() => addToCart(product)}
                            className="p-2.5 rounded-xl text-white bg-orange-500 hover:bg-orange-600 transition active:scale-95 shadow-sm"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Other Stores Marketplace List */}
            <section className="py-10 px-4 max-w-6xl mx-auto space-y-8 relative z-10 border-t border-gray-200/40 dark:border-gray-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Explora Otras Tiendas Locales</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Apoya el emprendimiento y los comercios locales de tu sector</p>
                </div>
                {/* Search Store Bar */}
                <div className="w-full md:max-w-xs relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar tiendas..."
                    value={searchStoreQuery}
                    onChange={(e) => setSearchStoreQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                  />
                </div>
              </div>

              {/* Category Filters */}
              <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                {['TODOS', 'RESTAURANT', 'SALUD', 'TIENDA', 'COMPRA_VENTA'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border transition ${
                      selectedCategory === cat
                        ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                        : 'border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                    }`}
                  >
                    {cat === 'TODOS' ? '🏠 Todas' : getCategoryLabel(cat)}
                  </button>
                ))}
              </div>

              {/* Stores Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStores.map((store) => (
                  <div
                    key={store.id}
                    onClick={() => setSelectedStore(store)}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-150/60 dark:border-gray-750/70 shadow-xs hover:shadow-md hover:border-orange-500/40 transition-all duration-300 cursor-pointer flex gap-4 group hover:-translate-y-1"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-700 flex-shrink-0 border border-gray-100 dark:border-gray-700 relative shadow-xs">
                      {store.logoUrl ? (
                        <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500"><StoreIcon size={24} /></div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 tracking-wider">
                          {getCategoryLabel(store.category)}
                        </span>
                        {store.plan === 'PRO' && (
                          <span className="text-[9px] font-extrabold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded border border-amber-250/20">
                            PRO
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-base text-gray-900 dark:text-white truncate group-hover:text-orange-500 transition duration-200">{store.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed font-medium">{store.description || 'Sin descripción disponible.'}</p>
                    </div>
                  </div>
                ))}

                {filteredStores.length === 0 && (
                  <div className="col-span-full text-center py-16 bg-white dark:bg-gray-800/40 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                    <HelpCircle size={40} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No se encontraron tiendas en esta categoría.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          // Store Detail View
          <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 relative z-10">
            {/* Promo Carousel */}
            {selectedStore.plan === 'PRO' && promoMediaItems.length > 0 && (
              <div className="relative w-full h-64 md:h-96 rounded-3xl overflow-hidden shadow-lg border border-gray-150/50 dark:border-gray-800 bg-black group-carousel">
                {promoMediaItems.map((item, idx) => {
                  const isActive = idx === currentPromoIndex;
                  return (
                    <div
                      key={idx}
                      className={`absolute inset-0 transition-opacity duration-700 flex items-center justify-center ${
                        isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                      }`}
                    >
                      {item.type === 'VIDEO' ? (
                        <video
                          src={item.url}
                          controls
                          muted
                          autoPlay={isActive}
                          playsInline
                          className="w-full h-full object-contain"
                          onEnded={() => {
                            if (promoMediaItems.length > 1) {
                              setCurrentPromoIndex((prev) => (prev + 1) % promoMediaItems.length);
                            }
                          }}
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={`Promo ${idx}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  );
                })}

                {/* Left/Right Controls */}
                {promoMediaItems.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setCurrentPromoIndex(
                          (prev) => (prev - 1 + promoMediaItems.length) % promoMediaItems.length
                        )
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition backdrop-blur-sm"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPromoIndex((prev) => (prev + 1) % promoMediaItems.length)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition backdrop-blur-sm"
                    >
                      <ChevronRight size={20} />
                    </button>

                    {/* Dots indicator */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                      {promoMediaItems.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentPromoIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            idx === currentPromoIndex ? 'bg-white w-4' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Store Header Info */}
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 border-b border-gray-200/60 dark:border-gray-800 pb-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-5 text-center md:text-left">
                <button
                  onClick={() => setSelectedStore(null)}
                  className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-750 transition shadow-sm mr-2"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-100 dark:border-gray-700 relative shadow-sm">
                  {selectedStore.logoUrl ? (
                    <img src={selectedStore.logoUrl} alt={selectedStore.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500"><StoreIcon size={32} /></div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">{selectedStore.name}</h2>
                    <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                      {getCategoryLabel(selectedStore.category)}
                    </span>
                    {selectedStore.plan === 'PRO' && (
                      <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-0.5 animate-pulse">
                        💎 Tienda PRO
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl">{selectedStore.description || 'Bienvenido a nuestra tienda.'}</p>
                </div>
              </div>

              {/* Product Search Bar */}
              <div className="w-full md:max-w-xs relative self-center">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchProductQuery}
                  onChange={(e) => setSearchProductQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {storeProducts.map((product) => (
                <div key={product.id} className="bg-white dark:bg-gray-800/60 rounded-3xl p-3 shadow-sm border border-gray-150/40 dark:border-gray-700/60 flex flex-col hover:shadow-md transition">
                  <div className="aspect-square rounded-2xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-700 relative border border-gray-100 dark:border-gray-700/50">
                    {product.photoUrl ? (
                      <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Sin imagen</div>
                    )}
                  </div>
                  <h3 className="font-bold text-sm truncate px-1 text-gray-900 dark:text-white">{product.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3 mt-1 px-1 flex-grow leading-relaxed">{product.description}</p>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-gray-700 px-1">
                    <p className="text-base font-extrabold" style={{ color: bgColor }}>${product.salePrice.toLocaleString('es-CO')}</p>
                    <button
                      onClick={() => addToCart(product)}
                      className="p-2.5 rounded-xl text-white hover:opacity-90 transition active:scale-95 shadow-sm"
                      style={{ backgroundColor: bgColor }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {storeProducts.length === 0 && (
                <div className="col-span-full text-center py-16 bg-white dark:bg-gray-800/40 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                  <HelpCircle size={36} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">Esta tienda no tiene productos disponibles en este momento.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Professional Footer */}
      <footer className="relative z-10 bg-gray-900 text-gray-400 dark:bg-gray-950 border-t border-gray-850 py-12 px-6 mt-16 transition">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 text-left">
          {/* Col 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-black text-lg">
              <img src="/logo.jpg" alt="" className="w-8 h-8 rounded-full object-cover border border-gray-700" />
              <span>Vamos Donde Salo</span>
            </div>
            <p className="text-xs text-gray-550 leading-relaxed">
              La plataforma número uno de comercio local y digitalización en Puerto Colombia. Conectamos pequeños comerciantes y clientes de forma directa, confiable y contra entrega.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Enlaces Rápidos</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => setSelectedStore(null)} className="hover:text-white transition">Marketplace Principal</button></li>
              <li><Link href="/register-merchant" className="hover:text-white transition">Registrar mi Tienda</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Acceso Comercial</Link></li>
              <li><Link href="/seguir-pedido" className="hover:text-white transition">Rastreo de Pedidos</Link></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Soporte y Contacto</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0" />
                <span>Malecón de Puerto Colombia, Local 3</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="shrink-0" />
                <span>WhatsApp: {config?.whatsapp_number || '+57 300 123 4567'}</span>
              </li>
              <li><span>Email: soporte@vamosdondesalo.co</span></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Legal e Información</h4>
            <ul className="space-y-2 text-xs text-gray-500">
              <li><a href="#" className="hover:text-gray-300 transition">Términos y Condiciones</a></li>
              <li><a href="#" className="hover:text-gray-300 transition">Políticas de Privacidad</a></li>
              <li><a href="#" className="hover:text-gray-300 transition">Cookies</a></li>
              <li><a href="#" className="hover:text-gray-300 transition">Acuerdo Comercial de SaaS</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} {config?.business_name || 'Vamos Donde Salo'}. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <a href={`https://wa.me/${config?.whatsapp_number || '573001234567'}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-full transition shadow-xs">
              <Phone size={16} />
            </a>
          </div>
        </div>
      </footer>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 h-full shadow-2xl flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold">Tu Pedido</h2>
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 py-8 font-medium">El carrito está vacío</p>
              ) : (
                Object.keys(groupedCart).map((storeId) => {
                  const group = groupedCart[storeId];
                  const storeSubtotal = group.items.reduce((sum, item) => sum + item.product.salePrice * item.qty, 0);
                  const storeFee = getStoreDeliveryFee(storeSubtotal, group.store);
                  return (
                    <div key={storeId} className="space-y-3 border-b border-gray-150/40 dark:border-gray-700/60 pb-5 last:border-b-0">
                      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-750 px-3 py-2 rounded-xl">
                        <span className="font-extrabold text-sm text-orange-600 dark:text-orange-400">{group.store.name}</span>
                        <span className="text-xs text-gray-400">Envío: ${storeFee.toLocaleString('es-CO')}</span>
                      </div>
                      
                      <div className="space-y-3">
                        {group.items.map((item) => (
                          <div key={item.product.id} className="flex gap-3 bg-gray-50/50 dark:bg-gray-750/50 border border-gray-100 dark:border-gray-700/60 rounded-xl p-3">
                            <div className="w-14 h-14 rounded-lg bg-gray-200 dark:bg-gray-600 relative overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-700">
                              {item.product.photoUrl ? (
                                <img src={item.product.photoUrl} alt={item.product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Sin img</div>
                              )}
                            </div>
                            <div className="flex-grow min-w-0">
                              <h4 className="font-bold text-sm truncate text-gray-900 dark:text-white">{item.product.name}</h4>
                              <p className="text-sm font-semibold text-gray-500 mt-0.5">${item.product.salePrice.toLocaleString('es-CO')}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <button onClick={() => updateQty(item.product.id, -1)} className="p-1 rounded bg-gray-250 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                                  <Minus size={12} />
                                </button>
                                <span className="font-extrabold w-6 text-center text-sm">{item.qty}</span>
                                <button onClick={() => updateQty(item.product.id, 1)} className="p-1 rounded bg-gray-250 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                                  <Plus size={12} />
                                </button>
                                <button onClick={() => removeFromCart(item.product.id)} className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 ml-auto transition">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750/30 space-y-4">
                <div className="space-y-1.5 text-sm text-gray-500">
                  <div className="flex justify-between">
                    <span>Subtotal productos</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">${cartTotal.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Domicilio consolidado</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">${totalDeliveryFee.toLocaleString('es-CO')}</span>
                  </div>
                </div>
                <div className="flex justify-between text-lg font-black border-t border-gray-200 dark:border-gray-700 pt-3">
                  <span>Total estimado</span>
                  <span style={{ color: bgColor }}>${grandTotal.toLocaleString('es-CO')}</span>
                </div>
                <button
                  onClick={() => { setShowCart(false); setShowCheckout(true); }}
                  className="w-full py-3.5 text-white rounded-xl font-bold hover:opacity-95 transition shadow-md"
                  style={{ backgroundColor: bgColor }}
                >
                  Continuar al pago →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowCheckout(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold">Completa tu pedido</h2>
              <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Order summary */}
              <div className="bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700/60 rounded-2xl p-4 space-y-3">
                <h3 className="font-extrabold text-sm text-gray-600 dark:text-gray-400">Resumen de Compra</h3>
                
                {storeTotals.map((st) => (
                  <div key={st.storeId} className="flex justify-between text-xs font-semibold pb-1.5 border-b border-gray-200/40 dark:border-gray-700 last:border-b-0 last:pb-0">
                    <div className="space-y-0.5">
                      <p className="text-gray-900 dark:text-white">{st.storeName}</p>
                      <p className="text-gray-400 font-medium text-[10px]">Envío: ${st.deliveryFee.toLocaleString('es-CO')}</p>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">${st.total.toLocaleString('es-CO')}</span>
                  </div>
                ))}

                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between font-black text-base">
                  <span>Total Consolidado</span>
                  <span style={{ color: bgColor }}>${grandTotal.toLocaleString('es-CO')}</span>
                </div>
              </div>

              {/* Customer form */}
              <div className="space-y-4">
                <h3 className="font-extrabold text-sm text-gray-600 dark:text-gray-400">Tus datos de entrega</h3>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                />
                <input
                  type="tel"
                  placeholder="Teléfono móvil"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                />
                <input
                  type="text"
                  placeholder="Dirección completa de entrega"
                  value={customerData.address}
                  onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                />

                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Número de identificación (Opcional)"
                    value={customerData.doc}
                    onChange={(e) => setCustomerData({ ...customerData, doc: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1.5">
                    💡 Con tu número de identificación puedes rastrear tu pedido en tiempo real más tarde.
                  </p>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-1">
                    Método de pago
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {paymentMethods.length > 0 ? (
                      paymentMethods.map((m) => {
                        const isSelected = selectedPaymentMethod === m.method;
                        return (
                          <button
                            key={m.method}
                            type="button"
                            onClick={() => setSelectedPaymentMethod(m.method)}
                            className={`p-3.5 rounded-2xl border text-left font-bold text-xs transition-all flex flex-col gap-0.5 relative overflow-hidden ${
                              isSelected
                                ? 'border-orange-500 bg-orange-500 text-white shadow-sm scale-[1.02]'
                                : 'border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                            }`}
                          >
                            <span className="font-extrabold truncate">{METHOD_LABELS[m.method] || m.method}</span>
                            {m.key && (
                              <span className={`text-[9px] font-medium truncate ${isSelected ? 'text-orange-100' : 'text-gray-400'}`}>
                                {m.key}
                              </span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="col-span-2 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-center text-xs text-gray-400">
                        Cargando métodos de pago...
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Display for Transfers / Nequi Alert */}
                {selectedPaymentMethod !== 'CASH' && (
                  <div className="bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700/60 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3">
                    <p className="text-xs font-bold text-gray-500 text-center">
                      Escanea el código QR para realizar la transferencia
                    </p>
                    {paymentMethods.find((m) => m.method === selectedPaymentMethod)?.qrUrl ? (
                      <img
                        src={paymentMethods.find((m) => m.method === selectedPaymentMethod)?.qrUrl || undefined}
                        alt={`QR ${selectedPaymentMethod}`}
                        className="w-44 h-44 object-contain rounded-xl border bg-white shadow-sm"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center rounded-xl border bg-white text-gray-400 text-xs text-center p-4">
                        No hay imagen de QR configurada
                      </div>
                    )}
                    {paymentMethods.find((m) => m.method === selectedPaymentMethod)?.key && (
                      <p className="text-xs font-bold text-center text-gray-700 dark:text-gray-300">
                        Número / Referencia: {paymentMethods.find((m) => m.method === selectedPaymentMethod)?.key}
                      </p>
                    )}
                    {selectedPaymentMethod === 'NEQUI' && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-150/40 dark:border-purple-900/20 rounded-xl text-center w-full">
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
                          📢 Muéstrale al vendedor el comprobante para que te dé el producto
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2.5 py-1">
                  <input
                    type="checkbox"
                    id="envioNacional"
                    checked={customerData.nacional}
                    onChange={(e) => setCustomerData({ ...customerData, nacional: e.target.checked, zone: e.target.checked ? '' : customerData.zone })}
                    className="w-4 h-4 rounded text-orange-500 border-gray-300 focus:ring-orange-400 focus:ring-2"
                  />
                  <label htmlFor="envioNacional" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                    ¿Es envío nacional?
                  </label>
                </div>

                {!customerData.nacional ? (
                  <>
                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-1">
                        Selecciona zona de domicilio
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {deliveryZonesArray.map((zone) => {
                          const isSelected = customerData.zone === zone.id;
                          return (
                            <button
                              key={zone.id}
                              type="button"
                              onClick={() => setCustomerData({ ...customerData, zone: zone.id })}
                              className={`p-3.5 rounded-2xl border text-left font-bold text-xs transition-all flex flex-col gap-0.5 relative overflow-hidden ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-500 text-white shadow-sm scale-[1.02]'
                                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                              }`}
                            >
                              <span className="font-extrabold truncate">{zone.name}</span>
                              <span className={`text-[9px] font-medium ${isSelected ? 'text-orange-100' : 'text-gray-400'}`}>
                                Domicilio listo para cargar
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {customerData.zone && (
                      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100/40 dark:border-orange-900/20 rounded-xl p-3 text-xs text-orange-600 dark:text-orange-400 font-medium space-y-1">
                        <p>ℹ️ Políticas de Domicilio Gratuito por tienda:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          <li>Puerto Colombia / Pradomar: Gratis por compras mayores a $10.000 COP en la respectiva tienda.</li>
                          <li>Salgar: Gratis por compras mayores a $18.000 COP en la respectiva tienda.</li>
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-150/40 dark:border-green-900/20 rounded-xl p-3 text-xs text-green-700 dark:text-green-400 font-bold">
                    🚚 ¡Envío Nacional activado! Cuádralo con el comerciante por WhatsApp al terminar la compra.
                  </div>
                )}
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full py-4 text-white rounded-2xl font-bold hover:opacity-95 transition shadow-md mt-4 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: bgColor }}
              >
                {checkoutLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Procesando pedidos...
                  </>
                ) : (
                  'Confirmar y generar pedidos'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Success WhatsApp Drawer/Modal */}
      {checkoutSuccessOrders.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto text-green-500 animate-bounce">
              <CheckCircle size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">¡Pedidos Creados!</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                Hemos dividido tus compras por tienda. Para confirmar cada pedido, haz clic en el botón de WhatsApp correspondiente. Esto enviará los detalles de compra a cada comerciante.
              </p>
            </div>
            <div className="space-y-3 max-h-56 overflow-y-auto p-1">
              {checkoutSuccessOrders.map((ord, idx) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700/60 rounded-2xl flex flex-col items-center justify-between gap-3 shadow-xs">
                  <div className="text-center">
                    <p className="font-extrabold text-sm text-gray-850 dark:text-gray-200">{ord.storeName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Seguimiento: {ord.trackingCode}</p>
                  </div>
                  <a
                    href={ord.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <Phone size={16} /> Enviar WhatsApp
                  </a>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setCheckoutSuccessOrders([]);
                setCart([]);
                setShowCheckout(false);
                setShowCart(false);
                setCustomerData({ name: '', phone: '', address: '', zone: '', doc: '', nacional: false });
                setSelectedStore(null);
              }}
              className="w-full py-3 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white rounded-2xl font-extrabold transition text-sm hover:opacity-90 shadow-sm"
            >
              Cerrar y volver al Marketplace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
