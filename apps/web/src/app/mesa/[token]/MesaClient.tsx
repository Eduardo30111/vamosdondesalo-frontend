'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import { formatErrorMessage } from '@/lib/error-handler';
import { getSocket } from '@/lib/socket';
import {
  ShoppingCart,
  Plus,
  Minus,
  Send,
  UtensilsCrossed,
  CheckCircle2,
  Clock,
  ChefHat,
  X,
  Flame,
  User,
} from 'lucide-react';

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

const STATUS_LABELS: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  PENDING: { label: 'Pedido recibido', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
  PREPARING: { label: 'Preparando tu pedido...', icon: ChefHat, color: 'text-blue-500', bg: 'bg-blue-50' },
  READY: { label: '¡Listo para recoger!', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  DELIVERED: { label: 'Entregado', icon: CheckCircle2, color: 'text-purple-500', bg: 'bg-purple-50' },
  PAID: { label: 'Pagado', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  NEQUI: 'Nequi',
  BANCOLOMBIA: 'Bancolombia',
  DAVIPLATA: 'Daviplata',
  TRANSFER: 'Transferencia',
  BREB: 'Breb',
};

export default function MesaPage() {
  const params = useParams();
  const token = params.token as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [table, setTable] = useState<{ id: string; number: number } | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('CASH');
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
      setError(formatErrorMessage(err, 'Error cargando menú'));
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
    toast.success(`${product.name} agregado`, { duration: 1500 });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, qty } : i));
    }
  };

  const getItemQty = (productId: string) => {
    return cart.find(i => i.product.id === productId)?.qty || 0;
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
          notes: `Método de pago: ${METHOD_LABELS[selectedPaymentMethod] || selectedPaymentMethod}`,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Error ${res.status}`);
      }
      const data = await res.json();
      setOrder(data);
      setCart([]);
      setShowCart(false);
      toast.success('¡Pedido enviado!');
    } catch (err: unknown) {
      toast.error(formatErrorMessage(err, 'No se pudo enviar el pedido'));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading ──────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-salo-orange to-amber-500 flex items-center justify-center shadow-lg shadow-orange-200 animate-pulse">
            <UtensilsCrossed size={28} className="text-white" />
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-400 font-medium animate-pulse">Cargando menú...</p>
      </div>
    );
  }

  // ─── Error ────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4">
        <div className="text-center bg-white rounded-3xl p-8 shadow-xl shadow-gray-100 max-w-sm w-full">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <X size={28} className="text-red-400" />
          </div>
          <p className="text-lg font-bold text-gray-800 mb-1">Oops!</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // ─── Order Status ─────────────────────────
  if (order) {
    const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.PENDING;
    const StatusIcon = statusInfo.icon;

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-100/50 text-center">
            {/* Logo */}
            <div className="w-20 h-20 bg-gradient-to-br from-salo-orange to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
              <Flame size={32} className="text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-gray-800 mb-0.5">Vamos Donde Salo!</h1>
            <p className="text-sm text-gray-400 font-medium mb-8">{table?.number === 0 ? 'Recepción' : `Mesa ${table?.number}`}</p>

            {/* Status badge */}
            <div className={cn('inline-flex flex-col items-center gap-3 px-8 py-5 rounded-2xl mb-8', statusInfo.bg)}>
              <StatusIcon size={44} className={statusInfo.color} strokeWidth={1.5} />
              <p className={cn('text-base font-bold', statusInfo.color)}>{statusInfo.label}</p>
            </div>

            {/* Order details */}
            <div className="bg-gray-50 rounded-2xl p-5 mb-5 text-left">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tu pedido</p>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{item.qty}× {item.product.name}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 mt-4 pt-3 flex justify-between items-center">
                <span className="font-semibold text-gray-600">Total</span>
                <span className="text-lg font-extrabold text-salo-orange">{formatCurrency(order.total)}</span>
              </div>
            </div>

            {paymentMethods.length > 0 && order.status !== 'PAID' && (
              <div className="bg-gray-50 rounded-2xl p-5 text-left">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Métodos de pago</p>
                {paymentMethods.filter(m => m.method !== 'CASH').map((m) => (
                  <div key={m.method} className="mb-3 last:mb-0">
                    <p className="text-sm font-medium text-gray-700">{m.method}: <span className="text-gray-500">{m.key}</span></p>
                    {m.qrUrl && <img src={m.qrUrl} alt={m.method} className="w-32 h-32 rounded-xl mt-2 shadow-sm" />}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-xs text-gray-400">Actualización en tiempo real</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Menu View ────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <div className="sticky top-0 z-40">
        <div className="bg-gradient-to-r from-salo-orange to-amber-500 shadow-lg shadow-orange-200/40">
          <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Flame size={22} className="text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-white text-base leading-tight">Vamos Donde Salo!</h1>
                <p className="text-[11px] text-white/70 font-medium">{table?.number === 0 ? 'Recepción' : `Mesa ${table?.number}`} · Menú digital</p>
              </div>
            </div>
            {cartCount > 0 && (
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl active:scale-95 transition-transform"
              >
                <ShoppingCart size={20} />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-salo-orange text-[10px] rounded-full flex items-center justify-center font-extrabold shadow-md">
                  {cartCount}
                </span>
              </button>
            )}
          </div>
        </div>
        {/* Curved separator */}
        <div className="h-4 bg-gradient-to-b from-orange-50/80 to-transparent" />
      </div>

      {/* Products */}
      <div className="max-w-lg mx-auto px-4 pb-28">
        <div className="flex items-center gap-2 mb-5">
          <Flame size={18} className="text-salo-orange" />
          <h2 className="text-lg font-extrabold text-gray-800">Nuestro Menú</h2>
        </div>

        <div className="space-y-3">
          {products.map((product, index) => {
            const itemQty = getItemQty(product.id);
            return (
              <div
                key={product.id}
                className="group bg-white rounded-2xl shadow-sm shadow-gray-100/80 border border-gray-100/60 overflow-hidden hover:shadow-md hover:shadow-orange-100/50 transition-all duration-300"
                style={{ animation: `fadeSlideUp 0.4s ease-out ${index * 0.05}s both` }}
              >
                <div className="flex">
                  {/* Image */}
                  <div className="w-28 min-h-[7rem] relative flex-shrink-0 bg-gradient-to-br from-orange-50 to-amber-50">
                    {product.photoUrl ? (
                      <img
                        src={product.photoUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UtensilsCrossed size={28} className="text-orange-200" />
                      </div>
                    )}
                    {/* Qty badge on image */}
                    {itemQty > 0 && (
                      <div className="absolute top-2 left-2 w-6 h-6 bg-salo-orange text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-md">
                        {itemQty}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-bold text-[15px] text-gray-800 leading-tight">{product.name}</h3>
                      {product.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-base font-extrabold text-salo-orange">{formatCurrency(product.salePrice)}</span>
                      {itemQty > 0 ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(product.id, itemQty - 1)}
                            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center active:scale-90 transition-transform text-gray-500 hover:bg-gray-200"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-7 text-center font-bold text-sm text-gray-800">{itemQty}</span>
                          <button
                            onClick={() => addToCart(product)}
                            className="w-8 h-8 rounded-xl bg-salo-orange flex items-center justify-center active:scale-90 transition-transform text-white shadow-sm shadow-orange-200"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="w-9 h-9 bg-gradient-to-br from-salo-orange to-amber-500 text-white rounded-xl flex items-center justify-center active:scale-90 transition-transform shadow-md shadow-orange-200/50"
                        >
                          <Plus size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-5 left-4 right-4 max-w-lg mx-auto z-30">
          <button
            onClick={() => setShowCart(true)}
            className="w-full py-4 bg-gradient-to-r from-salo-orange to-amber-500 text-white rounded-2xl font-bold shadow-xl shadow-orange-300/40 flex items-center justify-between px-6 active:scale-[0.98] transition-transform"
          >
            <span className="flex items-center gap-2.5">
              <ShoppingCart size={20} />
              <span>Ver pedido</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-extrabold">{cartCount}</span>
            </span>
            <span className="font-extrabold text-lg">{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Cart modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setShowCart(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            {/* Handle */}
            <div className="sticky top-0 bg-white pt-3 pb-2 px-6 rounded-t-3xl z-10">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-gray-800">Tu Pedido</h2>
                <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="px-6 pb-8">
              {/* Cart items */}
              <div className="space-y-3 mt-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-orange-50 flex-shrink-0">
                      {item.product.photoUrl ? (
                        <img src={item.product.photoUrl} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UtensilsCrossed size={18} className="text-orange-200" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400 font-medium">{formatCurrency(item.product.salePrice)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(item.product.id, item.qty - 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <Minus size={12} className="text-gray-500" />
                      </button>
                      <span className="w-6 text-center font-bold text-sm">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.product.id, item.qty + 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <Plus size={12} className="text-gray-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer name */}
              <div className="mt-6">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Tu nombre</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    type="text"
                    placeholder="¿Cómo te llamas?"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-salo-orange/30 focus:border-salo-orange transition-all"
                    required
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="mt-6 space-y-3">
                <label className="text-xs font-semibold text-gray-450 uppercase tracking-wider block">Método de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods && paymentMethods.length > 0 ? (
                    paymentMethods.map((m) => {
                      const isSelected = selectedPaymentMethod === m.method;
                      return (
                        <button
                          key={m.method}
                          type="button"
                          onClick={() => setSelectedPaymentMethod(m.method)}
                          className={`p-3 rounded-2xl border text-left font-bold text-xs transition-all flex flex-col gap-0.5 relative overflow-hidden ${
                            isSelected
                              ? 'border-salo-orange bg-salo-orange text-white shadow-sm'
                              : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span className="font-bold truncate">{METHOD_LABELS[m.method] || m.method}</span>
                          {m.key && (
                            <span className={`text-[9px] font-medium truncate ${isSelected ? 'text-orange-100' : 'text-gray-400'}`}>
                              {m.key}
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-2 p-3 rounded-2xl border border-gray-100 text-center text-xs text-gray-400">
                      Cargando métodos de pago...
                    </div>
                  )}
                </div>
              </div>

              {/* QR Display for Transfers / Nequi Alert */}
              {selectedPaymentMethod !== 'CASH' && (
                <div className="mt-4 bg-gray-50 border border-gray-150 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3">
                  <p className="text-[11px] font-bold text-gray-500 text-center">
                    Escanea el código QR para transferir
                  </p>
                  {paymentMethods.find((m) => m.method === selectedPaymentMethod)?.qrUrl ? (
                    <img
                      src={paymentMethods.find((m) => m.method === selectedPaymentMethod)?.qrUrl || undefined}
                      alt={`QR ${selectedPaymentMethod}`}
                      className="w-40 h-40 object-contain rounded-xl border bg-white shadow-sm"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center rounded-xl border bg-white text-gray-400 text-xs text-center p-3">
                      Sin código QR
                    </div>
                  )}
                  {paymentMethods.find((m) => m.method === selectedPaymentMethod)?.key && (
                    <p className="text-xs font-bold text-center text-gray-700">
                      Número / Referencia: {paymentMethods.find((m) => m.method === selectedPaymentMethod)?.key}
                    </p>
                  )}
                  {selectedPaymentMethod === 'NEQUI' && (
                    <div className="p-2.5 bg-purple-50 border border-purple-100 rounded-xl text-center w-full">
                      <span className="text-[10px] font-bold text-purple-700 block">
                        📢 Muéstrale al vendedor el comprobante para recibir tu pedido
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="mt-5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-600">Total a pagar</span>
                  <span className="text-2xl font-extrabold text-salo-orange">{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmitOrder}
                disabled={submitting || cart.length === 0}
                className="w-full mt-5 py-4 bg-gradient-to-r from-salo-orange to-amber-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-orange-200/50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    <span>Enviar Pedido</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
