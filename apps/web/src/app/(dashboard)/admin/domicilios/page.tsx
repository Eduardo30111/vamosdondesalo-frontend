'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Bike, Phone, MapPin, Clock, ChevronRight, ChevronDown, Calendar, History } from 'lucide-react';

interface DeliveryOrder {
  id: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  status: string;
  total: number;
  deliveryFee: number;
  createdAt: string;
  deliveryZone: { id: string; name: string; fee: number } | null;
  items: Array<{ id: string; qty: number; isPrep?: boolean; product: { name: string } }>;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PREPARING: 'Preparando',
  READY: 'Listo',
  IN_TRANSIT: 'En camino',
  DELIVERED: 'Entregado',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  PREPARING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  READY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  IN_TRANSIT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  DELIVERED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const nextStatus: Record<string, string> = {
  PENDING: 'PREPARING',
  PREPARING: 'READY',
  READY: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
};

interface DailySummary {
  date: string;
  totalOrders: number;
  totalSales: number;
  totalDeliveryFees: number;
  orders: Array<{
    id: string;
    customerName: string;
    customerAddress: string | null;
    total: number;
    deliveryZone: { name: string } | null;
  }>;
}

export default function DomiciliosPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const data = await api.get<DeliveryOrder[]>('/orders/deliveries');
      setOrders(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando domicilios');
    } finally {
      setLoading(false);
    }
  };

  const advanceStatus = async (orderId: string, currentStatus: string) => {
    const next = nextStatus[currentStatus];
    if (!next) return;
    try {
      await api.put(`/orders/${orderId}/status`, { status: next });
      toast.success(`Estado actualizado a: ${statusLabels[next]}`);
      loadOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error actualizando estado');
    }
  };

  const timeSince = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const isKitchenPending = (order: DeliveryOrder) => {
    const hasPrep = order.items.some((i) => i.isPrep);
    return hasPrep && order.status !== 'READY' && order.status !== 'IN_TRANSIT' && order.status !== 'DELIVERED';
  };

  const loadHistory = async (month: string) => {
    setLoadingHistory(true);
    try {
      const data = await api.get<DailySummary[]>('/orders/deliveries/daily-summary?month=' + month);
      setDailySummaries(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando historial');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      loadHistory(selectedMonth);
    }
  }, [showHistory, selectedMonth]);

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bike className="text-salo-orange" />
          Domicilios
        </h1>
        <span className="text-sm text-gray-500">{orders.length} activos</span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Bike size={48} className="mx-auto mb-3 opacity-50" />
          <p>No hay domicilios activos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                  {statusLabels[order.status]}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} />
                  {timeSince(order.createdAt)}
                </span>
              </div>

              <h3 className="font-bold text-lg mb-1">{order.customerName}</h3>
              
              {order.customerPhone && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mb-1">
                  <Phone size={14} />
                  {order.customerPhone}
                </p>
              )}
              
              {order.customerAddress && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                  <MapPin size={14} />
                  {order.customerAddress}
                </p>
              )}

              {order.deliveryZone && (
                <p className="text-xs text-salo-orange font-medium mb-2">
                  Zona: {order.deliveryZone.name} (+{formatCurrency(order.deliveryFee)})
                </p>
              )}

              <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2 mb-3">
                {order.items.map((item) => (
                  <p key={item.id} className="text-sm text-gray-600 dark:text-gray-300">
                    {item.qty}x {item.product.name}
                  </p>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-salo-orange">{formatCurrency(order.total)}</span>
                <div className="flex items-center gap-2">
                  {isKitchenPending(order) && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      ⏳ Esperando Cocina
                    </span>
                  )}
                  {nextStatus[order.status] && (
                    <button
                      onClick={() => advanceStatus(order.id, order.status)}
                      disabled={isKitchenPending(order)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1 ${
                        isKitchenPending(order)
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                          : 'bg-salo-orange text-white hover:bg-primary-700'
                      }`}
                    >
                      {statusLabels[nextStatus[order.status]]}
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Daily Delivery History */}
      <div className="mt-10">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-lg font-bold mb-4 hover:text-salo-orange transition"
        >
          <History size={20} className="text-salo-orange" />
          📋 Historial de Domicilios
          <ChevronDown
            size={18}
            className={`transition-transform ${showHistory ? 'rotate-180' : ''}`}
          />
        </button>

        {showHistory && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-gray-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800"
              />
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-salo-orange" />
              </div>
            ) : dailySummaries.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <History size={36} className="mx-auto mb-2 opacity-50" />
                <p>No hay registros para este mes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dailySummaries
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((day) => (
                    <div
                      key={day.date}
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleDay(day.date)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-sm">
                            {new Date(day.date + 'T12:00:00').toLocaleDateString('es-CO', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {day.totalOrders} pedidos
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold text-salo-orange">
                              {formatCurrency(day.totalSales)}
                            </p>
                            <p className="text-xs text-gray-400">
                              Envío: {formatCurrency(day.totalDeliveryFees)}
                            </p>
                          </div>
                          <ChevronDown
                            size={16}
                            className={`text-gray-400 transition-transform ${
                              expandedDays.has(day.date) ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {expandedDays.has(day.date) && (
                        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-3 space-y-2">
                          {day.orders.map((o) => (
                            <div
                              key={o.id}
                              className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
                            >
                              <div>
                                <p className="text-sm font-medium">{o.customerName}</p>
                                {o.customerAddress && (
                                  <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <MapPin size={10} />
                                    {o.customerAddress}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold">{formatCurrency(o.total)}</p>
                                {o.deliveryZone && (
                                  <p className="text-xs text-salo-orange">{o.deliveryZone.name}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
