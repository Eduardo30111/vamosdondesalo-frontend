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
  HelpCircle,
  Utensils,
  Palette,
  Package,
  Wrench,
  HeartPulse,
  Compass,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  Award,
  Navigation
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
  plan?: 'FREE' | 'PRO' | 'PREMIUM';
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
  CASH: 'Efectivo al Recoger',
  NEQUI: 'Nequi / Transferencia',
  BANCOLOMBIA: 'Bancolombia',
  DAVIPLATA: 'Daviplata',
  TRANSFER: 'Transferencia',
  BREB: 'Breb',
};

const CATEGORIES = [
  { id: 'TODOS', label: 'Todos los Comercios', icon: Compass, color: 'from-orange-500 to-amber-500' },
  { id: 'COMIDA', label: 'Comida', icon: Utensils, color: 'from-amber-500 to-orange-600', aliases: ['RESTAURANT', 'COMIDA', 'GASTRONOMIA'] },
  { id: 'ARTESANIAS', label: 'Artesanías', icon: Palette, color: 'from-rose-500 to-pink-600', aliases: ['ARTESANIAS', 'ARTESANIA'] },
  { id: 'PRODUCTOS', label: 'Productos', icon: Package, color: 'from-blue-500 to-indigo-600', aliases: ['PRODUCTOS', 'TIENDA', 'COMPRA_VENTA', 'ROPA'] },
  { id: 'SERVICIOS', label: 'Servicios', icon: Wrench, color: 'from-emerald-500 to-teal-600', aliases: ['SERVICIOS', 'TURISMO', 'BELLEZA'] },
  { id: 'SALUD', label: 'Salud', icon: HeartPulse, color: 'from-red-500 to-rose-600', aliases: ['SALUD', 'FARMACIA', 'DROGUERIA'] },
];

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
  const [fulfillmentType, setFulfillmentType] = useState<'PICKUP' | 'DIRECT_DELIVERY' | 'NACIONAL'>('PICKUP');
  
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    address: '',
    zone: '',
    doc: '',
    pickupTime: 'Lo antes posible',
    notes: '',
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
        toast.error(`No hay suficiente stock en vitrina (Disponible: ${product.remaining})`);
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
                toast.error(`No hay suficiente stock en vitrina (Disponible: ${item.product.remaining})`);
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
        name: config?.business_name || 'Salo Store',
        whatsappNumber: config?.whatsapp_number || '573001234567',
        logoUrl: config?.business_logo_url || null,
        category: 'COMIDA',
      };
      const storeId = storeVal.id;
      if (!acc[storeId]) {
        acc[storeId] = { store: storeVal as any, items: [] };
      }
      acc[storeId].items.push(item);
      return acc;
    }, {});
  }, [cart, config]);

  // Totals calculations
  const groupedCart = getGroupedCart();
  const storeTotals = Object.keys(groupedCart).map((storeId) => {
    const group = groupedCart[storeId];
    const subtotal = group.items.reduce((sum, item) => sum + item.product.salePrice * item.qty, 0);
    return {
      storeId,
      storeName: group.store.name,
      subtotal,
      deliveryFee: 0,
      total: subtotal,
    };
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.product.salePrice * item.qty, 0);
  const grandTotal = cartTotal;
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleCheckout = async () => {
    if (checkoutLoading) return;
    if (!customerData.name || !customerData.phone) {
      toast.error('Por favor ingresa tu nombre y teléfono móvil');
      return;
    }
    if (cart.length === 0) {
      toast.error('El pedido está vacío');
      return;
    }

    setCheckoutLoading(true);
    try {
      const createdOrders: Array<{ trackingCode: string; storeName: string; whatsappUrl: string }> = [];
      const keys = Object.keys(groupedCart);
      setCheckoutSuccessOrders([]);

      for (const storeId of keys) {
        const group = groupedCart[storeId];
        const storeSubtotal = group.items.reduce((sum, item) => sum + item.product.salePrice * item.qty, 0);
        
        let fulfillmentLabel = 'Recoger en Tienda / Takeaway';
        if (fulfillmentType === 'DIRECT_DELIVERY') {
          fulfillmentLabel = `Acordar Entrega con la Tienda (${customerData.address || 'Dirección indicada'})`;
        } else if (fulfillmentType === 'NACIONAL') {
          fulfillmentLabel = `Envío Nacional (${customerData.address || 'Por coordinar'})`;
        }

        const payload = {
          type: 'TAKEAWAY',
          customerName: customerData.name,
          customerPhone: customerData.phone,
          customerAddress: customerData.address || 'Recogida en Local (Puerto Colombia)',
          customerDoc: customerData.doc || undefined,
          deliveryFee: 0,
          items: group.items.map((item) => ({
            productId: item.product.id,
            qty: item.qty,
            unitPrice: item.product.salePrice,
          })),
          total: storeSubtotal,
          storeId: storeId === 'legacy-salo' ? undefined : storeId,
          notes: `Modalidad: ${fulfillmentLabel} | Pago: ${METHOD_LABELS[selectedPaymentMethod] || selectedPaymentMethod}${customerData.notes ? ` | Notas: ${customerData.notes}` : ''}`,
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
            `🛍️ *Salo Store - Nuevo Pedido de Puerto Colombia*\n\n` +
            `*Código de Pedido:* ${order.trackingCode || 'N/A'}\n` +
            `*Comercio:* ${group.store.name}\n` +
            `*Cliente:* ${customerData.name}\n` +
            `*Teléfono:* ${customerData.phone}\n` +
            `*Modalidad:* ${fulfillmentLabel}\n` +
            (customerData.pickupTime ? `*Hora Estimada:* ${customerData.pickupTime}\n` : '') +
            `*Método de Pago:* ${METHOD_LABELS[selectedPaymentMethod] || selectedPaymentMethod}\n\n` +
            `*Detalle de Productos:*\n` +
            group.items.map((it) => `▪ ${it.qty}x ${it.product.name} ($${it.product.salePrice.toLocaleString('es-CO')})`).join('\n') + `\n\n` +
            `*Total a Pagar:* $${storeSubtotal.toLocaleString('es-CO')}\n` +
            (customerData.notes ? `*Notas adicionales:* ${customerData.notes}\n\n` : '\n') +
            `¡Hola! Acabo de armar mi pedido por Salo Store. Por favor confírmame disponibilidad para recoger o acordar entrega. ¡Muchas gracias!`
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

  const getCategoryMatches = (storeCat: string, targetCatId: string) => {
    if (targetCatId === 'TODOS') return true;
    const catObj = CATEGORIES.find(c => c.id === targetCatId);
    if (!catObj) return storeCat === targetCatId;
    const upper = (storeCat || '').toUpperCase().trim();
    if (upper === targetCatId) return true;
    return catObj.aliases ? catObj.aliases.includes(upper) : false;
  };

  const filteredStores = storesArray.filter((s) => {
    if (!s || !s.active) return false;
    const matchesCategory = getCategoryMatches(s.category, selectedCategory);
    const matchesSearch = !searchStoreQuery || 
      (s.name && s.name.toLowerCase().includes(searchStoreQuery.toLowerCase())) || 
      (s.description && s.description.toLowerCase().includes(searchStoreQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Filter products for the selected store
  const storeProducts = productsArray.filter((p) => {
    if (!selectedStore) return true;
    return p.storeId === selectedStore.id;
  }).filter((p) => {
    return !searchProductQuery || 
      (p.name && p.name.toLowerCase().includes(searchProductQuery.toLowerCase())) || 
      (p.description && p.description.toLowerCase().includes(searchProductQuery.toLowerCase()));
  });

  const getCategoryBadge = (category: string) => {
    const upper = (category || '').toUpperCase().trim();
    if (upper.includes('COMIDA') || upper.includes('RESTAURANT')) return { label: 'Comida', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' };
    if (upper.includes('ARTESANI')) return { label: 'Artesanías', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' };
    if (upper.includes('PRODUCT') || upper.includes('TIENDA') || upper.includes('COMPRA')) return { label: 'Productos', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' };
    if (upper.includes('SERVICI') || upper.includes('TURIS')) return { label: 'Servicios', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' };
    if (upper.includes('SALUD') || upper.includes('FARMACIA')) return { label: 'Salud', color: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' };
    return { label: category, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };
  };

  return (
    <div className="relative overflow-hidden min-h-screen bg-[#FFFDF9] dark:bg-gray-950 text-gray-800 dark:text-gray-100 flex flex-col font-sans transition-colors duration-300 selection:bg-orange-500 selection:text-white">

      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white text-[11px] md:text-xs py-1.5 px-4 text-center font-bold tracking-wide flex items-center justify-center gap-2 shadow-xs">
        <Sparkles size={13} className="animate-spin text-amber-200" />
        <span>¡Bienvenido a Salo Store! El catálogo y marketplace digital de Puerto Colombia. Trato directo, recogida en tienda y contacto local.</span>
      </div>

      {/* Header */}
      <header className="relative z-40 sticky top-0 bg-white/85 dark:bg-gray-900/85 backdrop-blur-md shadow-xs border-b border-orange-150/40 dark:border-gray-800 transition">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSelectedStore(null)} className="flex items-center gap-3 text-xl font-black text-left group">
            <div className="relative">
              <img
                src="/logo.jpg"
                alt="Logo Salo Store"
                className="w-10 h-10 rounded-2xl object-cover border-2 border-orange-500/20 shadow-sm group-hover:scale-105 transition duration-300"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 bg-clip-text text-transparent text-xl font-black tracking-tight">
                Salo Store
              </span>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider -mt-1 flex items-center gap-1">
                <MapPin size={10} className="text-orange-500" /> Puerto Colombia
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2.5 rounded-2xl bg-orange-50 dark:bg-gray-850 hover:bg-orange-100 dark:hover:bg-gray-800 border border-orange-200/50 dark:border-gray-700 transition"
              aria-label="Ver pedido"
            >
              <ShoppingCart size={20} className="text-orange-600 dark:text-orange-400" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-600 text-white text-[10px] rounded-full flex items-center justify-center font-black shadow-md animate-bounce">
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
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl text-white font-bold text-xs bg-orange-600 hover:bg-orange-700 shadow-sm transition active:scale-95"
                >
                  {user.role === 'ADMIN' && <LayoutDashboard size={14} />}
                  {user.role === 'MERCHANT' && <StoreIcon size={14} />}
                  {(user.role === 'VENDEDOR' || user.role === 'MERCHANT_STAFF') && <ShoppingBag size={14} />}
                  {user.role === 'COCINA' && <ChefHat size={14} />}
                  {user.role === 'ADMIN' && 'Panel Admin'}
                  {user.role === 'MERCHANT' && 'Mi Negocio'}
                  {(user.role === 'VENDEDOR' || user.role === 'MERCHANT_STAFF') && 'Ventas POS'}
                  {user.role === 'COCINA' && 'Cocina'}
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/register-merchant" className="hidden sm:inline-flex text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-orange-600 px-3 py-2 rounded-xl transition">
                  Registrar mi Negocio
                </Link>
                <Link href="/login" className="px-4 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white rounded-2xl font-bold text-xs shadow-sm transition active:scale-95">
                  Ingresar
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
            {/* Hero Section with Puerto Colombia Authentic Visuals */}
            <section className="relative overflow-hidden py-10 md:py-16 px-4 bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-transparent border-b border-orange-100/50 dark:border-gray-800">
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                
                <div className="lg:col-span-6 space-y-5 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/50 shadow-xs">
                    <ShieldCheck size={14} className="text-orange-600" />
                    <span>Vitrina & Catálogo Oficial de Puerto Colombia</span>
                  </div>

                  <h1 className="text-4xl md:text-5xl lg:text-5xl font-black tracking-tight text-gray-950 dark:text-white leading-[1.15]">
                    Descubre lo mejor de <br />
                    <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                      Puerto Colombia en un solo lugar
                    </span>
                  </h1>

                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
                    Comida típica y restaurantes, artesanías caribeñas, productos locales, servicios turísticos y farmacias. Explora catálogos, pide para recoger en tienda o coordina directo por WhatsApp sin intermediarios ni cobros ocultos.
                  </p>

                  {/* Search Bar & Tracking */}
                  <div className="space-y-3 pt-2 max-w-lg mx-auto lg:mx-0">
                    <div className="relative">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar negocios, platos, artesanías o productos..."
                        value={searchStoreQuery}
                        onChange={(e) => setSearchStoreQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 outline-none focus:ring-2 focus:ring-orange-500 shadow-xs text-sm transition focus:shadow-md"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
                      <Navigation size={13} className="text-orange-500 shrink-0" />
                      <span>Sectores destacados: Malecón del Mar, Muelle 1888, Plaza Principal, Pradomar y Salgar.</span>
                    </div>
                  </div>
                </div>

                {/* Staggered High-Definition Puerto Colombia Imagery Showcase */}
                <div className="lg:col-span-6 relative h-[360px] md:h-[420px] w-full flex items-center justify-center">
                  
                  {/* Photo 1: Faro Ventana de Sueños & Muelle */}
                  <div
                    onMouseMove={(e) => handlePhotoMouseMove(e, 0)}
                    onMouseLeave={handlePhotoMouseLeave}
                    className="absolute left-[2%] top-[6%] w-[54%] aspect-[16/10] rounded-3xl overflow-hidden shadow-xl border-2 border-white/80 dark:border-gray-700/80 cursor-pointer select-none z-20 bg-gray-100 dark:bg-gray-800 group"
                    style={{
                      transform: hoveredPhotoIdx === 0
                        ? `perspective(1000px) rotateX(${-tiltCoords.y * 10}deg) rotateY(${tiltCoords.x * 10}deg) scale3d(1.05, 1.05, 1.05) translateZ(15px) rotate(-4deg)`
                        : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0) rotate(-4deg)',
                      transition: hoveredPhotoIdx === 0 ? 'none' : 'transform 0.4s ease-out',
                    }}
                  >
                    <img src="/puerto_faro.jpg" alt="Faro Ventana de Sueños y Muelle de Puerto Colombia" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent py-2.5 px-3 text-white">
                      <p className="text-[11px] font-extrabold truncate">Muelle & Faro Ventana de Sueños</p>
                      <p className="text-[9px] text-amber-200 font-medium">Ícono Turístico y Comercial</p>
                    </div>
                  </div>

                  {/* Photo 2: Artesanías del Caribe */}
                  <div
                    onMouseMove={(e) => handlePhotoMouseMove(e, 1)}
                    onMouseLeave={handlePhotoMouseLeave}
                    className="absolute right-[2%] top-[2%] w-[50%] aspect-[16/10] rounded-3xl overflow-hidden shadow-xl border-2 border-white/80 dark:border-gray-700/80 cursor-pointer select-none z-30 bg-gray-100 dark:bg-gray-800 group"
                    style={{
                      transform: hoveredPhotoIdx === 1
                        ? `perspective(1000px) rotateX(${-tiltCoords.y * 10}deg) rotateY(${tiltCoords.x * 10}deg) scale3d(1.05, 1.05, 1.05) translateZ(15px) rotate(3deg)`
                        : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0) rotate(3deg)',
                      transition: hoveredPhotoIdx === 1 ? 'none' : 'transform 0.4s ease-out',
                    }}
                  >
                    <img src="/puerto_artesanias.jpg" alt="Artesanías típicas de Puerto Colombia" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent py-2.5 px-3 text-white">
                      <p className="text-[11px] font-extrabold truncate">Artesanías & Souvenirs</p>
                      <p className="text-[9px] text-amber-200 font-medium">Hecho a Mano por Artesanos</p>
                    </div>
                  </div>

                  {/* Photo 3: Gastronomía & Fritos */}
                  <div
                    onMouseMove={(e) => handlePhotoMouseMove(e, 2)}
                    onMouseLeave={handlePhotoMouseLeave}
                    className="absolute left-[15%] bottom-[4%] w-[52%] aspect-[16/10] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/80 dark:border-gray-700/80 cursor-pointer select-none z-40 bg-gray-100 dark:bg-gray-800 group"
                    style={{
                      transform: hoveredPhotoIdx === 2
                        ? `perspective(1000px) rotateX(${-tiltCoords.y * 10}deg) rotateY(${tiltCoords.x * 10}deg) scale3d(1.05, 1.05, 1.05) translateZ(15px) rotate(-1deg)`
                        : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0) rotate(-1deg)',
                      transition: hoveredPhotoIdx === 2 ? 'none' : 'transform 0.4s ease-out',
                    }}
                  >
                    <img src="/puerto_gastronomia.jpg" alt="Gastronomía local de Puerto Colombia" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent py-2.5 px-3 text-white">
                      <p className="text-[11px] font-extrabold truncate">Gastronomía & Fritos Típicos</p>
                      <p className="text-[9px] text-amber-200 font-medium">Sabor Porteño y Caribeño</p>
                    </div>
                  </div>

                </div>

              </div>
            </section>

            {/* Rappi-style 5 Categories Bar */}
            <section className="py-6 px-4 max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Categorías Principales</span>
                  </h2>
                  <p className="text-xs text-gray-400">Selecciona una categoría para filtrar los negocios locales</p>
                </div>

                {selectedCategory !== 'TODOS' && (
                  <button
                    onClick={() => setSelectedCategory('TODOS')}
                    className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    Ver todas
                  </button>
                )}
              </div>

              {/* Category Pills Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 border text-center group cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md scale-[1.03] border-transparent'
                          : 'bg-white dark:bg-gray-850 hover:bg-orange-50/50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200/70 dark:border-gray-800 hover:border-orange-300'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl transition duration-300 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-orange-100/60 dark:bg-gray-800 text-orange-600 dark:text-orange-400 group-hover:scale-110'
                      }`}>
                        <Icon size={20} />
                      </div>
                      <span className="text-xs font-black tracking-tight leading-tight">
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Stores Marketplace Grid */}
            <section className="py-8 px-4 max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150/60 dark:border-gray-800 pb-4">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Negocios en Puerto Colombia</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                      {filteredStores.length} disponibles
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Compra directo, recoge en el local o coordina entrega sin comisiones de intermediarios
                  </p>
                </div>
              </div>

              {/* Store Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStores.map((store) => {
                  const badge = getCategoryBadge(store.category);
                  return (
                    <div
                      key={store.id}
                      className="bg-white dark:bg-gray-850 rounded-3xl p-5 border border-gray-150/70 dark:border-gray-800 shadow-xs hover:shadow-xl hover:border-orange-500/40 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
                    >
                      <div className="space-y-4">
                        {/* Store Header with Logo and Plan */}
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-750 flex-shrink-0 border border-gray-200/60 dark:border-gray-700 relative shadow-xs">
                            {store.logoUrl ? (
                              <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                <StoreIcon size={26} />
                              </div>
                            )}
                          </div>

                          <div className="flex-grow min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider ${badge.color}`}>
                                {badge.label}
                              </span>
                              {store.plan === 'PRO' && (
                                <span className="text-[9px] font-black px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-full border border-amber-300/40 flex items-center gap-1">
                                  <Award size={10} /> PRO
                                </span>
                              )}
                            </div>

                            <h4 className="font-black text-lg text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition duration-200">
                              {store.name}
                            </h4>

                            <p className="text-[11px] text-gray-400 flex items-center gap-1">
                              <MapPin size={11} className="text-orange-500 shrink-0" />
                              <span>Puerto Colombia, Atlántico</span>
                            </p>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed font-medium">
                          {store.description || 'Comercio local verificado de Puerto Colombia con atención directa.'}
                        </p>
                      </div>

                      {/* Store Actions */}
                      <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800/80 flex items-center gap-2">
                        <button
                          onClick={() => setSelectedStore(store)}
                          className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <ShoppingBag size={14} />
                          <span>Ver Catálogo</span>
                        </button>

                        <a
                          href={`https://wa.me/${store.whatsappNumber.replace('+', '').replace(/\s+/g, '').trim()}?text=${encodeURIComponent(`¡Hola ${store.name}! Los encontré a través de Salo Store Puerto Colombia y me gustaría información.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition shadow-xs flex items-center justify-center active:scale-95"
                          title="Escribir al WhatsApp"
                        >
                          <MessageCircle size={16} />
                        </a>
                      </div>
                    </div>
                  );
                })}

                {filteredStores.length === 0 && (
                  <div className="col-span-full text-center py-16 bg-white dark:bg-gray-850 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 space-y-3">
                    <HelpCircle size={40} className="mx-auto text-gray-400" />
                    <h4 className="text-base font-bold text-gray-700 dark:text-gray-300">No encontramos negocios en esta categoría</h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Sé el primer comerciante de esta categoría en Puerto Colombia registrando tu negocio.
                    </p>
                    <Link
                      href="/register-merchant"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition shadow-sm"
                    >
                      <StoreIcon size={14} /> Registrar mi Negocio
                    </Link>
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
              <div className="relative w-full h-64 md:h-96 rounded-3xl overflow-hidden shadow-xl border border-gray-150/50 dark:border-gray-800 bg-black group-carousel">
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
                  className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-750 transition shadow-sm"
                  aria-label="Volver al Marketplace"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-100 dark:border-gray-700 relative shadow-sm">
                  {selectedStore.logoUrl ? (
                    <img src={selectedStore.logoUrl} alt={selectedStore.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                      <StoreIcon size={32} />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">{selectedStore.name}</h2>
                    <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${getCategoryBadge(selectedStore.category).color}`}>
                      {getCategoryBadge(selectedStore.category).label}
                    </span>
                    {selectedStore.plan === 'PRO' && (
                      <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                        <Award size={11} /> Tienda PRO
                      </span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-xl">
                    {selectedStore.description || 'Bienvenido a nuestro catálogo en Salo Store. Trato directo y sin intermediarios.'}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center justify-center md:justify-start gap-1">
                    <MapPin size={12} className="text-orange-500" />
                    <span>Puerto Colombia, Atlántico</span>
                  </p>
                </div>
              </div>

              {/* Store Actions & Product Search */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <a
                  href={`https://wa.me/${selectedStore.whatsappNumber.replace('+', '').replace(/\s+/g, '').trim()}?text=${encodeURIComponent(`¡Hola ${selectedStore.name}! Los encontré en Salo Store y tengo una consulta.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <MessageCircle size={15} /> WhatsApp Directo
                </a>

                <div className="w-full sm:w-60 relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar en esta tienda..."
                    value={searchProductQuery}
                    onChange={(e) => setSearchProductQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {storeProducts.map((product) => (
                <div key={product.id} className="bg-white dark:bg-gray-850 rounded-3xl p-3.5 shadow-xs border border-gray-150/50 dark:border-gray-800 flex flex-col hover:shadow-md transition group">
                  <div className="aspect-square rounded-2xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-800 relative border border-gray-100 dark:border-gray-750">
                    {product.photoUrl ? (
                      <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Sin foto</div>
                    )}
                  </div>
                  <h3 className="font-bold text-sm truncate px-1 text-gray-900 dark:text-white">{product.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 mt-1 px-1 flex-grow leading-relaxed">
                    {product.description || 'Disponible en tienda.'}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-gray-100 dark:border-gray-800 px-1">
                    <p className="text-base font-black text-orange-600 dark:text-orange-400">
                      ${product.salePrice.toLocaleString('es-CO')}
                    </p>
                    <button
                      onClick={() => addToCart(product)}
                      className="p-2.5 rounded-xl text-white bg-orange-500 hover:bg-orange-600 transition active:scale-95 shadow-xs"
                      aria-label={`Agregar ${product.name} al pedido`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {storeProducts.length === 0 && (
                <div className="col-span-full text-center py-16 bg-white dark:bg-gray-850 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                  <HelpCircle size={36} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">No hay productos registrados en este momento.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modern Footer */}
      <footer className="relative z-10 bg-gray-900 text-gray-400 dark:bg-gray-950 border-t border-gray-800 py-12 px-6 mt-16 transition">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 text-left">
          {/* Col 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-black text-lg">
              <img src="/logo.jpg" alt="" className="w-8 h-8 rounded-xl object-cover border border-gray-700" />
              <span>Salo Store</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              La plataforma de comercio y catálogo digital de Puerto Colombia. Conectamos negocios locales, artesanos y prestadores de servicios con la comunidad y visitantes sin intermediación de fletes.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Categorías</h4>
            <ul className="space-y-2 text-xs">
              {CATEGORIES.filter(c => c.id !== 'TODOS').map(c => (
                <li key={c.id}>
                  <button onClick={() => { setSelectedStore(null); setSelectedCategory(c.id); }} className="hover:text-white transition">
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Puerto Colombia</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0 text-orange-500" />
                <span>Malecón del Mar, Muelle 1888 & Plaza</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="shrink-0 text-green-500" />
                <span>WhatsApp: {config?.whatsapp_number || '+57 300 123 4567'}</span>
              </li>
              <li>
                <Link href="/register-merchant" className="text-orange-400 hover:underline font-bold">
                  ¿Tienes un negocio? Regístralo gratis
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Legal & Seguridad</h4>
            <ul className="space-y-2 text-xs text-gray-500">
              <li><span>Trato directo con el comerciante</span></li>
              <li><span>Sin comisiones ocultas para clientes</span></li>
              <li><span>Garantía y confianza local porteña</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto border-t border-gray-800/80 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Salo Store Puerto Colombia. Todos los derechos reservados.</p>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-400">Hecho con orgullo en Puerto Colombia 🇨🇴</span>
          </div>
        </div>
      </footer>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800">
            <div className="p-4 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-orange-500" />
                <h2 className="text-base font-black">Tu Pedido</h2>
              </div>
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {cart.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <ShoppingCart size={40} className="mx-auto text-gray-300 dark:text-gray-700" />
                  <p className="text-gray-400 text-sm font-medium">Aún no has agregado productos</p>
                </div>
              ) : (
                Object.keys(groupedCart).map((storeId) => {
                  const group = groupedCart[storeId];
                  const storeSubtotal = group.items.reduce((sum, item) => sum + item.product.salePrice * item.qty, 0);
                  return (
                    <div key={storeId} className="space-y-3 bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-2xl p-3.5">
                      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-750 pb-2">
                        <span className="font-black text-sm text-orange-600 dark:text-orange-400">{group.store.name}</span>
                        <span className="text-[11px] font-bold text-gray-500">${storeSubtotal.toLocaleString('es-CO')}</span>
                      </div>
                      
                      <div className="space-y-2.5">
                        {group.items.map((item) => (
                          <div key={item.product.id} className="flex gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 items-center">
                            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 relative overflow-hidden flex-shrink-0">
                              {item.product.photoUrl ? (
                                <img src={item.product.photoUrl} alt={item.product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">Sin foto</div>
                              )}
                            </div>
                            <div className="flex-grow min-w-0">
                              <h4 className="font-bold text-xs truncate text-gray-900 dark:text-white">{item.product.name}</h4>
                              <p className="text-xs font-black text-orange-600 dark:text-orange-400 mt-0.5">${item.product.salePrice.toLocaleString('es-CO')}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => updateQty(item.product.id, -1)} className="p-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 transition">
                                <Minus size={12} />
                              </button>
                              <span className="font-black w-5 text-center text-xs">{item.qty}</span>
                              <button onClick={() => updateQty(item.product.id, 1)} className="p-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 transition">
                                <Plus size={12} />
                              </button>
                              <button onClick={() => removeFromCart(item.product.id)} className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition">
                                <Trash2 size={12} />
                              </button>
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
              <div className="p-4 border-t border-gray-150 dark:border-gray-800 bg-gray-50 dark:bg-gray-850 space-y-3">
                <div className="flex justify-between text-base font-black">
                  <span>Total estimado</span>
                  <span className="text-orange-600 dark:text-orange-400">${grandTotal.toLocaleString('es-CO')}</span>
                </div>
                <button
                  onClick={() => { setShowCart(false); setShowCheckout(true); }}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-sm shadow-md transition active:scale-95"
                >
                  Continuar Pedido →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal (Rappi Style for Takeaway & Direct Contact) */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowCheckout(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
            <div className="p-5 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Confirmar Pedido</h2>
                <p className="text-xs text-gray-400">Trato directo con el comercio de Puerto Colombia</p>
              </div>
              <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Order Summary */}
              <div className="bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-2xl p-4 space-y-2">
                <h3 className="font-black text-xs uppercase tracking-wider text-gray-500">Resumen de Tiendas</h3>
                {storeTotals.map((st) => (
                  <div key={st.storeId} className="flex justify-between text-xs font-bold py-1 border-b border-gray-200/50 dark:border-gray-750 last:border-b-0">
                    <span className="text-gray-800 dark:text-gray-200">{st.storeName}</span>
                    <span className="text-orange-600 dark:text-orange-400">${st.total.toLocaleString('es-CO')}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-black text-sm">
                  <span>Total Pedido:</span>
                  <span className="text-orange-600 dark:text-orange-400">${grandTotal.toLocaleString('es-CO')}</span>
                </div>
              </div>

              {/* Fulfillment Type Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-gray-500 tracking-wider">
                  Modalidad de Entrega
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('PICKUP')}
                    className={`p-3.5 rounded-2xl border text-left font-bold text-xs transition flex flex-col gap-1 ${
                      fulfillmentType === 'PICKUP'
                        ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                        : 'border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="font-black">🛍️ Recoger en Tienda (Takeaway)</span>
                    <span className={`text-[10px] ${fulfillmentType === 'PICKUP' ? 'text-orange-100' : 'text-gray-400'}`}>
                      Pides y pasas por el local en Puerto Colombia
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('DIRECT_DELIVERY')}
                    className={`p-3.5 rounded-2xl border text-left font-bold text-xs transition flex flex-col gap-1 ${
                      fulfillmentType === 'DIRECT_DELIVERY'
                        ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                        : 'border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="font-black">💬 Acordar con el Comercio</span>
                    <span className={`text-[10px] ${fulfillmentType === 'DIRECT_DELIVERY' ? 'text-orange-100' : 'text-gray-400'}`}>
                      Cuadra entrega directa por WhatsApp
                    </span>
                  </button>
                </div>
              </div>

              {/* Customer Contact Details */}
              <div className="space-y-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-gray-500">Tus Datos de Contacto</h3>
                
                <input
                  type="text"
                  placeholder="Tu Nombre Completo *"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />

                <input
                  type="tel"
                  placeholder="Teléfono Móvil / WhatsApp *"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />

                {fulfillmentType !== 'PICKUP' && (
                  <input
                    type="text"
                    placeholder="Dirección o Sector de Entrega *"
                    value={customerData.address}
                    onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                  />
                )}

                <input
                  type="text"
                  placeholder="Notas adicionales o requerimientos especiales (Opcional)"
                  value={customerData.notes}
                  onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-gray-500 tracking-wider">
                  Método de Pago Preferido
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((m) => {
                    const isSelected = selectedPaymentMethod === m.method;
                    return (
                      <button
                        key={m.method}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(m.method)}
                        className={`p-3 rounded-xl border text-left font-bold text-xs transition flex flex-col gap-0.5 ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500 text-white shadow-xs'
                            : 'border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="truncate">{METHOD_LABELS[m.method] || m.method}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-sm transition shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {checkoutLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Generando pedidos...
                  </>
                ) : (
                  'Confirmar y Enviar Pedido vía WhatsApp 🚀'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {checkoutSuccessOrders.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl text-center space-y-5 border border-gray-200 dark:border-gray-800">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center mx-auto text-green-500 animate-bounce">
              <CheckCircle size={36} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">¡Pedido Registrado!</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1.5 leading-relaxed">
                Tus pedidos han sido creados exitosamente. Haz clic en el botón verde de cada tienda para enviar los detalles directamente por WhatsApp al comerciante.
              </p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto p-1">
              {checkoutSuccessOrders.map((ord, idx) => (
                <div key={idx} className="p-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-150 dark:border-gray-750 rounded-2xl flex flex-col items-center gap-2.5">
                  <div>
                    <p className="font-black text-sm text-gray-900 dark:text-white">{ord.storeName}</p>
                    <p className="text-[11px] text-gray-400">Código: {ord.trackingCode}</p>
                  </div>
                  <a
                    href={ord.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
                  >
                    <MessageCircle size={16} /> Enviar a {ord.storeName} por WhatsApp
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
                setSelectedStore(null);
              }}
              className="w-full py-3 bg-gray-900 hover:bg-black dark:bg-white dark:text-gray-900 text-white rounded-2xl font-black text-xs transition shadow-sm"
            >
              Volver al Marketplace
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
