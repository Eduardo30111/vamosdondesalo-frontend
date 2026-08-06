'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatLocalDate, toLocalDateInputValue } from '@/lib/utils';
import { Receipt, Plus, X, Pencil, Trash2, Calendar, Landmark, CheckCircle2, AlertCircle } from 'lucide-react';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  type: 'DAILY' | 'MONTHLY';
  date: string;
  user?: { name: string };
}

interface ScheduledExpense {
  id: string;
  name: string;
  description: string;
  amount: number;
  paidAmount: number;
  date: string;
}

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const YEARS = [2024, 2025, 2026, 2027, 2028];

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [payExpenseId, setPayExpenseId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filter, setFilter] = useState<'ALL' | 'DAILY' | 'MONTHLY'>('ALL');
  
  const [form, setForm] = useState({ category: '', description: '', amount: '', type: 'DAILY', date: toLocalDateInputValue(new Date()) });

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      const [expensesData, scheduledData] = await Promise.all([
        api.get<Expense[]>(`/expenses?year=${selectedYear}&month=${selectedMonth}`),
        api.get<ScheduledExpense[]>(`/expenses/scheduled?year=${selectedYear}&month=${selectedMonth}`)
      ]);
      setExpenses(expensesData);
      setScheduled(scheduledData);
    } catch (err: any) {
      toast.error('Error cargando los gastos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.category || !form.amount) {
      toast.error('Completa los campos obligatorios (Categoría/Nombre y Monto)');
      return;
    }
    try {
      if (form.type === 'SCHEDULED') {
        if (editId) {
          await api.put(`/expenses/scheduled/${editId}`, {
            name: form.category,
            description: form.description,
            amount: parseFloat(form.amount),
            date: form.date,
          });
          toast.success('Deuda programada actualizada');
        } else {
          await api.post('/expenses/scheduled', {
            name: form.category,
            description: form.description,
            amount: parseFloat(form.amount),
            date: form.date,
          });
          toast.success('Deuda programada registrada');
        }
      } else {
        if (editId) {
          await api.put(`/expenses/${editId}`, {
            category: form.category,
            description: form.description,
            amount: parseFloat(form.amount),
            type: form.type,
            date: form.date
          });
          toast.success('Gasto actualizado');
        } else {
          await api.post('/expenses', {
            category: form.category,
            description: form.description,
            amount: parseFloat(form.amount),
            type: form.type,
            date: form.date
          });
          toast.success('Gasto registrado');
        }
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

  // Scheduled Expenses Handlers
  const handleScheduledEdit = (item: ScheduledExpense) => {
    setEditId(item.id);
    setForm({
      category: item.name,
      description: item.description || '',
      amount: String(item.amount),
      type: 'SCHEDULED',
      date: toLocalDateInputValue(item.date),
    });
    setShowForm(true);
  };

  const handleScheduledDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto programado?')) return;
    try {
      await api.delete(`/expenses/scheduled/${id}`);
      toast.success('Gasto programado eliminado');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error eliminando gasto programado');
    }
  };

  const handlePayOpen = (item: ScheduledExpense) => {
    setPayExpenseId(item.id);
    setPayAmount(String(item.amount - item.paidAmount));
    setShowPayModal(true);
  };

  const handlePaySubmit = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    try {
      await api.post(`/expenses/scheduled/${payExpenseId}/pay`, { amount: parseFloat(payAmount) });
      toast.success('Abono registrado con éxito');
      setShowPayModal(false);
      setPayExpenseId(null);
      setPayAmount('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error registrando abono');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" />
      </div>
    );
  }

  const filtered = filter === 'ALL' ? expenses : expenses.filter(e => e.type === filter);
  const totalDaily = expenses.filter(e => e.type === 'DAILY').reduce((sum, e) => sum + e.amount, 0);
  const totalMonthly = expenses.filter(e => e.type === 'MONTHLY').reduce((sum, e) => sum + e.amount, 0);
  const totalScheduled = scheduled.reduce((sum, s) => sum + s.amount, 0);
  const totalScheduledPending = scheduled.reduce((sum, s) => sum + Math.max(0, s.amount - s.paidAmount), 0);

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-gray-155 dark:border-gray-800 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-salo-orange/10 rounded-2xl">
            <Receipt className="text-salo-orange" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black">Gastos</h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Registra y controla las salidas de caja, egresos operativos y deudas del sistema</p>
          </div>
        </div>
        
        {/* Month Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-sm font-semibold shadow-xs">
            <Calendar size={15} className="text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent border-none outline-none font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent border-none outline-none font-bold text-gray-700 dark:text-gray-200 cursor-pointer ml-1 border-l pl-2 border-gray-200 dark:border-gray-700"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setEditId(null);
              setForm({ category: '', description: '', amount: '', type: 'DAILY', date: toLocalDateInputValue(new Date()) });
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-salo-orange hover:bg-orange-600 text-white rounded-xl text-sm font-black shadow-xs transition animate-fade-in"
          >
            <Plus size={16} /> Registrar Gasto / Deuda
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-155/45 dark:border-gray-700/60 shadow-xs">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Gastos Diarios</p>
          <h2 className="text-2xl font-black text-red-500 mt-1">{formatCurrency(totalDaily)}</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-155/45 dark:border-gray-700/60 shadow-xs">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Gastos Fijos Mensuales</p>
          <h2 className="text-2xl font-black text-orange-500 mt-1">{formatCurrency(totalMonthly)}</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-155/45 dark:border-gray-700/60 shadow-xs">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Deudas Programadas</p>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{formatCurrency(totalScheduled)}</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-red-100 dark:border-red-900/30 bg-red-50/10 p-5 shadow-xs">
          <p className="text-xs text-red-500/80 font-bold uppercase tracking-wider">Deuda Pendiente (Por Pagar)</p>
          <h2 className="text-2xl font-black text-red-650 dark:text-red-400 mt-1">{formatCurrency(totalScheduledPending)}</h2>
        </div>
      </div>

      {/* Main Grid: Left Column for Real Expenses, Right for Scheduled Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Daily/Monthly Expense History */}
        <div className="bg-white dark:bg-gray-800 border border-gray-155/45 dark:border-gray-700/60 rounded-3xl shadow-sm p-6 lg:col-span-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-gray-750 pb-4 gap-2">
            <h3 className="font-extrabold text-base">Historial de Gastos</h3>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl text-xs font-bold self-start">
              <button onClick={() => setFilter('ALL')} className={`px-3 py-1.5 rounded-lg transition ${filter === 'ALL' ? 'bg-white dark:bg-gray-855 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}>Todos</button>
              <button onClick={() => setFilter('DAILY')} className={`px-3 py-1.5 rounded-lg transition ${filter === 'DAILY' ? 'bg-white dark:bg-gray-855 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}>Diarios</button>
              <button onClick={() => setFilter('MONTHLY')} className={`px-3 py-1.5 rounded-lg transition ${filter === 'MONTHLY' ? 'bg-white dark:bg-gray-855 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}>Mensuales</button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center py-12 text-gray-400 text-sm font-medium">No se han registrado gastos en este mes.</p>
          ) : (
            <>
              {/* Desktop view: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-750 text-gray-400 font-bold uppercase tracking-wider text-xs">
                      <th className="pb-3">Fecha</th>
                      <th className="pb-3">Categoría</th>
                      <th className="pb-3">Descripción</th>
                      <th className="pb-3">Tipo</th>
                      <th className="pb-3">Monto</th>
                      <th className="pb-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-750 font-semibold text-gray-700 dark:text-gray-300">
                    {filtered.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition">
                        <td className="py-3.5 whitespace-nowrap">{formatLocalDate(e.date)}</td>
                        <td className="py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30">{e.category}</span>
                        </td>
                        <td className="py-3.5 max-w-[200px] truncate" title={e.description}>{e.description}</td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${e.type === 'DAILY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30'}`}>
                            {e.type === 'DAILY' ? 'Diario' : 'Mensual'}
                          </span>
                        </td>
                        <td className="py-3.5 font-black text-red-500">{formatCurrency(e.amount)}</td>
                        <td className="py-3.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => handleEdit(e)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 rounded-lg transition" title="Editar"><Pencil size={14} /></button>
                            <button onClick={() => handleDelete(e.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition" title="Eliminar"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile view: Cards list */}
              <div className="md:hidden space-y-3">
                {filtered.map(e => (
                  <div key={e.id} className="p-4 bg-gray-50 dark:bg-gray-750/30 border border-gray-100 dark:border-gray-700 rounded-2xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs text-gray-400 font-bold">{formatLocalDate(e.date)}</span>
                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-white mt-0.5">{e.category}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${e.type === 'DAILY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30'}`}>
                        {e.type === 'DAILY' ? 'Diario' : 'Mensual'}
                      </span>
                    </div>
                    {e.description && <p className="text-xs text-gray-550 dark:text-gray-400 font-medium">{e.description}</p>}
                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-100 dark:border-gray-700/50">
                      <span className="font-black text-red-500 text-base">{formatCurrency(e.amount)}</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(e)} className="p-1.5 bg-white dark:bg-gray-800 text-gray-500 rounded-lg border border-gray-200 dark:border-gray-700 transition" title="Editar"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(e.id)} className="p-1.5 bg-white dark:bg-gray-800 text-red-500 rounded-lg border border-gray-200 dark:border-gray-700 transition" title="Eliminar"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right Side: Scheduled Expenses & Debts */}
        <div className="bg-white dark:bg-gray-800 border border-gray-155/45 dark:border-gray-700/60 rounded-3xl shadow-sm p-6 lg:col-span-5 space-y-5">
          <div className="border-b border-gray-100 dark:border-gray-750 pb-4">
            <h3 className="font-extrabold text-base">Gastos y Deudas Programadas</h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Gastos previstos y cuentas por pagar del mes.</p>
          </div>

          {scheduled.length === 0 ? (
            <p className="text-center py-12 text-gray-400 text-sm font-medium">No hay deudas programadas en este mes.</p>
          ) : (
            <div className="space-y-4">
              {scheduled.map(item => {
                const isPaid = item.paidAmount >= item.amount;
                const progress = Math.min(100, Math.round((item.paidAmount / item.amount) * 100));
                
                return (
                  <div
                    key={item.id}
                    className={`relative overflow-hidden rounded-2xl border transition shadow-xs flex flex-col p-4 ${
                      isPaid 
                        ? 'bg-green-50/15 border-green-200/80 dark:bg-green-950/5 dark:border-green-900/30' 
                        : 'bg-red-50/15 border-red-200/80 dark:bg-red-950/5 dark:border-red-900/30'
                    }`}
                  >
                    {/* Status Indicator Bar */}
                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${isPaid ? 'bg-green-500' : 'bg-red-500'}`} />

                    <div className="pl-2.5 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{item.name}</h4>
                          {item.description && <p className="text-xs text-gray-555 mt-0.5 font-medium">{item.description}</p>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                          isPaid ? 'bg-green-100 text-green-700 dark:bg-green-950/40' : 'bg-red-100 text-red-700 dark:bg-red-950/40'
                        }`}>
                          {isPaid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                          {isPaid ? 'Pagado' : 'Pendiente'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-gray-400">
                          <span>Abonado: {formatCurrency(item.paidAmount)}</span>
                          <span>{progress}% ({formatCurrency(item.amount)})</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-550 ${isPaid ? 'bg-green-500' : 'bg-red-500'}`} 
                            style={{ width: `${progress}%` }} 
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100/50 dark:border-gray-700/30">
                        <span className="text-[10px] text-gray-400 font-bold">{formatLocalDate(item.date)}</span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleScheduledEdit(item)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 rounded-lg transition"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleScheduledDelete(item.id)}
                            className="p-1.5 hover:bg-red-55 dark:hover:bg-red-950/30 text-red-500 rounded-lg transition"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                          {!isPaid && (
                            <button
                              onClick={() => handlePayOpen(item)}
                              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-650 text-white rounded-lg text-xs font-extrabold transition shadow-xs"
                            >
                              Abonar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Daily/Monthly/Scheduled Expense Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-700/80 p-6 w-full max-w-md shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="font-extrabold text-lg">{editId ? 'Actualizar' : 'Registrar'} Gasto / Deuda</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 transition"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-550 font-bold uppercase tracking-wider mb-1 block">
                  {form.type === 'SCHEDULED' ? 'Nombre de la Deuda / Proveedor *' : 'Categoría / Nombre *'}
                </label>
                <input
                  type="text"
                  placeholder={form.type === 'SCHEDULED' ? 'Ej: Proveedor de Carnes, Arriendo local' : 'Ej: Insumos, Servicios, Alquiler'}
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-medium text-gray-850 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="text-xs text-gray-555 font-bold uppercase tracking-wider mb-1 block">Descripción</label>
                <input
                  type="text"
                  placeholder="Ej: Factura de insumos del local"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-medium text-gray-850 dark:text-gray-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-555 font-bold uppercase tracking-wider mb-1 block">Monto ($) *</label>
                  <input
                    type="number"
                    placeholder="Monto total"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-medium text-gray-850 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-555 font-bold uppercase tracking-wider mb-1 block">
                    {form.type === 'SCHEDULED' ? 'Fecha de Vencimiento' : 'Fecha'}
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-medium text-gray-850 dark:text-gray-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-555 font-bold uppercase tracking-wider mb-1 block">Tipo de Registro</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-medium text-gray-850 dark:text-gray-200"
                >
                  <option value="DAILY">Diario / Operativo (Gasto inmediato)</option>
                  <option value="MONTHLY">Mensual / Fijo (Gasto inmediato)</option>
                  <option value="SCHEDULED">Deuda Programada (Pago a futuro)</option>
                </select>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-salo-orange hover:bg-orange-655 text-white font-black rounded-xl text-sm shadow-md transition"
              >
                {editId ? 'Guardar Cambios' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay/Abono Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-155 dark:border-gray-700/80 p-6 w-full max-w-sm shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="font-extrabold text-lg">Registrar Abono</h3>
              <button onClick={() => setShowPayModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 transition"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-555 font-bold uppercase tracking-wider mb-1 block">Monto del Abono ($)</label>
                <input
                  type="number"
                  placeholder="Monto a pagar"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-medium text-gray-850 dark:text-gray-200"
                  autoFocus
                />
              </div>

              <button
                onClick={handlePaySubmit}
                className="w-full py-3 bg-orange-500 hover:bg-orange-655 text-white font-black rounded-xl text-sm shadow-md transition"
              >
                Confirmar Abono
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
