'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatLocalDate, toLocalDateInputValue } from '@/lib/utils';
import { CreditCard, AlertTriangle, Search, X, Plus, Edit2, Trash2 } from 'lucide-react';

interface Credit {
  id: string;
  amount: number;
  type: 'CHARGE' | 'PAYMENT';
  note: string | null;
  createdAt: string;
  order?: { id: string; total: number } | null;
}

interface Customer {
  id: string;
  name: string;
  cedula: string;
  phone: string | null;
  totalDebt: number;
  createdAt: string;
  credits: Credit[];
}

export default function FiadosPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [search, setSearch] = useState('');

  // States for Edit Customer feature
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerCedula, setEditCustomerCedula] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');

  // States for Add Charge feature
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerIdForCharge, setCustomerIdForCharge] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerCedula, setNewCustomerCedula] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customProductNote, setCustomProductNote] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productQty, setProductQty] = useState(1);
  const [chargeDate, setChargeDate] = useState(() => toLocalDateInputValue(new Date()));

  // States for Edit / Delete features
  const [isSaving, setIsSaving] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');

  // States for filtering credits
  const [filterType, setFilterType] = useState<'ALL' | 'DAY'>('ALL');
  const [filterDate, setFilterDate] = useState(() => toLocalDateInputValue(new Date()));

  const displayedCredits = selectedCustomer
    ? selectedCustomer.credits.filter((credit) => {
        if (filterType === 'ALL') return true;
        const creditLocalDate = toLocalDateInputValue(credit.createdAt);
        return creditLocalDate === filterDate;
      })
    : [];

  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await api.get<any[]>('/public/products');
      setProducts(data);
    } catch (err) {
      console.error('Error cargando productos', err);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await api.get<Customer[]>('/customers');
      setCustomers(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando clientes');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerDetail = async (id: string) => {
    try {
      const data = await api.get<Customer>(`/customers/${id}`);
      setSelectedCustomer(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando detalle');
    }
  };

  const handlePayment = async () => {
    if (!selectedCustomer || !paymentAmount) return;
    setIsSaving(true);
    try {
      await api.post(`/customers/${selectedCustomer.id}/payment`, {
        amount: parseFloat(paymentAmount),
        note: paymentNote || 'Abono',
      });
      toast.success('Abono registrado correctamente');
      setShowPayment(false);
      setPaymentAmount('');
      setPaymentNote('');
      loadCustomers();
      loadCustomerDetail(selectedCustomer.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error registrando abono');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCustomer = async () => {
    if (!selectedCustomer) return;
    setIsSaving(true);
    try {
      await api.put(`/customers/${selectedCustomer.id}`, {
        name: editCustomerName,
        cedula: editCustomerCedula,
        phone: editCustomerPhone || undefined,
      });
      toast.success('Cliente actualizado correctamente');
      setShowEditCustomer(false);
      loadCustomers();
      loadCustomerDetail(selectedCustomer.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCharge = async () => {
    let customerId = customerIdForCharge;
    setIsSaving(true);
    try {
      if (isNewCustomer) {
        const c = await api.post<any>('/customers', {
          name: newCustomerName,
          cedula: newCustomerCedula,
          phone: newCustomerPhone || undefined,
        });
        customerId = c.id;
      }

      if (!customerId) {
        setIsSaving(false);
        return;
      }

      const price = parseFloat(productPrice);
      const totalAmount = price * productQty;
      const note = `${customProductNote} (x${productQty})`;

      await api.post(`/customers/${customerId}/charge`, {
        amount: totalAmount,
        note,
        createdAt: chargeDate,
      });

      toast.success('Fiado registrado correctamente');
      setShowAddCharge(false);
      loadCustomers();
      loadCustomerDetail(customerId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error registrando fiado');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCredit = async (creditId: string) => {
    if (!selectedCustomer) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este registro de fiado/abono? Esto recalculará la deuda del cliente.')) return;
    try {
      await api.delete(`/customers/credits/${creditId}`);
      toast.success('Registro eliminado correctamente');
      loadCustomers();
      loadCustomerDetail(selectedCustomer.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar registro');
    }
  };

  const handleUpdateCredit = async () => {
    if (!selectedCustomer || !editingCredit) return;
    setIsSaving(true);
    try {
      await api.put(`/customers/credits/${editingCredit.id}`, {
        amount: parseFloat(editAmount),
        note: editNote,
        createdAt: editDate,
      });
      toast.success('Registro actualizado correctamente');
      setEditingCredit(null);
      loadCustomers();
      loadCustomerDetail(selectedCustomer.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar registro');
    } finally {
      setIsSaving(false);
    }
  };

  const isDelinquent = (customer: Customer) => {
    if (customer.totalDebt <= 0) return false;
    const oldestUnpaid = customer.credits.find(c => c.type === 'CHARGE');
    if (!oldestUnpaid) return false;
    const daysSince = (Date.now() - new Date(oldestUnpaid.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 30;
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cedula.includes(search)
  );

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
          <CreditCard className="text-salo-orange" />
          Fiados
        </h1>
        <button
          onClick={() => {
            setShowAddCharge(true);
            setIsNewCustomer(false);
            setCustomerIdForCharge('');
            setNewCustomerName('');
            setNewCustomerCedula('');
            setNewCustomerPhone('');
            setSelectedProductId('');
            setCustomProductNote('');
            setProductPrice('');
            setProductQty(1);
            setChargeDate(toLocalDateInputValue(new Date()));
          }}
          className="px-4 py-2 bg-salo-orange text-white rounded-xl font-medium text-sm hover:opacity-90 transition flex items-center gap-1.5 shadow-sm font-sans"
        >
          <Plus size={16} />
          Añadir Fiado
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Customer List */}
        <div className="flex-1">
          <div className="mb-4 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-salo-orange outline-none"
            />
          </div>

          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => loadCustomerDetail(customer.id)}
                className={`w-full text-left bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border transition hover:shadow-md ${
                  selectedCustomer?.id === customer.id
                    ? 'border-salo-orange'
                    : 'border-gray-100 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{customer.name}</span>
                      {isDelinquent(customer) && (
                        <AlertTriangle size={16} className="text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">CC: {customer.cedula}</p>
                  </div>
                  <span className={`font-bold text-lg ${customer.totalDebt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {customer.totalDebt > 0 ? formatCurrency(customer.totalDebt) : 'Al día'}
                  </span>
                </div>
              </button>
            ))}
            {filteredCustomers.length === 0 && (
              <p className="text-center text-gray-400 py-8">No se encontraron clientes</p>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedCustomer && (
          <div className="lg:w-96 bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">{selectedCustomer.name}</h2>
              <button onClick={() => setSelectedCustomer(null)} className="p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 mb-4 text-sm">
              <p><span className="text-gray-500">Cédula:</span> {selectedCustomer.cedula}</p>
              {selectedCustomer.phone && <p><span className="text-gray-500">Teléfono:</span> {selectedCustomer.phone}</p>}
              <p>
                <span className="text-gray-500">Deuda total:</span>{' '}
                <span className="font-bold text-red-500">{formatCurrency(selectedCustomer.totalDebt)}</span>
              </p>
            </div>

            <div className="flex gap-2 mb-4">
              {selectedCustomer.totalDebt > 0 && (
                <button
                  onClick={() => setShowPayment(true)}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Abono
                </button>
              )}
              <button
                onClick={() => {
                  setEditCustomerName(selectedCustomer.name);
                  setEditCustomerCedula(selectedCustomer.cedula);
                  setEditCustomerPhone(selectedCustomer.phone || '');
                  setShowEditCustomer(true);
                }}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-750 transition flex items-center justify-center gap-1.5"
              >
                <Edit2 size={14} />
                Editar
              </button>
            </div>

            <div className="flex items-center justify-between mb-2 mt-4">
              <h3 className="font-medium text-sm text-gray-500">Historial</h3>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterType('ALL')}
                  className={`px-2 py-1 rounded-md font-bold transition ${
                    filterType === 'ALL'
                      ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('DAY')}
                  className={`px-2 py-1 rounded-md font-bold transition ${
                    filterType === 'DAY'
                      ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Por día
                </button>
              </div>
            </div>

            {filterType === 'DAY' && (
              <div className="mb-3">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-xs outline-none focus:ring-2 focus:ring-salo-orange"
                />
              </div>
            )}

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {displayedCredits.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-6">No hay registros para este filtro</p>
              )}
              {displayedCredits.map((credit) => (
                <div key={credit.id} className={`p-3 rounded-lg text-sm ${
                  credit.type === 'CHARGE' ? 'bg-red-50 dark:bg-red-900/10' : 'bg-green-50 dark:bg-green-900/10'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${credit.type === 'CHARGE' ? 'text-red-600' : 'text-green-600'}`}>
                      {credit.type === 'CHARGE' ? '+' : '-'}{formatCurrency(credit.amount)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {formatLocalDate(credit.createdAt)}
                      </span>
                      <button
                        onClick={() => {
                          setEditingCredit(credit);
                          setEditAmount(credit.amount.toString());
                          setEditNote(credit.note || '');
                          setEditDate(toLocalDateInputValue(credit.createdAt));
                        }}
                        className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCredit(credit.id)}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {credit.note && <p className="text-xs text-gray-500 mt-1">{credit.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      {showEditCustomer && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Editar Cliente</h3>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editCustomerName}
                  disabled={isSaving}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-650 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-salo-orange disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Cédula</label>
                <input
                  type="text"
                  value={editCustomerCedula}
                  disabled={isSaving}
                  onChange={(e) => setEditCustomerCedula(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-650 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-salo-orange disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Teléfono (opcional)</label>
                <input
                  type="text"
                  value={editCustomerPhone}
                  disabled={isSaving}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-650 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-salo-orange disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditCustomer(false)}
                disabled={isSaving}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-650 rounded-xl font-medium text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditCustomer}
                disabled={isSaving || !editCustomerName || !editCustomerCedula}
                className="flex-1 py-2.5 bg-salo-orange text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Registrar Abono</h3>
            <p className="text-sm text-gray-500 mb-4">
              Deuda actual: <span className="font-bold text-red-500">{formatCurrency(selectedCustomer.totalDebt)}</span>
            </p>
            <input
              type="number"
              placeholder="Monto del abono"
              value={paymentAmount}
              disabled={isSaving}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 mb-3 disabled:opacity-50"
            />
            <input
              type="text"
              placeholder="Nota (opcional)"
              value={paymentNote}
              disabled={isSaving}
              onChange={(e) => setPaymentNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 mb-4 disabled:opacity-50"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPayment(false)}
                disabled={isSaving}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handlePayment}
                disabled={isSaving || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {isSaving ? 'Registrando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Charge Modal */}
      {showAddCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-y-auto max-h-[90vh] text-left">
            <h3 className="text-lg font-bold mb-4">Registrar Nuevo Fiado</h3>
            
            <div className="space-y-4">
              {/* Cliente */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Cliente</label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      checked={!isNewCustomer}
                      disabled={isSaving}
                      onChange={() => setIsNewCustomer(false)}
                      className="text-salo-orange focus:ring-salo-orange"
                    />
                    Existente
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      checked={isNewCustomer}
                      disabled={isSaving}
                      onChange={() => setIsNewCustomer(true)}
                      className="text-salo-orange focus:ring-salo-orange"
                    />
                    Nuevo Cliente
                  </label>
                </div>

                {!isNewCustomer ? (
                  <select
                    value={customerIdForCharge}
                    disabled={isSaving}
                    onChange={(e) => setCustomerIdForCharge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-salo-orange disabled:opacity-50"
                  >
                    <option value="">Selecciona un cliente...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (CC: {c.cedula})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Nombre del cliente"
                      value={newCustomerName}
                      disabled={isSaving}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm disabled:opacity-50"
                    />
                    <input
                      type="text"
                      placeholder="Cédula"
                      value={newCustomerCedula}
                      disabled={isSaving}
                      onChange={(e) => setNewCustomerCedula(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm disabled:opacity-50"
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono (opcional)"
                      value={newCustomerPhone}
                      disabled={isSaving}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm disabled:opacity-50"
                    />
                  </div>
                )}
              </div>

              {/* Producto */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Producto</label>
                <select
                  value={selectedProductId}
                  disabled={isSaving}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedProductId(id);
                    if (id === 'custom') {
                      setCustomProductNote('');
                      setProductPrice('');
                    } else {
                      const prod = products.find(p => p.id === id);
                      if (prod) {
                        setCustomProductNote(prod.name);
                        setProductPrice(prod.salePrice.toString());
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-salo-orange mb-2 disabled:opacity-50"
                >
                  <option value="">Selecciona un producto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.salePrice.toLocaleString('es-CO')})
                    </option>
                  ))}
                  <option value="custom">Otro / Personalizado</option>
                </select>

                {selectedProductId === 'custom' && (
                  <input
                    type="text"
                    placeholder="Descripción del producto"
                    value={customProductNote}
                    disabled={isSaving}
                    onChange={(e) => setCustomProductNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm mb-2 disabled:opacity-50"
                  />
                )}

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Precio Unitario</label>
                    <input
                      type="number"
                      placeholder="Valor"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      disabled={isSaving || (selectedProductId !== 'custom' && !!selectedProductId)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm disabled:opacity-75"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={productQty}
                      disabled={isSaving}
                      onChange={(e) => setProductQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha</label>
                <input
                  type="date"
                  value={chargeDate}
                  disabled={isSaving}
                  onChange={(e) => setChargeDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm disabled:opacity-50"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowAddCharge(false)}
                disabled={isSaving}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCharge}
                disabled={
                  isSaving ||
                  (!isNewCustomer && !customerIdForCharge) ||
                  (isNewCustomer && (!newCustomerName || !newCustomerCedula)) ||
                  !customProductNote ||
                  !productPrice ||
                  parseFloat(productPrice) <= 0
                }
                className="flex-1 py-2.5 bg-salo-orange text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? 'Registrando...' : 'Registrar Deuda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Credit Modal */}
      {editingCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">
              Editar {editingCredit.type === 'CHARGE' ? 'Fiado' : 'Abono'}
            </h3>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Monto</label>
                <input
                  type="number"
                  value={editAmount}
                  disabled={isSaving}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nota</label>
                <input
                  type="text"
                  value={editNote}
                  disabled={isSaving}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha</label>
                <input
                  type="date"
                  value={editDate}
                  disabled={isSaving}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingCredit(null)}
                disabled={isSaving}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateCredit}
                disabled={isSaving || !editAmount || parseFloat(editAmount) <= 0}
                className="flex-1 py-2.5 bg-salo-orange text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
