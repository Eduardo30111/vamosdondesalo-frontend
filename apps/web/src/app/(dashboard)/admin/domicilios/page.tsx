'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Bike, Phone, MapPin, Clock, ChevronRight } from 'lucide-react';

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
  items: Array<{ id: string; qty: number; product: { name: string } }>;
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

export default function DomiciliosPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);

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
                {nextStatus[order.status] && (
                  <button
                    onClick={() => advanceStatus(order.id, order.status)}
                    className="px-4 py-2 bg-salo-orange text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition flex items-center gap-1"
                  >
                    {statusLabels[nextStatus[order.status]]}
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
