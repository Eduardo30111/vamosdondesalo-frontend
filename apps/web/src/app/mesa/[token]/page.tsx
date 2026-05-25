'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import { getSocket } from '@/lib/socket';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Send,
  UtensilsCrossed,
  CheckCircle2,
  Clock,
  ChefHat,
  X,
} from 'lucide-react';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Product {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  salePrice: number;
}

interface CartItem {
  product: Product;
  qty: number;
  notes: string;
}

interface OrderResponse {
  id: string;
  status: string;
  total: number;
  items: Array<{ qty: number; product: { name: string } }>;
}

interface PaymentMethodConfig {
  method: string;
  qrUrl: string | null;
  key: string | null;
  enabled: boolean;
}

const STATUS_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  PENDING: { label: 'Pedido recibido', icon: Clock, color: 'text-yellow-500' },
  PREPARING: { label: 'Preparando...', icon: ChefHat, color: 'text-blue-500' },
  READY: { label: '¡Listo para recoger!', icon: CheckCircle2, color: 'text-green-500' },
  DELIVERED: { label: 'Entregado', icon: CheckCircle2, color: 'text-purple-500' },
  PAID: { label: 'Pagado', icon: CheckCircle2, color: 'text-green-600' },
};

export default function MesaPage() {
  const params = useParams();
  const token = params.token as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [table, setTable] = useState<{ id: string; number: number } | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMenu();
  }, [token]);

  useEffect(() => {
    if (order) {
      const socket = getSocket();
      socket.emit('join_room', `order:${order.id}`);
      socket.on('order:status_changed', (updated: OrderResponse) => {
        if (updated.id === order.id) {
          setOrder(updated);
          toast.success(`Estado actualizado: ${STATUS_LABELS[updated.status]?.label}`);
        }
      });
      return () => { socket.off('order:status_changed'); };
    }
  }, [order]);

  const loadMenu = async () => {
    try {
      const res = await fetch(`${API_URL}/public/menu/${token}`);
      if (!res.ok) throw new Error('Mesa no encontrada');
      const data = await res.json();
      setProducts(data.products);
      setTable(data.table);
      setPaymentMethods(data.paymentMethods);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error cargando menú');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1, notes: '' }];
    });
    toast.success(`${product.name} agregado`);
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, qty } : i));
    }
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.product.salePrice * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const handleSubmitOrder = async () => {
    if (!customerName.trim()) {
      toast.error('Ingresa tu nombre');
      return;
    }
    if (cart.length === 0) {
      toast.error('Agrega productos al pedido');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TABLE',
          tableId: table?.id,
          customerName,
          items: cart.map((i) => ({ productId: i.product.id, qty: i.qty, notes: i.notes || undefined })),
        }),
      });
      if (!res.ok) throw new Error('Error creando pedido');
      const data = await res.json();
      setOrder(data);
      setCart([]);
      setShowCart(false);
      toast.success('¡Pedido enviado!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-salo-cream dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-salo-cream dark:bg-gray-900 p-4">
        <div className="text-center">
          <p className="text-xl font-bold text-red-500 mb-2">Error</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Order status view
  if (order) {
    const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.PENDING;
    const StatusIcon = statusInfo.icon;

    return (
      <div className="min-h-screen bg-salo-cream dark:bg-gray-900 p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg text-center">
            <div className="w-20 h-20 bg-salo-orange rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">S</span>
            </div>
            <h1 className="text-xl font-bold mb-1">Vamos Donde Salo!</h1>
            <p className="text-gray-500 text-sm mb-6">Mesa {table?.number}</p>

            <div className={`flex flex-col items-center gap-2 mb-6 ${statusInfo.color}`}>
              <StatusIcon size={48} />
              <p className="text-lg font-bold">{statusInfo.label}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4 text-left">
              <p className="text-sm font-medium mb-2">Tu pedido:</p>
              {order.items.map((item, i) => (
                <p key={i} className="text-sm text-gray-600 dark:text-gray-300">
                  {item.qty}x {item.product.name}
                </p>
              ))}
              <p className="font-bold text-salo-orange mt-2">Total: {formatCurrency(order.total)}</p>
            </div>

            {paymentMethods.length > 0 && order.status !== 'PAID' && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-left">
                <p className="text-sm font-medium mb-2">Métodos de pago:</p>
                {paymentMethods.filter(m => m.method !== 'CASH').map((m) => (
                  <div key={m.method} className="mb-2">
                    <p className="text-xs font-medium">{m.method}: {m.key}</p>
                    {m.qrUrl && <img src={m.qrUrl} alt={m.method} className="w-32 h-32 rounded-lg mt-1" />}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-4">El estado se actualiza en tiempo real</p>
          </div>
        </div>
      </div>
    );
  }

  // Menu view
  return (
    <div className="min-h-screen bg-salo-cream dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-salo-orange rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div>
              <h1 className="font-bold text-sm">Vamos Donde Salo!</h1>
              <p className="text-xs text-gray-500">Mesa {table?.number}</p>
            </div>
          </div>
          {cartCount > 0 && (
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 bg-salo-orange text-white rounded-xl"
            >
              <ShoppingCart size={20} />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="max-w-lg mx-auto px-4 py-4 pb-24">
        <h2 className="text-lg font-bold mb-4">Nuestro Menú</h2>
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm flex gap-3">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 relative">
                {product.photoUrl ? (
                  <Image src={product.photoUrl} alt={product.name} fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed size={24} className="text-gray-400" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm">{product.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-salo-orange">{formatCurrency(product.salePrice)}</span>
                  <button
                    onClick={() => addToCart(product)}
                    className="w-8 h-8 bg-salo-orange text-white rounded-lg flex items-center justify-center hover:bg-primary-700 transition"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-30">
          <button
            onClick={() => setShowCart(true)}
            className="w-full py-4 bg-salo-orange text-white rounded-2xl font-bold shadow-lg flex items-center justify-between px-6"
          >
            <span className="flex items-center gap-2"><ShoppingCart size={20} /> Ver pedido ({cartCount})</span>
            <span>{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Cart modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto">
          <div className="max-w-lg mx-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Tu Pedido</h2>
              <button onClick={() => setShowCart(false)} className="p-2"><X size={24} /></button>
            </div>

            <div className="space-y-3 mb-4">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.product.salePrice)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.product.id, item.qty - 1)} className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><Minus size={14} /></button>
                    <span className="w-6 text-center font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.product.id, item.qty + 1)} className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Tu nombre"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm"
                required
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total:</span>
                <span className="text-xl font-bold text-salo-orange">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={submitting || cart.length === 0}
              className="w-full py-4 bg-salo-orange text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-700 transition disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : <><Send size={20} /> Enviar Pedido</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
