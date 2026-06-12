'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bike, Clock, CheckCircle, Package, Truck } from 'lucide-react';
import { getSocket, joinRoom } from '@/lib/socket';

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
  total: number;
  deliveryFee: number;
  items: OrderItem[];
  deliveryZone: { name: string } | null;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Pendiente', color: 'text-yellow-600', icon: Clock },
  PREPARING: { label: 'Preparando', color: 'text-blue-600', icon: Package },
  READY: { label: 'Listo', color: 'text-green-600', icon: CheckCircle },
  IN_TRANSIT: { label: 'En camino', color: 'text-purple-600', icon: Truck },
  DELIVERED: { label: 'Entregado', color: 'text-gray-600', icon: CheckCircle },
  PAID: { label: 'Pagado', color: 'text-gray-600', icon: CheckCircle },
};

export default function SeguirPedidoClient() {
  const params = useSearchParams();
  const code = params.get('code') || '';
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (code) loadOrder(code);
  }, [code]);

  useEffect(() => {
    if (!order?.id) return;
    const socket = getSocket();
    joinRoom(`order:${order.id}`);
    socket.on('order:status_changed', (o: Order) => {
      if (o.id === order.id) setOrder(o);
    });
    return () => { socket.off('order:status_changed'); };
  }, [order?.id]);

  const loadOrder = async (trackingCode: string) => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${base}/public/orders/track/${encodeURIComponent(trackingCode)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Pedido no encontrado');
      setOrder(data);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg text-center max-w-sm">
          <p className="text-red-500 font-bold mb-2">{error || 'Pedido no encontrado'}</p>
          <p className="text-sm text-gray-500">Verifica el código de seguimiento</p>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_MAP[order.status] || STATUS_MAP.PENDING;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="bg-salo-orange text-white p-6 text-center">
            <Bike size={40} className="mx-auto mb-2" />
            <h1 className="text-2xl font-bold">{order.trackingCode}</h1>
            <p className="opacity-90">{order.customerName}</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-center gap-3 py-4">
              <StatusIcon size={32} className={statusConfig.color} />
              <div className="text-center">
                <p className="text-2xl font-bold">{statusConfig.label}</p>
                <p className="text-xs text-gray-500">Actualizado en tiempo real</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Teléfono:</span> {order.customerPhone || 'N/A'}</p>
              <p><span className="text-gray-500">Dirección:</span> {order.customerAddress || 'N/A'}</p>
              <p><span className="text-gray-500">Zona:</span> {order.deliveryZone?.name || 'N/A'}</p>
              <p><span className="text-gray-500">Domicilio:</span> ${order.deliveryFee.toLocaleString('es-CO')}</p>
              <p><span className="text-gray-500">Total:</span> <span className="font-bold text-salo-orange">${order.total.toLocaleString('es-CO')}</span></p>
            </div>

            <div>
              <h3 className="font-bold text-sm mb-2">Productos</h3>
              <div className="space-y-1">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.qty}x {item.product.name}</span>
                    <span>${(item.qty * item.unitPrice).toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
