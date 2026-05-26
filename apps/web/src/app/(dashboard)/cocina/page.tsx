'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSocket, joinRoom } from '@/lib/socket';
import { cn, formatCurrency, timeAgo } from '@/lib/utils';
import { ChefHat, Clock, CheckCircle2, ArrowRight, Play, Plus, CircleCheck } from 'lucide-react';

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

interface VitrinaRow {
  productId: string;
  name: string;
  photoUrl: string | null;
  startedQty: number;
  readyQty: number;
  remainingStock: number;
}

interface Production {
  id: string;
  productId: string;
  startedQty: number;
  readyQty: number;
  status: string;
  product: { name: string; photoUrl: string | null };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string; nextLabel: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-500', next: 'PREPARING', nextLabel: 'Preparar' },
  PREPARING: { label: 'Preparando', color: 'bg-blue-500', next: 'READY', nextLabel: 'Listo!' },
  READY: { label: 'Listo', color: 'bg-green-500', next: 'DELIVERED', nextLabel: 'Entregado' },
};

export default function CocinaPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [vitrina, setVitrina] = useState<VitrinaRow[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStart, setShowStart] = useState(false);
  const [startProductId, setStartProductId] = useState('');
  const [startQty, setStartQty] = useState('');
  const [addQty, setAddQty] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
    const socket = getSocket();
    joinRoom('kitchen');

    socket.on('order:created', () => { loadOrders(); playSound(); });
    socket.on('order:status_changed', () => loadOrders());
    socket.on('production:updated', () => loadProductionData());
    socket.on('daily_stock:changed', () => loadProductionData());

    return () => {
      socket.off('order:created');
      socket.off('order:status_changed');
      socket.off('production:updated');
      socket.off('daily_stock:changed');
    };
  }, []);

  const loadData = async () => {
    await Promise.all([loadOrders(), loadProductionData()]);
    setLoading(false);
  };

  const loadOrders = async () => {
    try {
      const data = await api.get<Order[]>('/orders/active');
      setOrders(data.filter((o) => o.status !== 'DELIVERED'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando pedidos');
    }
  };

  const loadProductionData = async () => {
    try {
      const [vitrinaData, prodData] = await Promise.all([
        api.get<VitrinaRow[]>('/kitchen-production/vitrina'),
        api.get<Production[]>('/kitchen-production/active'),
      ]);
      setVitrina(vitrinaData);
      setProductions(prodData);
    } catch (err: unknown) {
      console.error(err);
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
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)).filter((o) => ['PENDING', 'PREPARING', 'READY', 'IN_TRANSIT'].includes(o.status)));
      toast.success('Estado actualizado');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error actualizando estado');
    }
  };

  const handleStartProduction = async () => {
    if (!startProductId || !startQty) { toast.error('Completa todos los campos'); return; }
    try {
      await api.post('/kitchen-production', { productId: startProductId, startedQty: parseInt(startQty) });
      toast.success('Tanda iniciada');
      setShowStart(false);
      setStartProductId('');
      setStartQty('');
      await loadProductionData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleAddReady = async (id: string) => {
    const qty = parseInt(addQty[id] || '0');
    if (!qty) return;
    try {
      await api.put(`/kitchen-production/${id}/add-ready`, { qty });
      toast.success('Listos actualizados');
      setAddQty((prev) => ({ ...prev, [id]: '' }));
      await loadProductionData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.put(`/kitchen-production/${id}/complete`, {});
      toast.success('Tanda completada');
      await loadProductionData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
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
      {/* Production Vitrina */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><ChefHat className="text-salo-orange" /> Vitrina de Producción</h2>
          <button onClick={() => setShowStart(true)} className="px-3 py-2 bg-salo-orange text-white rounded-xl text-xs font-medium flex items-center gap-1"><Play size={14} /> Iniciar Tanda</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {vitrina.map((row) => (
            <div key={row.productId} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                {row.photoUrl ? (
                  <img src={row.photoUrl} alt={row.name} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center"><ChefHat size={14} /></div>
                )}
                <span className="text-sm font-medium truncate">{row.name}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>En tanda: {row.startedQty}</span>
                  <span>Stock: {row.remainingStock}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-salo-orange h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (row.readyQty / Math.max(row.startedQty, 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-xs font-bold text-center">{row.readyQty} de {row.startedQty} listas</p>
              </div>
            </div>
          ))}
        </div>

        {productions.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-500">Tandas Activas</h3>
            {productions.map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.product.name}</p>
                  <p className="text-xs text-gray-500">{p.readyQty} / {p.startedQty} listas</p>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    placeholder="+" 
                    value={addQty[p.id] || ''} 
                    onChange={(e) => setAddQty((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    className="w-14 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-center"
                  />
                  <button onClick={() => handleAddReady(p.id)} className="px-2 py-1 bg-blue-500 text-white rounded-lg text-xs"><Plus size={12} /></button>
                  <button onClick={() => handleComplete(p.id)} className="px-2 py-1 bg-green-500 text-white rounded-lg text-xs"><CircleCheck size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders Kanban */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ChefHat className="text-salo-orange" /> Pedidos</h1>
        <div className="flex gap-3 text-sm">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500" /> Pendientes: {ordersByStatus.PENDING.length}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" /> Preparando: {ordersByStatus.PREPARING.length}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" /> Listos: {ordersByStatus.READY.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['PENDING', 'PREPARING', 'READY'] as const).map((status) => (
          <div key={status} className="flex flex-col min-h-0">
            <div className={cn('px-4 py-2 rounded-t-xl text-white font-bold text-sm', STATUS_CONFIG[status].color)}>
              {STATUS_CONFIG[status].label} ({ordersByStatus[status].length})
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl max-h-[500px]">
              {ordersByStatus[status].map((order) => (
                <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-sm">{order.customerName}</p>
                      <p className="text-xs text-gray-500">{order.type === 'TABLE' && order.table ? `Mesa ${order.table.number}` : order.type === 'TAKEAWAY' ? 'Para llevar' : 'Domicilio'}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400"><Clock size={12} />{timeAgo(order.createdAt)}</div>
                  </div>
                  <div className="space-y-1 mb-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span><span className="font-bold text-salo-orange">{item.qty}x</span> {item.product.name}</span>
                        {item.notes && <span className="text-xs text-gray-400 italic ml-2">{item.notes}</span>}
                      </div>
                    ))}
                  </div>
                  {order.notes && <p className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 p-2 rounded-lg mb-3">Nota: {order.notes}</p>}
                  {STATUS_CONFIG[status].next && (
                    <button onClick={() => updateStatus(order.id, STATUS_CONFIG[status].next)} className={cn('w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition hover:opacity-90', status === 'PENDING' ? 'bg-blue-500' : status === 'PREPARING' ? 'bg-green-500' : 'bg-purple-500')}>
                      {STATUS_CONFIG[status].nextLabel} <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              ))}
              {ordersByStatus[status].length === 0 && (
                <div className="text-center text-gray-400 py-8"><CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm">Sin pedidos</p></div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Start Production Modal */}
      {showStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Iniciar Tanda</h3>
            <div className="space-y-3">
              <select value={startProductId} onChange={(e) => setStartProductId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm">
                <option value="">Seleccionar producto...</option>
                {vitrina.map((v) => <option key={v.productId} value={v.productId}>{v.name}</option>)}
              </select>
              <input type="number" placeholder="Cantidad a preparar" value={startQty} onChange={(e) => setStartQty(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
              <div className="flex gap-2">
                <button onClick={() => setShowStart(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium">Cancelar</button>
                <button onClick={handleStartProduction} className="flex-1 py-2.5 rounded-xl bg-salo-orange text-white text-sm font-medium">Iniciar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
