'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatLocalDate, toLocalDateInputValue } from '@/lib/utils';
import { Receipt, Plus, X, Pencil, Trash2 } from 'lucide-react';

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

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="text-left p-3 font-medium">Categoría</th>
              <th className="text-left p-3 font-medium">Descripción</th>
              <th className="text-left p-3 font-medium">Tipo</th>
              <th className="text-left p-3 font-medium">Monto</th>
              <th className="text-left p-3 font-medium">Fecha</th>
              <th className="text-left p-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((expense) => (
              <tr key={expense.id}>
                <td className="p-3 font-medium">{expense.category}</td>
                <td className="p-3 text-gray-500">{expense.description}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    expense.type === 'DAILY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  }`}>
                    {expense.type === 'DAILY' ? 'Diario' : 'Mensual'}
                  </span>
                </td>
                <td className="p-3 font-bold text-red-500">{formatCurrency(expense.amount)}</td>
                <td className="p-3 text-gray-500">{formatLocalDate(expense.date)}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(expense)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(expense.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">No hay gastos registrados</td>
              </tr>
            )}
          </tbody>
        </table>
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
