'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSocket, joinRoom } from '@/lib/socket';
import { cn, formatCurrency, timeAgo } from '@/lib/utils';
import { ChefHat, Clock, CheckCircle2, ArrowRight, CircleCheck, Package, Plus, X } from 'lucide-react';

interface OrderItem {
  id: string;
  qty: number;
  unitPrice: number;
  notes: string | null;
  product: { id: string; name: string; photoUrl: string | null };
}

interface Order {
  id: string;
  type: string;
  customerName: string;
  status: string;
  notes: string | null;
  total: number;
  createdAt: string;
  items: OrderItem[];
  table?: { id: string; number: number } | null;
}

interface ProductionOrder {
  id: string;
  productId: string;
  requestedQty: number;
  readyQty: number;
  createdAt: string;
  product: { name: string; photoUrl: string | null };
  remaining?: number;
}

interface PreparedProduct {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  salePrice: number;
  costPrice: number;
  preparationMode: string;
  active: boolean;
  authorized: boolean;
  authorizationId?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string; nextLabel: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-500', next: 'PREPARING', nextLabel: 'Empezar' },
  PREPARING: { label: 'Preparando', color: 'bg-blue-500', next: 'READY', nextLabel: 'Listo' },
  READY: { label: 'Listo', color: 'bg-green-500', next: '', nextLabel: '' },
};

