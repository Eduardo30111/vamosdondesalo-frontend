'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, AlertTriangle, Search, X, Plus } from 'lucide-react';

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

  useEffect(() => {
    loadCustomers();
  }, []);

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

            {selectedCustomer.totalDebt > 0 && (
              <button
                onClick={() => setShowPayment(true)}
                className="w-full py-2.5 mb-4 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Registrar Abono
              </button>
            )}

            <h3 className="font-medium text-sm text-gray-500 mb-2">Historial</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {selectedCustomer.credits.map((credit) => (
                <div key={credit.id} className={`p-3 rounded-lg text-sm ${
                  credit.type === 'CHARGE' ? 'bg-red-50 dark:bg-red-900/10' : 'bg-green-50 dark:bg-green-900/10'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${credit.type === 'CHARGE' ? 'text-red-600' : 'text-green-600'}`}>
                      {credit.type === 'CHARGE' ? '+' : '-'}{formatCurrency(credit.amount)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(credit.createdAt).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                  {credit.note && <p className="text-xs text-gray-500 mt-1">{credit.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 mb-3"
            />
            <input
              type="text"
              placeholder="Nota (opcional)"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handlePayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
