'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bike, Clock, CheckCircle, Package, Truck, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { getSocket, joinRoom } from '@/lib/socket';
import { formatErrorMessage } from '@/lib/error-handler';

interface OrderItem {
  id: string;
  qty: number;
  unitPrice: number;
  product: { name: string };
}

interface Order {
  id: string;
  status: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  customerDoc?: string | null;
  total: number;
  deliveryFee: number;
  items: OrderItem[];
  deliveryZone: { name: string } | null;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock; bg: string }> = {
  PENDING: { label: 'Pendiente', color: 'text-yellow-600 dark:text-yellow-400', icon: Clock, bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  PREPARING: { label: 'Preparando', color: 'text-blue-600 dark:text-blue-400', icon: Package, bg: 'bg-blue-50 dark:bg-blue-950/20' },
  READY: { label: 'Listo', color: 'text-green-600 dark:text-green-400', icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-950/20' },
  IN_TRANSIT: { label: 'En camino', color: 'text-purple-600 dark:text-purple-400', icon: Truck, bg: 'bg-purple-50 dark:bg-purple-950/20' },
  DELIVERED: { label: 'Entregado', color: 'text-gray-600 dark:text-gray-400', icon: CheckCircle, bg: 'bg-gray-50 dark:bg-gray-800' },
  PAID: { label: 'Pagado', color: 'text-gray-600 dark:text-gray-400', icon: CheckCircle, bg: 'bg-gray-50 dark:bg-gray-800' },
};

export default function SeguirPedidoClient() {
  const params = useSearchParams();
  const code = params.get('code') || '';
  
  const [searchQuery, setSearchQuery] = useState(code);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (code) {
      loadOrders(code);
    }
  }, [code]);

  useEffect(() => {
    if (orders.length === 0) return;
    
    const socket = getSocket();
    orders.forEach((o) => {
      joinRoom(`order:${o.id}`);
    });

    const handleStatusChanged = (o: Order) => {
      setOrders((prev) =>
        prev.map((item) => (item.id === o.id ? { ...item, status: o.status } : item))
      );
    };

    socket.on('order:status_changed', handleStatusChanged);
    return () => {
      socket.off('order:status_changed', handleStatusChanged);
    };
  }, [orders]);

  const loadOrders = async (trackingCodeOrDoc: string) => {
    if (!trackingCodeOrDoc.trim()) return;
    setLoading(true);
    setError('');
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${base}/public/orders/track/${encodeURIComponent(trackingCodeOrDoc.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se encontraron pedidos con esta información');
      
      const ordersList = Array.isArray(data) ? data : [data];
      setOrders(ordersList);
      if (ordersList.length === 1) {
        setExpandedOrderId(ordersList[0].id);
      } else {
        setExpandedOrderId(null);
      }
    } catch (err: any) {
      setError(formatErrorMessage(err, 'Error al buscar los pedidos'));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders(searchQuery);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Search Bar Block */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-150/40 dark:border-gray-750">
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4">Seguimiento de Pedidos</h2>
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-grow">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Código (SALO-XXXXX) o Identificación"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-extrabold text-sm transition active:scale-95 shadow-sm disabled:opacity-50"
            >
              Buscar
            </button>
          </form>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2.5 px-1">
            * Introduce el código de 5 letras que te dimos al finalizar la compra o el número de identificación que registraste.
          </p>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-150/40 dark:border-red-900/20 rounded-3xl p-6 text-center">
            <p className="text-red-600 dark:text-red-400 font-extrabold mb-1">{error}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Verifica la información e intenta de nuevo</p>
          </div>
        )}

        {/* Welcome State when no search yet */}
        {!code && orders.length === 0 && !error && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 text-center border border-gray-150/40 dark:border-gray-750 shadow-xs">
            <Bike size={48} className="mx-auto text-gray-300 dark:text-gray-650 mb-3" />
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">Rastrea tus Pedidos</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Introduce tus datos de compra arriba para conocer el estado de tu domicilio en tiempo real.
            </p>
          </div>
        )}

        {/* Orders List Result */}
        {orders.length > 0 && !loading && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-gray-400 dark:text-gray-500 px-1 uppercase tracking-wider">
              {orders.length} {orders.length === 1 ? 'Pedido Encontrado' : 'Pedidos Encontrados'}
            </h3>

            {orders.map((ord) => {
              const isExpanded = expandedOrderId === ord.id;
              const statusConfig = STATUS_MAP[ord.status] || STATUS_MAP.PENDING;
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={ord.id}
                  className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-150/40 dark:border-gray-750 shadow-xs overflow-hidden transition"
                >
                  {/* Card Header Clickable to Toggle Details */}
                  <div
                    onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-2xl ${statusConfig.bg} ${statusConfig.color}`}>
                        <StatusIcon size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-gray-900 dark:text-white">{ord.trackingCode}</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {new Date(ord.createdAt).toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div>
                      {isExpanded ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded Body details */}
                  {isExpanded && (
                    <div className="p-5 border-t border-gray-100 dark:border-gray-750 bg-gray-50/20 dark:bg-gray-750/10 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="text-gray-400">Cliente</p>
                          <p className="font-extrabold text-gray-800 dark:text-gray-200">{ord.customerName}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-gray-400">Teléfono</p>
                          <p className="font-extrabold text-gray-800 dark:text-gray-200">{ord.customerPhone || 'N/A'}</p>
                        </div>
                        <div className="space-y-1 col-span-full">
                          <p className="text-gray-400">Dirección de Entrega</p>
                          <p className="font-extrabold text-gray-800 dark:text-gray-200">{ord.customerAddress || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-gray-400">Zona de Domicilio</p>
                          <p className="font-extrabold text-gray-800 dark:text-gray-200">{ord.deliveryZone?.name || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-gray-400">Costo Domicilio</p>
                          <p className="font-extrabold text-gray-800 dark:text-gray-200">${ord.deliveryFee.toLocaleString('es-CO')}</p>
                        </div>
                        {ord.customerDoc && (
                          <div className="space-y-1">
                            <p className="text-gray-400">Identificación</p>
                            <p className="font-extrabold text-gray-800 dark:text-gray-200">{ord.customerDoc}</p>
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-gray-450">Valor Total Pedido</p>
                          <p className="text-sm font-black text-orange-500">${ord.total.toLocaleString('es-CO')}</p>
                        </div>
                      </div>

                      {/* Products List section */}
                      <div className="border-t border-gray-100 dark:border-gray-750 pt-4">
                        <h4 className="font-extrabold text-xs text-gray-400 uppercase tracking-wider mb-2">Productos Comprados</h4>
                        <div className="space-y-2">
                          {ord.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-xs py-1.5 border-b border-gray-100/50 dark:border-gray-750/30 last:border-b-0">
                              <span className="font-bold text-gray-800 dark:text-gray-250">
                                {item.qty}x {item.product.name}
                              </span>
                              <span className="font-extrabold text-gray-950 dark:text-white">
                                ${(item.qty * item.unitPrice).toLocaleString('es-CO')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
