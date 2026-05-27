'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSocket, joinRoom } from '@/lib/socket';
import { cn, formatCurrency, timeAgo } from '@/lib/utils';
import { ChefHat, Clock, CheckCircle2, ArrowRight, CircleCheck, Package } from 'lucide-react';

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

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string; nextLabel: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-500', next: 'PREPARING', nextLabel: 'Preparar' },
  PREPARING: { label: 'Preparando', color: 'bg-blue-500', next: 'READY', nextLabel: 'Listo!' },
  READY: { label: 'Listo', color: 'bg-green-500', next: 'DELIVERED', nextLabel: 'Entregado' },
};

export default function CocinaPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [productions, setProductions] = useState<ProductionOrder[]>([]);
  const [addQty, setAddQty] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const socket = getSocket();
    joinRoom('kitchen');

    socket.on('order:created', () => { loadOrders(); playSound(); });
    socket.on('order:status_changed', () => loadOrders());
    socket.on('production:updated', () => loadProductions());
    socket.on('vitrina:updated', () => loadProductions());

    return () => {
      socket.off('order:created');
      socket.off('order:status_changed');
      socket.off('production:updated');
      socket.off('vitrina:updated');
    };
  }, []);

  const loadData = async () => {
    await Promise.all([loadOrders(), loadProductions()]);
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

  const handleAddReady = async (id: string) => {
    const qty = parseInt(addQty[id] || '0');
    if (!qty || qty <= 0) return;
    try {
      await api.put(`/production-orders/${id}/add-ready`, { qty });
      toast.success(`${qty} unidades listas registradas`);
      setAddQty((prev) => ({ ...prev, [id]: '' }));
      await loadProductions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error registrando listos');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.put(`/production-orders/${id}/complete`, {});
      toast.success('Orden de producción completada');
      await loadProductions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error completando');
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
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-3rem)]">
      {/* Left: Production Orders */}
      <div className="xl:w-1/3 flex flex-col min-h-0">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
            <Package className="text-salo-orange" size={20} />
            <h2 className="text-lg font-bold">Órdenes de Producción</h2>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {productions.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sin órdenes pendientes</p>
              </div>
            )}
            {productions.map((p) => (
              <div key={p.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  {p.product.photoUrl ? (
                    <img src={p.product.photoUrl} alt={p.product.name} className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <ChefHat size={14} />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{p.product.name}</p>
                    <p className="text-xs text-gray-500">
                      {p.readyQty} de {p.requestedQty} listas
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-3">
                  <div
                    className="bg-salo-orange h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (p.readyQty / Math.max(p.requestedQty, 1)) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="+"
                    value={addQty[p.id] || ''}
                    onChange={(e) => setAddQty((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    className="w-16 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-center"
                  />
                  <button
                    onClick={() => handleAddReady(p.id)}
                    className="flex-1 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition"
                  >
                    + Listos
                  </button>
                  <button
                    onClick={() => handleComplete(p.id)}
                    className="flex-1 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition"
                  >
                    <CircleCheck size={12} className="inline mr-1" />
                    Completar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Prepared Orders */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ChefHat className="text-salo-orange" /> Pedidos Preparados
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
  );
}
