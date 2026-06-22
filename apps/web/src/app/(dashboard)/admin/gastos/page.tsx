'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatLocalDate, toLocalDateInputValue } from '@/lib/utils';
import { Receipt, Plus, X, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  type: 'DAILY' | 'MONTHLY';
  date: string;
  user: { name: string };
}

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'DAILY' | 'MONTHLY'>('ALL');
  const [form, setForm] = useState({ category: '', description: '', amount: '', type: 'DAILY', date: toLocalDateInputValue(new Date()) });
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const toggleDate = (dateKey: string) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const data = await api.get<Expense[]>('/expenses');
      setExpenses(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando gastos');
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
      loadExpenses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error guardando gasto');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditId(expense.id);
    setForm({
      category: expense.category,
      description: expense.description,
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
      loadExpenses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error eliminando gasto');
    }
  };

  const filtered = filter === 'ALL' ? expenses : expenses.filter(e => e.type === filter);
  const totalDaily = expenses.filter(e => e.type === 'DAILY').reduce((sum, e) => sum + e.amount, 0);
  const totalMonthly = expenses.filter(e => e.type === 'MONTHLY').reduce((sum, e) => sum + e.amount, 0);

  // Group by local date representation
  const groups: Record<string, Expense[]> = {};
  filtered.forEach(e => {
    const key = toLocalDateInputValue(e.date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

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
          <Receipt className="text-salo-orange" />
          Gastos
        </h1>
        <button
          onClick={() => { setEditId(null); setForm({ category: '', description: '', amount: '', type: 'DAILY', date: toLocalDateInputValue(new Date()) }); setShowForm(true); }}
          className="px-4 py-2.5 bg-salo-orange text-white rounded-xl font-medium text-sm hover:bg-primary-700 transition flex items-center gap-2"
        >
          <Plus size={16} />
          Nuevo Gasto
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500">Gastos Diarios</p>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalDaily)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500">Gastos Fijos Mensuales</p>
          <p className="text-2xl font-bold text-orange-500">{formatCurrency(totalMonthly)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['ALL', 'DAILY', 'MONTHLY'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === f ? 'bg-salo-orange text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {f === 'ALL' ? 'Todos' : f === 'DAILY' ? 'Diarios' : 'Mensuales'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {sortedDates.map((dateKey) => {
          const dayExpenses = groups[dateKey];
          const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
          const isExpanded = !!expandedDates[dateKey]; // default to collapsed
          
          return (
            <div key={dateKey} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
              <button
                onClick={() => toggleDate(dateKey)}
                className="w-full px-5 py-4 flex items-center justify-between bg-gray-50/50 dark:bg-gray-750/10 hover:bg-gray-50 dark:hover:bg-gray-750/30 transition outline-none"
              >
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-sm text-gray-850 dark:text-gray-200">
                    {formatLocalDate(dateKey)}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                    {dayExpenses.length} {dayExpenses.length === 1 ? 'gasto' : 'gastos'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-sm text-red-500">
                    {formatCurrency(dayTotal)}
                  </span>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-700">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-gray-50/50 dark:bg-gray-700/30 text-[10px] text-gray-400 uppercase tracking-wider">
                      <tr>
                        <th className="text-left p-3 font-bold pl-5">Categoría</th>
                        <th className="text-left p-3 font-bold">Descripción</th>
                        <th className="text-left p-3 font-bold">Tipo</th>
                        <th className="text-left p-3 font-bold">Monto</th>
                        <th className="text-left p-3 font-bold pr-5">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                      {dayExpenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-gray-50/20 dark:hover:bg-gray-750/10">
                          <td className="p-3 pl-5 font-extrabold text-xs">{expense.category}</td>
                          <td className="p-3 text-xs text-gray-500">{expense.description}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold ${
                              expense.type === 'DAILY' ? 'bg-blue-50 text-blue-750 dark:bg-blue-950/20 dark:text-blue-300' : 'bg-purple-50 text-purple-755 dark:bg-purple-950/20 dark:text-purple-300'
                            }`}>
                              {expense.type === 'DAILY' ? 'Diario' : 'Mensual'}
                            </span>
                          </td>
                          <td className="p-3 font-black text-red-500 text-xs">{formatCurrency(expense.amount)}</td>
                          <td className="p-3 pr-5">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => handleEdit(expense)} className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-md transition">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => handleDelete(expense.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        
        {sortedDates.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150/40 dark:border-gray-700/50 p-8 text-center text-gray-400 text-xs shadow-xs">
            No hay gastos registrados.
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editId ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Categoría (ej: Gas, Limpieza, Arriendo)"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              />
              <input
                type="text"
                placeholder="Descripción"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              />
              <input
                type="number"
                placeholder="Monto"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              />
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              >
                <option value="DAILY">Diario</option>
                <option value="MONTHLY">Mensual</option>
              </select>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              />
              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-salo-orange text-white rounded-xl font-semibold hover:bg-primary-700 transition"
              >
                {editId ? 'Actualizar' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
