'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatLocalDate, toLocalDateInputValue } from '@/lib/utils';
import { Receipt, Plus, X, Pencil, Trash2, DollarSign } from 'lucide-react';
import PremiumPaywall from '@/components/PremiumPaywall';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  type: 'DAILY' | 'MONTHLY';
  date: string;
  user?: { name: string };
}

interface Store {
  id: string;
  name: string;
  plan: 'FREE' | 'PRO';
}

export default function MerchantGastosPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'DAILY' | 'MONTHLY'>('ALL');
  const [form, setForm] = useState({ category: '', description: '', amount: '', type: 'DAILY', date: toLocalDateInputValue(new Date()) });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storeData = await api.get<Store>('/stores/my-store');
      setStore(storeData);

      if (storeData.plan === 'PRO') {
        const expensesData = await api.get<Expense[]>('/expenses');
        setExpenses(expensesData);
      }
    } catch (err: any) {
      toast.error('Error cargando el módulo de gastos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.category || !form.description || !form.amount) {
      toast.error('Completa todos los campos');
      return;
    }
    try {
      if (editId) {
        await api.put(`/expenses/${editId}`, { ...form, amount: parseFloat(form.amount) });
        toast.success('Gasto actualizado');
      } else {
        await api.post('/expenses', { ...form, amount: parseFloat(form.amount) });
        toast.success('Gasto registrado');
      }
      setShowForm(false);
      setEditId(null);
      setForm({ category: '', description: '', amount: '', type: 'DAILY', date: toLocalDateInputValue(new Date()) });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error guardando gasto');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditId(expense.id);
    setForm({
      category: expense.category,
      description: expense.description || '',
      amount: String(expense.amount),
      type: expense.type,
      date: toLocalDateInputValue(expense.date),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Gasto eliminado');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error eliminando gasto');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  // Paywall Check
  if (!store || store.plan !== 'PRO') {
    return (
      <PremiumPaywall
        moduleName="Gestión de Gastos y Egresos"
        description="Administra todas las salidas de caja, clasifícalas por categorías diarias o mensuales y obtén un cálculo preciso del flujo de caja y la rentabilidad neta de tu negocio en tiempo real."
        icon={DollarSign}
        storeName={store?.name}
      />
    );
  }

  const filtered = filter === 'ALL' ? expenses : expenses.filter(e => e.type === filter);
  const totalDaily = expenses.filter(e => e.type === 'DAILY').reduce((sum, e) => sum + e.amount, 0);
  const totalMonthly = expenses.filter(e => e.type === 'MONTHLY').reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-3">
          <Receipt className="text-orange-500" size={24} />
          <div>
            <h1 className="text-2xl font-black">Control de Gastos</h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Registra y controla las salidas de caja y egresos operativos</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setForm({ category: '', description: '', amount: '', type: 'DAILY', date: toLocalDateInputValue(new Date()) });
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-salo-orange hover:bg-orange-600 text-white rounded-xl text-sm font-black shadow-xs transition"
        >
          <Plus size={16} /> Registrar Gasto
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-150/45 dark:border-gray-700/60 shadow-xs">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Gastos Diarios Totales</p>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{formatCurrency(totalDaily)}</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-150/45 dark:border-gray-700/60 shadow-xs">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Gastos Mensuales Fijos</p>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{formatCurrency(totalMonthly)}</h2>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-150/45 dark:border-gray-700/60 rounded-3xl shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-750 pb-4">
          <h3 className="font-extrabold text-base">Historial de Gastos</h3>
          <div className="flex gap-1 bg-gray-55 dark:bg-gray-750 p-1 rounded-xl text-xs font-bold">
            <button onClick={() => setFilter('ALL')} className={`px-3 py-1.5 rounded-lg transition ${filter === 'ALL' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}>Todos</button>
            <button onClick={() => setFilter('DAILY')} className={`px-3 py-1.5 rounded-lg transition ${filter === 'DAILY' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}>Diarios</button>
            <button onClick={() => setFilter('MONTHLY')} className={`px-3 py-1.5 rounded-lg transition ${filter === 'MONTHLY' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}>Mensuales</button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center py-12 text-gray-400 text-sm font-medium">No se han registrado gastos en este filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-750 text-gray-400 font-bold uppercase tracking-wider text-xs">
                  <th className="pb-3">Fecha</th>
                  <th className="pb-3">Categoría</th>
                  <th className="pb-3">Descripción</th>
                  <th className="pb-3">Tipo</th>
                  <th className="pb-3">Monto</th>
                  <th className="pb-3">Registrado Por</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-750 font-semibold text-gray-700 dark:text-gray-300">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition">
                    <td className="py-3.5">{formatLocalDate(e.date)}</td>
                    <td className="py-3.5"><span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30">{e.category}</span></td>
                    <td className="py-3.5">{e.description}</td>
                    <td className="py-3.5"><span className={`px-2 py-0.5 rounded-full text-[10px] ${e.type === 'DAILY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>{e.type === 'DAILY' ? 'Diario' : 'Mensual'}</span></td>
                    <td className="py-3.5 font-bold text-gray-900 dark:text-white">{formatCurrency(e.amount)}</td>
                    <td className="py-3.5 text-xs text-gray-400">{e.user?.name || 'Sistema'}</td>
                    <td className="py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(e)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 rounded-lg transition" title="Editar"><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(e.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition" title="Eliminar"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Dialog Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-700/80 p-6 w-full max-w-md shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="font-extrabold text-lg">{editId ? 'Actualizar' : 'Registrar'} Gasto</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 transition"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-550 font-bold uppercase tracking-wider mb-1 block">Categoría</label>
                <input
                  type="text"
                  placeholder="Ej: Insumos, Servicios, Nómina, Alquiler"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs text-gray-550 font-bold uppercase tracking-wider mb-1 block">Descripción</label>
                <input
                  type="text"
                  placeholder="Ej: Compra de empaques para delivery"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-550 font-bold uppercase tracking-wider mb-1 block">Monto ($)</label>
                  <input
                    type="number"
                    placeholder="Monto total"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-550 font-bold uppercase tracking-wider mb-1 block">Fecha</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-550 font-bold uppercase tracking-wider mb-1 block">Tipo de Gasto</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-medium"
                >
                  <option value="DAILY">Diario / Operativo</option>
                  <option value="MONTHLY">Mensual / Fijo</option>
                </select>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-salo-orange hover:bg-orange-600 text-white font-black rounded-xl text-sm shadow-md transition"
              >
                {editId ? 'Guardar Cambios' : 'Registrar Gasto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
