'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { getSocket, joinRoom } from '@/lib/socket';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  X,
  Plus,
  Minus,
  Search,
  UtensilsCrossed,
  ChefHat,
  Smartphone,
  Banknote,
} from 'lucide-react';

interface OrderItem {
  id: string;
  qty: number;
  unitPrice: number;
  isPrep?: boolean;
  product: { id: string; name: string; preparationMode?: string };
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

interface Product {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  salePrice: number;
  type: string;
  preparationMode: string;
  vitrinaStock: { qty: number } | null;
}

export default function VitrinaPage() {
  const router = useRouter();
  const { user, hydrate } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fiar modal
  const [showFiarModal, setShowFiarModal] = useState(false);
  const [fiarOrderId, setFiarOrderId] = useState<string | null>(null);
  const [fiarTotal, setFiarTotal] = useState(0);
  const [cedula, setCedula] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Edit (add items) modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [editSearch, setEditSearch] = useState('');
  const [newItems, setNewItems] = useState<{ product: Product; qty: number }[]>([]);
  const [addingItems, setAddingItems] = useState(false);

  // Nequi payment modal
  const [showNequiModal, setShowNequiModal] = useState(false);
  const [nequiOrderId, setNequiOrderId] = useState<string | null>(null);
  const [nequiOrderTotal, setNequiOrderTotal] = useState(0);
  const [nequiAmount, setNequiAmount] = useState('');
  const [nequiPayingTotal, setNequiPayingTotal] = useState(false);
  const [processingNequi, setProcessingNequi] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'COCINA') fetchOrders();
    const socket = getSocket();
    joinRoom('pos');

    const handleVitrinaUpdated = () => fetchOrders();
    const handleOrderStatusChanged = () => fetchOrders();

    socket.on('vitrina:updated', handleVitrinaUpdated);
    socket.on('order:status_changed', handleOrderStatusChanged);

    return () => {
      socket.off('vitrina:updated', handleVitrinaUpdated);
      socket.off('order:status_changed', handleOrderStatusChanged);
    };
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await api.get<Order[]>('/orders/cuentas-activas');
      setOrders(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ─── Cobrar en efectivo ───────────────────
  const pagar = async (id: string) => {
    if (!confirm('¿Cobrar este pedido en efectivo?')) return;
    try {
      const order = orders.find((o) => o.id === id);
      const amount = order ? order.total : 0;
      await api.post('/payments', { orderId: id, method: 'CASH', amount });
    } catch (e) {
      console.error(e);
      alert('Error al procesar el pago');
    }
    fetchOrders();
  };

  // ─── Cancelar pedido ─────────────────────
  const cancelar = async (id: string) => {
    if (!confirm('¿Cancelar este pedido? El stock de vitrina se devolverá.')) return;
    await api.put(`/orders/${id}/cancelar`);
    fetchOrders();
  };

  // ─── Fiar modal ───────────────────────────
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
    try {
      const data = await api.get<any>(`/customers/cedula/${cedula}`);
      setFoundCustomer(data);
    } catch {
      setFoundCustomer(null);
    }
  };

  const fiar = async () => {
    if (!fiarOrderId) return;
    try {
      let customerId = foundCustomer?.id;
      if (!customerId) {
        if (!newCustomerName.trim() || cedula.length < 5) {
          alert('Ingresa nombre y cedula');
          return;
        }
        const data = await api.post<any>('/customers', { name: newCustomerName, cedula, phone: newCustomerPhone });
        customerId = data.id;
      }
      await api.post(`/customers/${customerId}/charge`, { amount: fiarTotal });
      await api.put(`/orders/${fiarOrderId}/fiar`, { customerId });
      setShowFiarModal(false);
      fetchOrders();
    } catch (e) {
      console.error(e);
      alert('Error al registrar el fiado');
    }
  };

  // ─── Edit (add items) modal ───────────────
  const abrirEditar = async (order: Order) => {
    setEditOrder(order);
    setNewItems([]);
    setEditSearch('');
    setShowEditModal(true);
    try {
      const prods = await api.get<Product[]>('/products');
      setProducts(prods);
    } catch {
      setProducts([]);
    }
  };

  const addNewItem = (product: Product) => {
    setNewItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateNewItemQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setNewItems((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setNewItems((prev) => prev.map((i) => i.product.id === productId ? { ...i, qty } : i));
    }
  };

  const confirmarAgregarItems = async () => {
    if (!editOrder || newItems.length === 0) return;
    setAddingItems(true);
    try {
      await api.put(`/orders/${editOrder.id}/add-items`, {
        items: newItems.map((i) => ({ productId: i.product.id, qty: i.qty })),
      });
      setShowEditModal(false);
      setEditOrder(null);
      setNewItems([]);
      fetchOrders();
    } catch (e) {
      console.error(e);
      alert('Error al agregar items');
    } finally {
      setAddingItems(false);
    }
  };

  const newItemsTotal = newItems.reduce((sum, i) => sum + i.product.salePrice * i.qty, 0);
  const hasPrepItems = newItems.some((i) => i.product.preparationMode === 'PREPARADO');

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(editSearch.toLowerCase())
  );

