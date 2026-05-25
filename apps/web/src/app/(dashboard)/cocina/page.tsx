'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSocket, joinRoom } from '@/lib/socket';
import { cn, formatCurrency, timeAgo } from '@/lib/utils';
import { ChefHat, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

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

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string; nextLabel: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-500', next: 'PREPARING', nextLabel: 'Preparar' },
  PREPARING: { label: 'Preparando', color: 'bg-blue-500', next: 'READY', nextLabel: 'Listo!' },
  READY: { label: 'Listo', color: 'bg-green-500', next: 'DELIVERED', nextLabel: 'Entregado' },
};

export default function CocinaPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadOrders();
    const socket = getSocket();
    joinRoom('kitchen');

    socket.on('order:created', (order: Order) => {
      setOrders((prev) => [...prev, order]);
      playSound();
      toast.success(`Nuevo pedido: ${order.customerName}`);
    });

    socket.on('order:status_changed', (order: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)).filter((o) => ['PENDING', 'PREPARING', 'READY'].includes(o.status)));
    });

    return () => {
      socket.off('order:created');
      socket.off('order:status_changed');
    };
  }, []);

  const loadOrders = async () => {
    try {
      const data = await api.get<Order[]>('/orders/active');
      setOrders(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  };

  const playSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch {}
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const updated = await api.put<Order>(`/orders/${orderId}/status`, { status });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)).filter((o) => ['PENDING', 'PREPARING', 'READY'].includes(o.status)));
      toast.success('Estado actualizado');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error actualizando estado');
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
    <div className="h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ChefHat className="text-salo-orange" />
          Cocina
        </h1>
        <div className="flex gap-3 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            Pendientes: {ordersByStatus.PENDING.length}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            Preparando: {ordersByStatus.PREPARING.length}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Listos: {ordersByStatus.READY.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100%-4rem)]">
        {(['PENDING', 'PREPARING', 'READY'] as const).map((status) => (
          <div key={status} className="flex flex-col min-h-0">
            <div className={cn('px-4 py-2 rounded-t-xl text-white font-bold text-sm', STATUS_CONFIG[status].color)}>
              {STATUS_CONFIG[status].label} ({ordersByStatus[status].length})
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
              {ordersByStatus[status].map((order) => (
                <div
                  key={order.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                >
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
                          <span className="font-bold text-salo-orange">{item.qty}x</span>{' '}
                          {item.product.name}
                        </span>
                        {item.notes && (
                          <span className="text-xs text-gray-400 italic ml-2">{item.notes}</span>
                        )}
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
                        status === 'PENDING' ? 'bg-blue-500' : status === 'PREPARING' ? 'bg-green-500' : 'bg-purple-500'
                      )}
                    >
                      {STATUS_CONFIG[status].nextLabel}
                      <ArrowRight size={16} />
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
  );
}
