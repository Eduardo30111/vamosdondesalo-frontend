'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSocket, joinRoom } from '@/lib/socket';
import { cn, formatCurrency, timeAgo } from '@/lib/utils';
import { ChefHat, Clock, CheckCircle2, ArrowRight, CircleCheck, Package, Plus, X, CalendarDays, ToggleLeft, ToggleRight, History, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

interface OrderItem {
  id: string;
  qty: number;
  unitPrice: number;
  notes: string | null;
  isPrep?: boolean;
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

interface DailySummary {
  date: string;
  vitrina: Array<{ productId: string; name: string; qty: number }>;
  preparados: Array<{ productId: string; name: string; qty: number }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string; nextLabel: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-500', next: 'PREPARING', nextLabel: 'Empezar' },
  PREPARING: { label: 'Preparando', color: 'bg-blue-500', next: 'READY', nextLabel: 'Listo' },
  READY: { label: 'Listo', color: 'bg-green-500', next: '', nextLabel: '' },
};

type TabKey = 'pedidos' | 'autorizaciones' | 'historial';

export default function CocinaPage() {
  const { user } = useAuthStore() as any;
  const [activeTab, setActiveTab] = useState<TabKey>('pedidos');
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

  // Authorizations tab state
  const [preparedProducts, setPreparedProducts] = useState<PreparedProduct[]>([]);
  const [authLoading, setAuthLoading] = useState(false);

  // History tab state
  const [historyMonth, setHistoryMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

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

  // Load history when tab changes or month changes
  useEffect(() => {
    if (activeTab === 'historial') {
      loadHistory();
    }
  }, [activeTab, historyMonth]);

  // Load authorizations when tab changes
  useEffect(() => {
    if (activeTab === 'autorizaciones') {
      loadAuthorizations();
    }
  }, [activeTab]);

  const loadData = async () => {
    await Promise.all([loadOrders(), loadProductions(), loadVitrinaProducts()]);
    setLoading(false);
  };

  const loadOrders = async () => {
    try {
      const data = await api.get<Order[]>('/orders/cocina');
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

  const loadAuthorizations = async () => {
    setAuthLoading(true);
    try {
      const data = await api.get<{ availableProducts: PreparedProduct[] }>('/prepared-authorizations');
      setPreparedProducts(data.availableProducts || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando autorizaciones');
    } finally {
      setAuthLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await api.get<DailySummary[]>(`/orders/cocina/daily-summary?month=${historyMonth}`);
      setDailySummaries(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando historial');
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleAuthorization = async (product: PreparedProduct) => {
    try {
      if (product.authorized) {
        await api.delete(`/prepared-authorizations/${product.id}`);
        toast.success(`${product.name} desautorizado`);
      } else {
        await api.post('/prepared-authorizations', { productId: product.id });
        toast.success(`${product.name} autorizado para hoy`);
      }
      await loadAuthorizations();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error actualizando autorización');
    }
  };

  const handleDeleteProduct = async (product: PreparedProduct) => {
    if (!confirm(`¿Eliminar el producto "${product.name}" de forma permanente del catálogo?`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      toast.success('Producto eliminado con éxito');
      await loadAuthorizations();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error eliminando el producto');
    }
  };

  const handleDeleteProductionOrder = async (prod: ProductionOrder) => {
    if (!confirm(`¿Eliminar la solicitud de producción para ${prod.product.name}?`)) return;
    try {
      await api.delete(`/production-orders/${prod.id}`);
      toast.success('Solicitud de producción eliminada');
      setSelectedProd(null);
      await loadProductions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error eliminando la solicitud');
    }
  };

  const handleRemoveItemFromOrder = async (orderId: string, itemId: string, productName: string) => {
    if (!confirm(`¿Eliminar "${productName}" de este pedido?`)) return;
    try {
      await api.put(`/orders/${orderId}/remove-item/${itemId}`);
      toast.success('Producto eliminado del pedido');
      await loadOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error eliminando el producto');
    }
  };

  const handleCancelOrder = async (orderId: string, customerName: string) => {
    if (!confirm(`¿Cancelar el pedido de "${customerName}" por completo?`)) return;
    try {
      await api.put(`/orders/${orderId}/cancelar`);
      toast.success('Pedido cancelado');
      await loadOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cancelando el pedido');
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

  const handleAddStock = async (productId: string, qty: number) => {
    if (isNaN(qty) || qty <= 0) {
      toast.error('Cantidad inválida');
      return;
    }
    try {
      await api.put(`/products/${productId}/add-vitrina-stock`, { qty });
      toast.success('Stock de vitrina actualizado');

      // Auto-fulfill any matching pending production orders for this product
      const matchingProductions = productions.filter(p => p.productId === productId);
      if (matchingProductions.length > 0) {
        const pendingOrder = matchingProductions[0];
        const remaining = pendingOrder.requestedQty - pendingOrder.readyQty;
        if (qty >= remaining) {
          await api.put(`/production-orders/${pendingOrder.id}/complete`, {});
        } else {
          await api.put(`/production-orders/${pendingOrder.id}/add-ready`, { qty });
        }
      }

      await loadVitrinaProducts();
      await loadProductions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error actualizando stock');
    }
  };

  const ordersByStatus = {
    PENDING: orders.filter((o) => o.status === 'PENDING'),
    PREPARING: orders.filter((o) => o.status === 'PREPARING'),
    READY: orders.filter((o) => o.status === 'READY'),
  };

  const toggleDayExpanded = (date: string) => {
    setExpandedDays((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" />
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'pedidos', label: 'Pedidos', icon: <ChefHat size={16} />, count: orders.length },
    { key: 'autorizaciones', label: 'Autorizar Preparados', icon: <ToggleRight size={16} /> },
    { key: 'historial', label: 'Historial', icon: <History size={16} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200',
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-salo-orange shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                'ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold',
                activeTab === tab.key ? 'bg-salo-orange text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Pedidos */}
      {activeTab === 'pedidos' && (
        <div className="flex flex-col xl:flex-row gap-6" style={{ height: 'calc(100vh - 10rem)' }}>
          {/* Left Vitrina Stock controls panel */}
          <div className="xl:w-1/3 flex flex-col min-h-0">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-salo-orange" />
                  <h2 className="text-lg font-bold">Stock de Vitrina</h2>
                </div>
                <span className="text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-lg">
                  {vitrinaProductsList.length} productos
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {vitrinaProductsList.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-sm">No hay productos en vitrina</p>
                ) : (
                  vitrinaProductsList.map((p) => {
                    const currentStock = p.vitrinaStock?.qty ?? 0;
                    const pendingQty = productions
                      .filter((pr) => pr.productId === p.id)
                      .reduce((sum, pr) => sum + (pr.requestedQty - pr.readyQty), 0);

                    return (
                      <div
                        key={p.id}
                        className="bg-gray-50/50 dark:bg-gray-750/30 rounded-2xl p-4 border border-gray-150/40 dark:border-gray-700/50 flex flex-col gap-3 shadow-xs hover:border-orange-200/60 dark:hover:border-orange-900/30 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          {p.photoUrl ? (
                            <img src={p.photoUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover border border-gray-100 dark:border-gray-700" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/25 flex items-center justify-center text-salo-orange shrink-0">
                              <ChefHat size={20} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black truncate text-gray-900 dark:text-white">{p.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                                currentStock > 0 
                                  ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400' 
                                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                              }`}>
                                Stock: {currentStock}
                              </span>
                              {pendingQty > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-yellow-55 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400 animate-pulse">
                                  ⏳ Solicitado: {pendingQty}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Stock Adder controls */}
                        <div className="flex items-center gap-2 pt-2.5 border-t border-gray-100/60 dark:border-gray-700/40">
                          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 flex-1 shadow-xs">
                            <Plus size={13} className="text-gray-400 mr-1" />
                            <input
                              type="number"
                              placeholder="Cant."
                              min="1"
                              id={`add-stock-${p.id}`}
                              className="bg-transparent border-none outline-none text-xs font-bold w-full text-gray-700 dark:text-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const input = e.currentTarget;
                                  handleAddStock(p.id, parseInt(input.value));
                                  input.value = '';
                                }
                              }}
                            />
                          </div>
                          <button
                            onClick={() => {
                              const input = document.getElementById(`add-stock-${p.id}`) as HTMLInputElement;
                              if (input && input.value) {
                                handleAddStock(p.id, parseInt(input.value));
                                input.value = '';
                              } else {
                                handleAddStock(p.id, 1);
                              }
                            }}
                            className="px-3.5 py-2 bg-salo-orange hover:bg-orange-600 text-white rounded-xl text-xs font-black shadow-xs transition"
                          >
                            Añadir
                          </button>
                          
                          {/* Quick addition shortcuts */}
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => handleAddStock(p.id, 5)}
                              className="px-2 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-650 dark:text-gray-300 rounded-xl text-[10px] font-black transition"
                            >
                              +5
                            </button>
                            <button
                              onClick={() => handleAddStock(p.id, 10)}
                              className="px-2 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-650 dark:text-gray-300 rounded-xl text-[10px] font-black transition"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
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
                              {order.type === 'TABLE' && order.table ? (order.table.number === 0 ? 'Recepción' : `Mesa ${order.table.number}`) : order.type === 'TAKEAWAY' ? 'Para llevar' : 'Domicilio'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={12} />
                            {timeAgo(order.createdAt)}
                          </div>
                        </div>
                        <div className="space-y-1 mb-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-sm">
                              <span>
                                <span className="font-bold text-salo-orange">{item.qty}x</span> {item.product.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {item.notes && <span className="text-xs text-gray-400 italic mr-1">{item.notes}</span>}
                                <button
                                  onClick={() => handleRemoveItemFromOrder(order.id, item.id, item.product.name)}
                                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition"
                                  title="Eliminar este producto"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {order.notes && (
                          <p className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 p-2 rounded-lg mb-3">
                            Nota: {order.notes}
                          </p>
                        )}
                        <div className="flex gap-2">
                          {STATUS_CONFIG[status].next && (
                            <button
                              onClick={() => updateStatus(order.id, STATUS_CONFIG[status].next)}
                              className={cn(
                                'flex-1 py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition hover:opacity-90',
                                status === 'PENDING' ? 'bg-blue-500' : status === 'PREPARING' ? 'bg-green-500' : 'bg-purple-500',
                              )}
                            >
                              {STATUS_CONFIG[status].nextLabel} <ArrowRight size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleCancelOrder(order.id, order.customerName)}
                            className="px-3.5 py-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl transition flex items-center justify-center hover:opacity-90"
                            title="Cancelar Pedido"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
      )}

      {/* Tab: Autorizaciones */}
      {activeTab === 'autorizaciones' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ToggleRight className="text-salo-orange" size={22} />
              Autorizar Productos Preparados para Hoy
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Activa los productos preparados que están disponibles para vender el día de hoy. Solo los autorizados aparecerán en la landing page.
            </p>
          </div>
          {authLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-salo-orange" />
            </div>
          ) : preparedProducts.length === 0 ? (
            <div className="text-center text-gray-400 py-16">
              <ChefHat size={40} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium">No hay productos preparados registrados</p>
              <p className="text-sm text-gray-500 mt-1">Crea productos con modo &quot;PREPARADO&quot; desde el panel de productos</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {preparedProducts.map((product) => (
                <div
                  key={product.id}
                  className={cn(
                    'flex items-center justify-between p-4 transition-colors',
                    product.authorized ? 'bg-green-50/50 dark:bg-green-950/10' : ''
                  )}
                >
                  <div className="flex items-center gap-3">
                    {product.photoUrl ? (
                      <img src={product.photoUrl} alt={product.name} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                        <ChefHat size={20} />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(product.salePrice)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAuthorization(product)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
                        product.authorized
                          ? 'bg-green-500 text-white hover:bg-green-600 shadow-md shadow-green-500/20'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                      )}
                    >
                      {product.authorized ? (
                        <>
                          <ToggleRight size={18} />
                          Autorizado
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={18} />
                          Desactivado
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition"
                      title="Eliminar producto"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Historial */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <History className="text-salo-orange" size={22} />
                Historial de Producción Diaria
              </h2>
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-gray-400" />
                <input
                  type="month"
                  value={historyMonth}
                  onChange={(e) => setHistoryMonth(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-salo-orange" />
            </div>
          ) : dailySummaries.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <History size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="font-medium text-gray-500">Sin registros para este mes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailySummaries.map((day) => {
                const isExpanded = expandedDays[day.date] ?? false;
                const totalVitrina = day.vitrina.reduce((sum, v) => sum + v.qty, 0);
                const totalPreparados = day.preparados.reduce((sum, p) => sum + p.qty, 0);

                return (
                  <div key={day.date} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <button
                      onClick={() => toggleDayExpanded(day.date)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                          <CalendarDays size={18} className="text-salo-orange" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">
                            {new Date(day.date + 'T12:00:00').toLocaleDateString('es-CO', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            Vitrina: {totalVitrina} uds · Preparados: {totalPreparados} uds
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:flex gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-bold">
                            🏪 {totalVitrina}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 text-xs font-bold">
                            👨‍🍳 {totalPreparados}
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-4">
                        {day.vitrina.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <Package size={14} /> Producción Vitrina
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {day.vitrina.map((item) => (
                                <div key={item.productId} className="flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/10 rounded-xl px-3 py-2.5 border border-blue-100/50 dark:border-blue-900/20">
                                  <span className="text-sm font-medium truncate">{item.name}</span>
                                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 ml-2">{item.qty}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {day.preparados.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <ChefHat size={14} /> Preparados Vendidos
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {day.preparados.map((item) => (
                                <div key={item.productId} className="flex items-center justify-between bg-green-50/50 dark:bg-green-950/10 rounded-xl px-3 py-2.5 border border-green-100/50 dark:border-green-900/20">
                                  <span className="text-sm font-medium truncate">{item.name}</span>
                                  <span className="text-sm font-bold text-green-600 dark:text-green-400 ml-2">{item.qty}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleCompleteOrder(selectedProd)}
                    className="flex-1 py-3 border border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 font-bold rounded-xl text-[10px] flex items-center justify-center gap-1 transition"
                  >
                    <CircleCheck size={14} />
                    Completar Todas
                  </button>
                  <button
                    onClick={handleRegisterReady}
                    disabled={prodModalLoading || !prodModalQty}
                    className="flex-1 py-3 bg-salo-orange hover:bg-primary-700 text-white font-bold rounded-xl text-[10px] transition shadow-md disabled:opacity-50"
                  >
                    {prodModalLoading ? 'Guardando...' : 'Registrar Listas'}
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteProductionOrder(selectedProd)}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-500 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition"
                >
                  <Trash2 size={14} />
                  Eliminar Solicitud
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
