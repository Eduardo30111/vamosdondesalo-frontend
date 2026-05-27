'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { DollarSign, UserX, Edit3, Trash2, ChevronDown, ChevronUp, Clock, CreditCard } from 'lucide-react';

interface OrderItem {
  id: string;
  qty: number;
  unitPrice: number;
  product: { name: string };
}

interface Order {
  id: string;
  customerName: string;
  status: string;
  type: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
  table?: { number: number };
}

export default function VitrinaPage() {
  const router = useRouter();
  const { user, hydrate } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFiarModal, setShowFiarModal] = useState(false);
  const [fiarOrderId, setFiarOrderId] = useState<string | null>(null);
  const [fiarTotal, setFiarTotal] = useState(0);
  const [cedula, setCedula] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  useEffect(() => {
    hydrate();
    if (user && user.role !== 'COCINA') fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/orders/cuentas-activas');
      setOrders(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pagar = async (id: string) => {
    if (!confirm('¿Cobrar este pedido?')) return;
    await api.put(`/orders/${id}/pagar`);
    fetchOrders();
  };

  const cancelar = async (id: string) => {
    if (!confirm('¿Cancelar este pedido? El stock de vitrina se devolverá.')) return;
    await api.put(`/orders/${id}/cancelar`);
    fetchOrders();
  };

  const abrirFiar = (orderId: string, total: number) => {
    setFiarOrderId(orderId);
    setFiarTotal(total);
    setShowFiarModal(true);
    setCedula('');
    setFoundCustomer(null);
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  const buscarCedula = async () => {
    if (!cedula.trim()) return;
    try { const { data } = await api.get(`/customers/cedula/${cedula}`); setFoundCustomer(data); }
    catch { setFoundCustomer(null); }
  };

  const fiar = async () => {
    if (!fiarOrderId) return;
    let customerId = foundCustomer?.id;
    if (!customerId) {
      if (!newCustomerName.trim() || cedula.length < 5) { alert('Ingresa nombre y cedula'); return; }
      const { data } = await api.post('/customers', { name: newCustomerName, cedula, phone: newCustomerPhone });
      customerId = data.id;
    }
    await api.post(`/customers/${customerId}/charge`, { amount: fiarTotal });
    await api.put(`/orders/${fiarOrderId}/fiar`, { customerId });
    setShowFiarModal(false);
    fetchOrders();
  };

  const minutosDesde = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    return Math.floor(diff / 60000);
  };

  if (!user) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Vitrina — Cuentas Activas</h1>
      <p className="text-sm text-gray-500 mb-6">Pedidos entregados esperando pago o fiado.</p>

      {/* Modal Fiar */}
      {showFiarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowFiarModal(false)} className="absolute top-4 right-4 p-1"><X size={20} /></button>
            <h2 className="text-lg font-bold mb-4">Fiar pedido — ${fiarTotal.toLocaleString('es-CO')}</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Cedula del cliente" value={cedula} onChange={(e) => setCedula(e.target.value)} onBlur={buscarCedula} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
              {foundCustomer ? (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl text-sm">
                  <p className="font-bold">{foundCustomer.name}</p>
                  <p className="text-gray-500">Deuda actual: ${foundCustomer.totalDebt.toLocaleString('es-CO')}</p>
                </div>
              ) : (
                <>
                  <input type="text" placeholder="Nombre del cliente (nuevo)" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
                  <input type="tel" placeholder="Telefono (opcional)" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
                  <p className="text-xs text-gray-400">Cliente nuevo — se creara automaticamente</p>
                </>
              )}
              <button onClick={fiar} className="w-full py-3 bg-yellow-500 text-white rounded-xl font-bold hover:opacity-90 text-sm">Confirmar Fiado</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Cargando...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay cuentas activas.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const isExpanded = expanded === o.id;
            return (
              <div key={o.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
                {/* Fila principal */}
                <div className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <button onClick={() => setExpanded(isExpanded ? null : o.id)} className="p-1">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <div>
                      <p className="font-bold">{o.customerName}</p>
                      <p className="text-xs text-gray-500">
                        {o.type === 'TABLE' ? `Mesa ${o.table?.number || '?'}` : o.type === 'TAKEAWAY' ? 'Para llevar' : 'Domicilio'}
                        {' · '}
                        <Clock size={12} className="inline" /> {minutosDesde(o.createdAt)} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-orange-500">${o.total.toLocaleString('es-CO')}</span>
                    {o.status === 'READY' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">Listo</span>
                    )}
                    {o.status === 'DELIVERED' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Entregado</span>
                    )}
                  </div>
                </div>

                {/* Detalle expandido */}
                {isExpanded && (
                  <div className="border-t dark:border-gray-700 px-4 pb-4">
                    <div className="py-3 space-y-2">
                      {o.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.qty}x {item.product?.name || 'Producto'}</span>
                          <span className="text-gray-500">${(item.unitPrice * item.qty).toLocaleString('es-CO')}</span>
                        </div>
                      ))}
                      <div className="border-t dark:border-gray-600 pt-2 flex justify-between font-bold">
                        <span>Total</span>
                        <span>${o.total.toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => pagar(o.id)} className="flex-1 py-2 bg-green-500 text-white rounded-lg font-bold text-sm hover:opacity-90 flex items-center justify-center gap-1">
                        <DollarSign size={16} /> Cobrar
                      </button>
                      <button onClick={() => abrirFiar(o.id, o.total)} className="px-3 py-2 bg-yellow-500 text-white rounded-lg font-bold text-sm hover:opacity-90">
                        <CreditCard size={16} /> Fiado
                      </button>
                      <button className="px-3 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm hover:opacity-90">
                        <Edit3 size={16} /> Editar
                      </button>
                      <button onClick={() => cancelar(o.id)} className="px-3 py-2 bg-red-500 text-white rounded-lg font-bold text-sm hover:opacity-90">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
