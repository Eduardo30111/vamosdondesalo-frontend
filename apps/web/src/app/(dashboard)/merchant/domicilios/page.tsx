'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Bike,
  Lock,
  Phone,
  Search,
  CheckCircle,
  Truck,
  Clock,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  XCircle
} from 'lucide-react';

interface Store {
  id: string;
  name: string;
  plan: 'FREE' | 'PRO';
  whatsappNumber: string;
}

interface OrderItem {
  id: string;
  qty: number;
  unitPrice: number;
  product: {
    name: string;
  };
}

interface Order {
  id: string;
  type: string;
  trackingCode: string | null;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  deliveryFee: number;
  total: number;
  fulfillmentStatus: 'PENDING' | 'PREPARING' | 'READY' | 'IN_TRANSIT' | 'DELIVERED' | 'PAID' | 'CANCELLED';
  createdAt: string;
  items: OrderItem[];
}

export default function MerchantDomiciliosPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'IN_TRANSIT' | 'DELIVERED'>('PENDING');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storeData = await api.get<Store>('/stores/my-store');
      setStore(storeData);

      if (storeData.plan === 'PRO') {
        const ordersData = await api.get<Order[]>('/orders/store');
        // Filter to only display delivery orders
        const deliveryOrders = ordersData.filter(o => o.type === 'DELIVERY');
        setOrders(deliveryOrders);
      }
    } catch (err: any) {
      toast.error('Error cargando el módulo de domicilios');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Pedido actualizado a ${newStatus}`);
      
      // Update local state
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, fulfillmentStatus: newStatus as any } : o))
      );
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el estado');
    } finally {
      setUpdatingId(null);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm('¿Seguro que deseas cancelar este pedido?')) return;
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { status: 'CANCELLED' });
      toast.success('Pedido cancelado');
      
      // Update local state
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, fulfillmentStatus: 'CANCELLED' } : o))
      );
    } catch (err: any) {
      toast.error(err.message || 'Error al cancelar el pedido');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  // Admin WhatsApp URL for upgrades
  const adminWhatsAppUrl = `https://wa.me/573001234567?text=${encodeURIComponent(
    `Hola, me gustaría actualizar mi tienda ${store?.name || ''} al plan PRO para activar el módulo de domicilios.`
  )}`;

  // Paywall lock screen for FREE merchants
  if (!store || store.plan !== 'PRO') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 font-sans text-center">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-5 mb-8 text-left">
          <Bike className="text-orange-500" size={24} />
          <div>
            <h1 className="text-2xl font-black">Módulo de Domicilios</h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Gestión y control de repartos para tu comercio</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-150/45 dark:border-gray-700/60 p-8 sm:p-12 rounded-3xl shadow-lg mt-6">
          {/* Subtle design elements */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-100 dark:bg-orange-950/20 rounded-full blur-2xl opacity-50" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-100 dark:bg-purple-950/20 rounded-full blur-2xl opacity-50" />

          <div className="relative flex flex-col items-center">
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center shadow-inner mb-6">
              <Lock size={32} />
            </div>

            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-black uppercase tracking-wider mb-4">
              Módulo de Domicilios PRO
            </span>

            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
              Módulo Bloqueado
            </h2>

            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl p-4 mb-8 text-sm text-orange-700 dark:text-orange-400 leading-relaxed font-semibold max-w-md">
              ⚠️ Para poder obtener el módulo de domicilios debes tener el plan PRO.
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-8">
              El plan PRO te brinda acceso a la gestión de despachos en tiempo real, múltiples repartidores, historial de domicilios y comisiones rebajadas al 4%.
            </p>

            <a
              href={adminWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition"
            >
              <Phone size={16} /> Solicitar Plan PRO en WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  // PRO logic: Filter orders based on query and active tab
  const filteredOrders = orders.filter((o) => {
    // Filter by search query
    const matchQuery =
      o.customerName.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (o.trackingCode && o.trackingCode.toLowerCase().includes(filterQuery.toLowerCase())) ||
      (o.customerAddress && o.customerAddress.toLowerCase().includes(filterQuery.toLowerCase()));

    if (!matchQuery) return false;

    // Filter by active tab status groups
    const status = o.fulfillmentStatus;
    if (activeTab === 'PENDING') {
      return status === 'PENDING' || status === 'PREPARING' || status === 'READY';
    }
    if (activeTab === 'IN_TRANSIT') {
      return status === 'IN_TRANSIT';
    }
    if (activeTab === 'DELIVERED') {
      return status === 'DELIVERED' || status === 'PAID';
    }
    return false;
  });

  return (
    <div className="max-w-6xl mx-auto pb-12 font-sans px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <Bike className="text-orange-500" size={24} />
          <div>
            <h1 className="text-2xl font-black">Seguimiento de Domicilios</h1>
            <p className="text-xs text-gray-500 mt-0.5">Controla y monitorea tus despachos y entregas activas</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o código..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-xs outline-none focus:ring-2 focus:ring-orange-400 transition"
          />
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-gray-100 dark:border-gray-800 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition ${
            activeTab === 'PENDING'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-gray-450 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Clock size={16} /> Pendientes / Por Enviar
          <span className="ml-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-950/40 text-orange-600 text-[10px] rounded-full font-black">
            {orders.filter(o => o.fulfillmentStatus === 'PENDING' || o.fulfillmentStatus === 'PREPARING' || o.fulfillmentStatus === 'READY').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('IN_TRANSIT')}
          className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition ${
            activeTab === 'IN_TRANSIT'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-gray-450 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Truck size={16} /> En Camino / Tránsito
          <span className="ml-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-950/40 text-blue-600 text-[10px] rounded-full font-black">
            {orders.filter(o => o.fulfillmentStatus === 'IN_TRANSIT').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('DELIVERED')}
          className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition ${
            activeTab === 'DELIVERED'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-gray-450 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <CheckCircle size={16} /> Entregados
          <span className="ml-1 px-2 py-0.5 bg-green-100 dark:bg-green-950/40 text-green-600 text-[10px] rounded-full font-black">
            {orders.filter(o => o.fulfillmentStatus === 'DELIVERED' || o.fulfillmentStatus === 'PAID').length}
          </span>
        </button>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-150/45 dark:border-gray-700/60 p-12 rounded-3xl text-center shadow-xs">
          <Bike className="text-gray-300 dark:text-gray-600 mx-auto mb-4" size={48} />
          <h3 className="font-extrabold text-gray-800 dark:text-gray-200">No hay pedidos de domicilio</h3>
          <p className="text-xs text-gray-400 mt-1">No se encontraron entregas en esta sección</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredOrders.map((order) => {
            const customerPhoneClean = order.customerPhone?.replace('+', '').replace(/\s+/g, '').trim() || '';
            const customerWhatsAppUrl = `https://wa.me/${customerPhoneClean}`;

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-gray-800 border border-gray-150/45 dark:border-gray-700/60 rounded-3xl shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                {/* Order header */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-750 flex items-center justify-between bg-gray-50/50 dark:bg-gray-750/30">
                  <div>
                    <span className="text-xs font-black text-orange-500 tracking-wider">
                      {order.trackingCode || 'SALO-XXXXX'}
                    </span>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  {/* Status Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    order.fulfillmentStatus === 'PENDING'
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                      : order.fulfillmentStatus === 'PREPARING'
                      ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400'
                      : order.fulfillmentStatus === 'READY'
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                      : order.fulfillmentStatus === 'IN_TRANSIT'
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                      : 'bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400'
                  }`}>
                    {order.fulfillmentStatus}
                  </span>
                </div>

                {/* Order body */}
                <div className="p-5 space-y-4 flex-1">
                  {/* Customer details */}
                  <div className="space-y-1.5 bg-gray-50/30 dark:bg-gray-750/10 p-3 rounded-2xl border border-gray-100/50 dark:border-gray-750/20 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Cliente:</span>
                      <span className="font-extrabold text-gray-800 dark:text-gray-200">{order.customerName}</span>
                    </div>

                    {order.customerPhone && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Teléfono:</span>
                        <a
                          href={customerWhatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-green-500 flex items-center gap-1 hover:underline"
                        >
                          <MessageSquare size={12} /> {order.customerPhone} <ExternalLink size={10} />
                        </a>
                      </div>
                    )}

                    {order.customerAddress && (
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider shrink-0 mt-0.5">Dirección:</span>
                        <span className="font-bold text-gray-750 dark:text-gray-300 text-right">{order.customerAddress}</span>
                      </div>
                    )}
                  </div>

                  {/* Items list */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Productos</h4>
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                          <span className="font-medium">
                            <span className="font-black text-orange-500 mr-1">{item.qty}x</span>
                            {item.product?.name || 'Producto eliminado'}
                          </span>
                          <span className="font-bold text-gray-500">
                            {formatCurrency(item.unitPrice * item.qty)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Order footer summaries & buttons */}
                <div className="p-5 border-t border-gray-100 dark:border-gray-750 bg-gray-50/20 dark:bg-gray-750/10 space-y-4">
                  {/* Totals */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider">Costo Domicilio:</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(order.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xs text-gray-800 dark:text-gray-250">TOTAL:</span>
                    <span className="font-black text-base text-orange-600 dark:text-orange-400">{formatCurrency(order.total)}</span>
                  </div>

                  {/* Action controls */}
                  <div className="flex gap-2">
                    {/* Status updates */}
                    {(order.fulfillmentStatus === 'PENDING' || order.fulfillmentStatus === 'PREPARING' || order.fulfillmentStatus === 'READY') && (
                      <button
                        onClick={() => updateStatus(order.id, 'IN_TRANSIT')}
                        disabled={updatingId === order.id}
                        className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-55"
                      >
                        <Truck size={14} /> Despachar Reparto
                      </button>
                    )}

                    {order.fulfillmentStatus === 'IN_TRANSIT' && (
                      <button
                        onClick={() => updateStatus(order.id, 'DELIVERED')}
                        disabled={updatingId === order.id}
                        className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-55"
                      >
                        <CheckCircle size={14} /> Marcar como Entregado
                      </button>
                    )}

                    {order.fulfillmentStatus !== 'DELIVERED' && order.fulfillmentStatus !== 'PAID' && order.fulfillmentStatus !== 'CANCELLED' && (
                      <button
                        onClick={() => cancelOrder(order.id)}
                        disabled={updatingId === order.id}
                        className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-650 dark:bg-red-950/20 dark:text-red-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-red-200/50 dark:border-red-900/30 transition disabled:opacity-55"
                      >
                        <XCircle size={14} /> Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