export default function CocinaPage() {
  const { user } = useAuthStore() as any;
  const [orders, setOrders] = useState<Order[]>([]);
  const [productions, setProductions] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick action modal for production orders
  const [selectedProd, setSelectedProd] = useState<ProductionOrder | null>(null);
  const [prodModalQty, setProdModalQty] = useState('');
  const [prodModalLoading, setProdModalLoading] = useState(false);

  // Request new production modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestProductId, setRequestProductId] = useState('');
  const [requestQty, setRequestQty] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [vitrinaProductsList, setVitrinaProductsList] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    const socket = getSocket();
    joinRoom('kitchen');

    const handleOrderCreated = () => {
      loadOrders();
      playSound();
    };

    const handleOrderStatusChanged = () => {
      loadOrders();
    };

    const handleProductionUpdated = () => {
      loadProductions();
    };

    const handleVitrinaUpdated = () => {
      loadProductions();
      loadVitrinaProducts();
    };

    socket.on('order:created', handleOrderCreated);
    socket.on('order:status_changed', handleOrderStatusChanged);
    socket.on('production:updated', handleProductionUpdated);
    socket.on('vitrina:updated', handleVitrinaUpdated);

    return () => {
      socket.off('order:created', handleOrderCreated);
      socket.off('order:status_changed', handleOrderStatusChanged);
      socket.off('production:updated', handleProductionUpdated);
      socket.off('vitrina:updated', handleVitrinaUpdated);
    };
  }, []);

  const loadData = async () => {
    await Promise.all([loadOrders(), loadProductions(), loadVitrinaProducts()]);
    setLoading(false);
  };

  const loadOrders = async () => {
    try {
      const data = await api.get<Order[]>('/orders/active');
      setOrders(data.filter((o) => o.status !== 'DELIVERED' && o.status !== 'PAID'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando pedidos');
    }
  };

  const loadProductions = async () => {
    try {
      const data = await api.get<ProductionOrder[]>('/production-orders/pending');
      setProductions(data);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const loadVitrinaProducts = async () => {
    try {
      const data = await api.get<any[]>('/products');
      // Showcase products that are OWN
      setVitrinaProductsList(data.filter((p) => p.preparationMode === 'VITRINA' && p.type === 'OWN'));
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const playSound = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const updated = await api.put<Order>(`/orders/${orderId}/status`, { status });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? updated : o)).filter((o) => o.status !== 'DELIVERED' && o.status !== 'PAID'),
      );
      toast.success('Estado actualizado');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error actualizando estado');
    }
  };

  const handleRegisterReady = async () => {
    if (!selectedProd || !prodModalQty) return;
    const qty = parseInt(prodModalQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Cantidad inválida');
      return;
    }

    setProdModalLoading(true);
    try {
      await api.put(`/production-orders/${selectedProd.id}/add-ready`, { qty });
      toast.success(`${qty} unidades registradas como listas`);
      setSelectedProd(null);
      setProdModalQty('');
      await loadProductions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error registrando listos');
    } finally {
      setProdModalLoading(false);
    }
  };

  const handleCompleteOrder = async (order: ProductionOrder) => {
    if (!confirm(`¿Completar la orden de producción de ${order.product.name}?`)) return;
    try {
      await api.put(`/production-orders/${order.id}/complete`, {});
      toast.success('Orden de producción completada');
      setSelectedProd(null);
      await loadProductions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error completando');
    }
  };

  const handleRequestProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestProductId || !requestQty) return;
    const qty = parseInt(requestQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Cantidad inválida');
      return;
    }

    setRequestLoading(true);
    try {
      await api.post('/production-orders', {
        productId: requestProductId,
        requestedQty: qty,
        userId: 'system',
      });
      toast.success('Solicitud de producción enviada');
      setShowRequestModal(false);
      setRequestProductId('');
      setRequestQty('');
      await loadProductions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error solicitando producción');
    } finally {
      setRequestLoading(false);
    }
  };

  const ordersByStatus = {
    PENDING: orders.filter((o) => o.status === 'PENDING'),
    PREPARING: orders.filter((o) => o.status === 'PREPARING'),
    READY: orders.filter((o) => o.status === 'READY'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-4rem)]">
        {/* Left Production orders panel */}
        <div className="xl:w-1/3 flex flex-col min-h-0">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <Package size={20} className="text-salo-orange" />
                <h2 className="text-lg font-bold">Vitrina (Producción)</h2>
              </div>
              <button
                onClick={() => setShowRequestModal(true)}
                className="p-1.5 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900 text-salo-orange rounded-xl transition flex items-center gap-1 text-xs font-semibold"
                title="Solicitar Producción"
              >
                <Plus size={16} /> Solicitar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {productions.length === 0 && (
                <div className="text-center text-gray-400 py-12">
                  <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50 text-green-500" />
                  <p className="text-sm font-medium">¡Todo al día!</p>
                  <p className="text-xs text-gray-500 mt-1">Sin órdenes de producción pendientes</p>
                </div>
              )}
              {productions.map((p) => {
                const remaining = p.requestedQty - p.readyQty;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProd(p);
                      setProdModalQty('');
                    }}
                    className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3 border border-gray-100 dark:border-gray-700/30 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 mb-2.5">
                      {p.product.photoUrl ? (
                        <img src={p.product.photoUrl} alt={p.product.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-500">
                          <ChefHat size={18} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{p.product.name}</p>
                        <p className="text-xs text-gray-500">
                          Listo: <span className="font-bold text-salo-orange">{p.readyQty}</span> de <span className="font-semibold">{p.requestedQty}</span>
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-salo-orange h-2.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (p.readyQty / Math.max(p.requestedQty, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right prepared orders panel */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ChefHat className="text-salo-orange" /> Pedidos Cocina
            </h1>
            <div className="flex gap-3 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-500" /> Pendientes: {ordersByStatus.PENDING.length}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500" /> Preparando: {ordersByStatus.PREPARING.length}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500" /> Listos: {ordersByStatus.READY.length}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
            {(['PENDING', 'PREPARING', 'READY'] as const).map((status) => (
              <div key={status} className="flex flex-col min-h-0">
                <div className={cn('px-4 py-2 rounded-t-xl text-white font-bold text-sm', STATUS_CONFIG[status].color)}>
                  {STATUS_CONFIG[status].label} ({ordersByStatus[status].length})
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                  {ordersByStatus[status].map((order) => (
                    <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-sm">{order.customerName}</p>
                          <p className="text-xs text-gray-500">
                            {order.type === 'TABLE' && order.table ? `Mesa ${order.table.number}` : order.type === 'TAKEAWAY' ? 'Para llevar' : 'Domicilio'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={12} />
                          {timeAgo(order.createdAt)}
                        </div>
                      </div>
                      <div className="space-y-1 mb-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>
                              <span className="font-bold text-salo-orange">{item.qty}x</span> {item.product.name}
                            </span>
                            {item.notes && <span className="text-xs text-gray-400 italic ml-2">{item.notes}</span>}
                          </div>
                        ))}
                      </div>
                      {order.notes && (
                        <p className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 p-2 rounded-lg mb-3">
                          Nota: {order.notes}
                        </p>
                      )}
                      {STATUS_CONFIG[status].next && (
                        <button
                          onClick={() => updateStatus(order.id, STATUS_CONFIG[status].next)}
                          className={cn(
                            'w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition hover:opacity-90',
                            status === 'PENDING' ? 'bg-blue-500' : status === 'PREPARING' ? 'bg-green-500' : 'bg-purple-500',
                          )}
                        >
                          {STATUS_CONFIG[status].nextLabel} <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {ordersByStatus[status].length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sin pedidos</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Production Order Quick Progress Modal */}
      {selectedProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl overflow-hidden transition-all duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold">Registrar Progreso</h3>
              <button
                onClick={() => setSelectedProd(null)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700">
                {selectedProd.product.photoUrl ? (
                  <img src={selectedProd.product.photoUrl} alt={selectedProd.product.name} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-500">
                    <ChefHat size={20} />
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm">{selectedProd.product.name}</p>
                  <p className="text-xs text-gray-500">
                    Llevas {selectedProd.readyQty} de {selectedProd.requestedQty} listas
                  </p>
                </div>
              </div>

              {/* Quick-tap buttons */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">¿Cuántas acabas de terminar?</label>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: Math.min(12, selectedProd.requestedQty - selectedProd.readyQty) }).map((_, i) => {
                    const num = i + 1;
                    return (
                      <button
                        key={num}
                        onClick={() => setProdModalQty(String(num))}
                        className={cn(
                          'py-2.5 rounded-xl text-sm font-bold transition border border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:text-salo-orange',
                          prodModalQty === String(num)
                            ? 'bg-salo-orange text-white border-salo-orange hover:bg-salo-orange hover:text-white'
                            : 'bg-white dark:bg-gray-800'
                        )}
                      >
                        {num}
                      </button>
                    );
                  })}
                  {selectedProd.requestedQty - selectedProd.readyQty > 12 && (
                    <button
                      onClick={() => setProdModalQty(String(selectedProd.requestedQty - selectedProd.readyQty))}
                      className={cn(
                        'py-2.5 rounded-xl text-xs font-bold transition border border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-950/20 col-span-2',
                        prodModalQty === String(selectedProd.requestedQty - selectedProd.readyQty)
                          ? 'bg-salo-orange text-white border-salo-orange hover:bg-salo-orange hover:text-white'
                          : 'bg-white dark:bg-gray-800'
                      )}
                    >
                      Todos ({selectedProd.requestedQty - selectedProd.readyQty})
                    </button>
                  )}
                </div>
              </div>

              {/* Custom qty inputs */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Cantidad manual"
                  value={prodModalQty}
                  onChange={(e) => setProdModalQty(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-orange-400 text-center font-bold"
                  min="1"
                  max={selectedProd.requestedQty - selectedProd.readyQty}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleCompleteOrder(selectedProd)}
                  className="flex-1 py-3 border border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition"
                >
                  <CircleCheck size={14} />
                  Completar Todas
                </button>
                <button
                  onClick={handleRegisterReady}
                  disabled={prodModalLoading || !prodModalQty}
                  className="flex-1 py-3 bg-salo-orange hover:bg-primary-700 text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50"
                >
                  {prodModalLoading ? 'Guardando...' : 'Registrar Listas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin solicitar producción modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-hidden transition-all duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold">Solicitar Producción</h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRequestProduction} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Producto a preparar</label>
                <select
                  value={requestProductId}
                  onChange={(e) => setRequestProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  required
                >
                  <option value="">Selecciona un producto</option>
                  {vitrinaProductsList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Cantidad a producir</label>
                <input
                  type="number"
                  placeholder="Ej: 10"
                  value={requestQty}
                  onChange={(e) => setRequestQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  min="1"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={requestLoading || !requestProductId || !requestQty}
                className="w-full py-3 rounded-xl bg-salo-orange hover:bg-primary-700 text-white font-bold transition shadow-md disabled:opacity-50"
              >
                {requestLoading ? 'Solicitando...' : 'Enviar Solicitud a Cocina'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple helper component import fallback if it's missing in imports (auth store is imported dynamically in next)
import { useAuthStore } from '@/store/auth';