  // ─── Nequi payment modal ──────────────────
  const abrirNequi = (orderId: string, total: number) => {
    setNequiOrderId(orderId);
    setNequiOrderTotal(total);
    setNequiAmount(total.toString());
    setNequiPayingTotal(true);
    setShowNequiModal(true);
  };

  const nequiAmountNum = parseFloat(nequiAmount) || 0;
  const cashAmount = Math.max(0, nequiOrderTotal - nequiAmountNum);

  const confirmarNequi = async () => {
    if (!nequiOrderId || nequiAmountNum <= 0) return;
    setProcessingNequi(true);
    try {
      // Register Nequi payment
      await api.post('/payments', {
        orderId: nequiOrderId,
        method: 'NEQUI',
        amount: nequiAmountNum,
      });

      // If there's a cash remainder, register cash payment too
      if (cashAmount > 0) {
        await api.post('/payments', {
          orderId: nequiOrderId,
          method: 'CASH',
          amount: cashAmount,
        });
      }

      setShowNequiModal(false);
      fetchOrders();
    } catch (e) {
      console.error(e);
      alert('Error al procesar el pago');
    } finally {
      setProcessingNequi(false);
    }
  };

  // ─── Helpers ──────────────────────────────
  const minutosDesde = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    return Math.floor(diff / 60000);
  };

  if (!user) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Vitrina — Cuentas Activas</h1>
      <p className="text-sm text-gray-500 mb-6">Pedidos entregados esperando pago o fiado.</p>

      {/* ═══ Modal Fiar ═══ */}
      {showFiarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowFiarModal(false)} className="absolute top-4 right-4 p-1"><X size={20} /></button>
            <h2 className="text-lg font-bold mb-4">Fiar pedido — {formatCurrency(fiarTotal)}</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Cedula del cliente" value={cedula} onChange={(e) => setCedula(e.target.value)} onBlur={buscarCedula} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
              {foundCustomer ? (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl text-sm">
                  <p className="font-bold">{foundCustomer.name}</p>
                  <p className="text-gray-500">Deuda actual: {formatCurrency(foundCustomer.totalDebt)}</p>
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

      {/* ═══ Modal Editar (agregar items) ═══ */}
      {showEditModal && editOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col relative">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 p-1"><X size={20} /></button>
              <h2 className="text-lg font-bold">Agregar productos</h2>
              <p className="text-sm text-gray-500">{editOrder.customerName} — Pedido actual: {formatCurrency(editOrder.total)}</p>
            </div>

            {/* Search */}
            <div className="px-5 pt-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={editSearch}
                  onChange={(e) => setEditSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
                />
              </div>
            </div>

            {/* Products grid */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="grid grid-cols-2 gap-2">
                {filteredProducts.map((product) => {
                  const inCart = newItems.find((i) => i.product.id === product.id);
                  const isPrep = product.preparationMode === 'PREPARADO';
                  return (
                    <button
                      key={product.id}
                      onClick={() => addNewItem(product)}
                      className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-left hover:bg-orange-50 dark:hover:bg-orange-900/20 transition relative"
                    >
                      {inCart && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-salo-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {inCart.qty}
                        </span>
                      )}
                      <p className="font-medium text-xs truncate">{product.name}</p>
                      <p className="text-salo-orange font-bold text-sm mt-0.5">{formatCurrency(product.salePrice)}</p>
                      {isPrep && (
                        <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] text-blue-500 font-medium">
                          <ChefHat size={10} /> Preparado
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* New items summary */}
            {newItems.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nuevos items</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {newItems.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(item.product.salePrice)} c/u</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); updateNewItemQty(item.product.id, item.qty - 1); }} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <Minus size={12} />
                        </button>
                        <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                        <button onClick={(e) => { e.stopPropagation(); updateNewItemQty(item.product.id, item.qty + 1); }} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {hasPrepItems && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2 text-xs text-blue-600">
                    <ChefHat size={14} />
                    <span>Los productos preparados pasarán por cocina</span>
                  </div>
                )}

                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-gray-500">Subtotal nuevos:</span>
                  <span className="font-bold text-salo-orange">{formatCurrency(newItemsTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Nuevo total:</span>
                  <span className="font-bold text-lg text-salo-orange">{formatCurrency(editOrder.total + newItemsTotal)}</span>
                </div>
              </div>
            )}

            {/* Confirm button */}
            <div className="p-5 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={confirmarAgregarItems}
                disabled={newItems.length === 0 || addingItems}
                className="w-full py-3 bg-salo-orange text-white rounded-xl font-bold text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addingItems ? 'Agregando...' : (
                  <>
                    <Plus size={16} />
                    Agregar {newItems.length} producto{newItems.length !== 1 ? 's' : ''} al pedido
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal Nequi ═══ */}
      {showNequiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowNequiModal(false)} className="absolute top-4 right-4 p-1"><X size={20} /></button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Smartphone size={20} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Pago Nequi</h2>
                <p className="text-sm text-gray-500">Total: {formatCurrency(nequiOrderTotal)}</p>
              </div>
            </div>

            {/* Quick toggle: pay full amount */}
            <div className="mb-4">
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={nequiPayingTotal}
                  onChange={(e) => {
                    setNequiPayingTotal(e.target.checked);
                    if (e.target.checked) {
                      setNequiAmount(nequiOrderTotal.toString());
                    } else {
                      setNequiAmount('');
                    }
                  }}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
                <span className="text-sm font-medium">Pagar todo por Nequi</span>
              </label>
            </div>

            {/* Nequi amount input */}
            <div className="mb-3">
              <label className="text-xs text-gray-500 font-medium block mb-1">Monto pagado por Nequi</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  type="number"
                  placeholder="0"
                  value={nequiAmount}
                  onChange={(e) => {
                    setNequiAmount(e.target.value);
                    const val = parseFloat(e.target.value) || 0;
                    setNequiPayingTotal(val >= nequiOrderTotal);
                  }}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-lg font-bold focus:ring-2 focus:ring-purple-300 outline-none"
                />
              </div>
            </div>

            {/* Cash remainder */}
            {cashAmount > 0 && !nequiPayingTotal && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-between mb-4">
                <span className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Banknote size={16} />
                  Restante en efectivo
                </span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(cashAmount)}</span>
              </div>
            )}

            {/* Summary */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl mb-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1"><Smartphone size={12} /> Nequi</span>
                <span className="font-bold text-purple-600">{formatCurrency(nequiAmountNum)}</span>
              </div>
              {cashAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1"><Banknote size={12} /> Efectivo</span>
                  <span className="font-bold text-green-600">{formatCurrency(cashAmount)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-1 flex justify-between text-sm font-bold">
                <span>Total</span>
                <span className="text-salo-orange">{formatCurrency(nequiAmountNum + cashAmount)}</span>
              </div>
            </div>

            {/* Confirm */}
            <button
              onClick={confirmarNequi}
              disabled={processingNequi || nequiAmountNum <= 0 || nequiAmountNum > nequiOrderTotal}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processingNequi ? 'Procesando...' : (
                <>
                  <CreditCard size={16} />
                  Confirmar Pago
                </>
              )}
            </button>

            {nequiAmountNum > nequiOrderTotal && (
              <p className="text-xs text-red-500 mt-2 text-center">El monto Nequi no puede superar el total</p>
            )}
          </div>
        </div>
      )}

      {/* ═══ Orders list ═══ */}
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
                    <span className="text-lg font-bold text-orange-500">{formatCurrency(o.total)}</span>
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
                          <span className="text-gray-500">{formatCurrency(item.unitPrice * item.qty)}</span>
                        </div>
                      ))}
                      <div className="border-t dark:border-gray-600 pt-2 flex justify-between font-bold">
                        <span>Total</span>
                        <span>{formatCurrency(o.total)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button onClick={() => pagar(o.id)} className="flex-1 min-w-[100px] py-2 bg-green-500 text-white rounded-lg font-bold text-sm hover:opacity-90 flex items-center justify-center gap-1">
                        <DollarSign size={16} /> Efectivo
                      </button>
                      <button onClick={() => abrirNequi(o.id, o.total)} className="flex-1 min-w-[100px] py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:opacity-90 flex items-center justify-center gap-1">
                        <Smartphone size={16} /> Nequi
                      </button>
                      <button onClick={() => abrirFiar(o.id, o.total)} className="py-2 px-3 bg-yellow-500 text-white rounded-lg font-bold text-sm hover:opacity-90 flex items-center justify-center gap-1">
                        <CreditCard size={16} /> Fiado
                      </button>
                      <button onClick={() => abrirEditar(o)} className="py-2 px-3 bg-blue-500 text-white rounded-lg font-bold text-sm hover:opacity-90 flex items-center justify-center gap-1">
                        <Edit3 size={16} /> Editar
                      </button>
                      <button onClick={() => cancelar(o.id)} className="py-2 px-3 bg-red-500 text-white rounded-lg font-bold text-sm hover:opacity-90 flex items-center justify-center gap-1">
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
