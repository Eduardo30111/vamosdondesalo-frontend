'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatLocalDate, toLocalDateInputValue } from '@/lib/utils';
import { Calculator, Calendar, TrendingUp, TrendingDown, DollarSign, X } from 'lucide-react';

interface DailyReport {
  date: string;
  totalSales: number;
  orderCount: number;
  salesByMethod: Array<{ method: string; amount: number }>;
  supplierCosts: number;
  wasteCost: number;
  dailyExpenses: number;
  monthlyExpensesProrated: number;
  netProfit: number;
  margin: number;
  expectedCash: number;
}

interface MonthlyReport {
  year: number;
  month: number;
  daysInMonth: number;
  totalSales: number;
  orderCount: number;
  salesByMethod: Array<{ method: string; amount: number }>;
  supplierCosts: number;
  wasteCost: number;
  totalDailyExpenses: number;
  totalMonthlyExpenses: number;
  netProfit: number;
  margin: number;
}

interface CashCloseRecord {
  id: string;
  date: string;
  expectedCash: number;
  actualCash: number;
  difference: number;
  note: string | null;
  user: { name: string } | null;
}

type Tab = 'daily' | 'monthly' | 'cashclose';

export default function ContabilidadPage() {
  const [tab, setTab] = useState<Tab>('daily');
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [cashCloses, setCashCloses] = useState<CashCloseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(toLocalDateInputValue(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [showCashClose, setShowCashClose] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [cashNote, setCashNote] = useState('');

  useEffect(() => {
    loadData();
  }, [tab, selectedDate, selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'daily') {
        const data = await api.get<DailyReport>(`/accounting/daily?date=${selectedDate}`);
        setDailyReport(data);
      } else if (tab === 'monthly') {
        const [year, month] = selectedMonth.split('-');
        const data = await api.get<MonthlyReport>(`/accounting/monthly?year=${year}&month=${month}`);
        setMonthlyReport(data);
      } else {
        const data = await api.get<CashCloseRecord[]>('/accounting/cash-closes');
        setCashCloses(data);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCashClose = async () => {
    if (!actualCash) return;
    try {
      await api.post('/accounting/cash-close', {
        date: selectedDate,
        actualCash: parseFloat(actualCash),
        note: cashNote || undefined,
      });
      toast.success('Cierre de caja registrado');
      setShowCashClose(false);
      setActualCash('');
      setCashNote('');
      if (tab === 'cashclose') loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error registrando cierre');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="text-salo-orange" />
          Contabilidad
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'daily' as Tab, label: 'Diario' },
          { id: 'monthly' as Tab, label: 'Mensual' },
          { id: 'cashclose' as Tab, label: 'Cierre de Caja' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === t.id ? 'bg-salo-orange text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Daily Tab */}
      {tab === 'daily' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
            <button
              onClick={() => setShowCashClose(true)}
              className="ml-auto px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition"
            >
              Cerrar Caja
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-salo-orange" /></div>
          ) : dailyReport && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <MetricCard label="Ventas" value={formatCurrency(dailyReport.totalSales)} icon={DollarSign} color="text-green-500" />
                <MetricCard label="Utilidad Neta" value={formatCurrency(dailyReport.netProfit)} icon={dailyReport.netProfit >= 0 ? TrendingUp : TrendingDown} color={dailyReport.netProfit >= 0 ? 'text-green-500' : 'text-red-500'} />
                <MetricCard label="Margen" value={`${dailyReport.margin}%`} icon={TrendingUp} color="text-blue-500" />
                <MetricCard label="Caja Esperada" value={formatCurrency(dailyReport.expectedCash)} icon={DollarSign} color="text-purple-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold mb-3">Ingresos</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Ventas ({dailyReport.orderCount} pedidos)</span><span className="font-bold text-green-500">{formatCurrency(dailyReport.totalSales)}</span></div>
                    {dailyReport.salesByMethod.map(s => (
                      <div key={s.method} className="flex justify-between text-gray-500 pl-4"><span>{s.method}</span><span>{formatCurrency(s.amount)}</span></div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold mb-3">Egresos</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Costo proveedores</span><span className="text-red-500">{formatCurrency(dailyReport.supplierCosts)}</span></div>
                    <div className="flex justify-between"><span>Mermas</span><span className="text-red-500">{formatCurrency(dailyReport.wasteCost)}</span></div>
                    <div className="flex justify-between"><span>Gastos del día</span><span className="text-red-500">{formatCurrency(dailyReport.dailyExpenses)}</span></div>
                    <div className="flex justify-between"><span>Fijos mensuales (/30)</span><span className="text-red-500">{formatCurrency(dailyReport.monthlyExpensesProrated)}</span></div>
                    <div className="border-t pt-2 flex justify-between font-bold"><span>Total egresos</span><span className="text-red-500">{formatCurrency(dailyReport.supplierCosts + dailyReport.wasteCost + dailyReport.dailyExpenses + dailyReport.monthlyExpensesProrated)}</span></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Monthly Tab */}
      {tab === 'monthly' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-salo-orange" /></div>
          ) : monthlyReport && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <MetricCard label="Ventas del Mes" value={formatCurrency(monthlyReport.totalSales)} icon={DollarSign} color="text-green-500" />
                <MetricCard label="Utilidad Neta" value={formatCurrency(monthlyReport.netProfit)} icon={monthlyReport.netProfit >= 0 ? TrendingUp : TrendingDown} color={monthlyReport.netProfit >= 0 ? 'text-green-500' : 'text-red-500'} />
                <MetricCard label="Margen" value={`${monthlyReport.margin}%`} icon={TrendingUp} color="text-blue-500" />
                <MetricCard label="Pedidos" value={String(monthlyReport.orderCount)} icon={Calculator} color="text-purple-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold mb-3">Ingresos</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Ventas totales</span><span className="font-bold text-green-500">{formatCurrency(monthlyReport.totalSales)}</span></div>
                    {monthlyReport.salesByMethod.map(s => (
                      <div key={s.method} className="flex justify-between text-gray-500 pl-4"><span>{s.method}</span><span>{formatCurrency(s.amount)}</span></div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold mb-3">Egresos</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Costo proveedores</span><span className="text-red-500">{formatCurrency(monthlyReport.supplierCosts)}</span></div>
                    <div className="flex justify-between"><span>Mermas</span><span className="text-red-500">{formatCurrency(monthlyReport.wasteCost)}</span></div>
                    <div className="flex justify-between"><span>Gastos diarios</span><span className="text-red-500">{formatCurrency(monthlyReport.totalDailyExpenses)}</span></div>
                    <div className="flex justify-between"><span>Gastos fijos mensuales</span><span className="text-red-500">{formatCurrency(monthlyReport.totalMonthlyExpenses)}</span></div>
                    <div className="border-t pt-2 flex justify-between font-bold"><span>Total egresos</span><span className="text-red-500">{formatCurrency(monthlyReport.supplierCosts + monthlyReport.wasteCost + monthlyReport.totalDailyExpenses + monthlyReport.totalMonthlyExpenses)}</span></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Cash Close Tab */}
      {tab === 'cashclose' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-salo-orange" /></div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-left p-3 font-medium">Fecha</th>
                    <th className="text-left p-3 font-medium">Caja Esperada</th>
                    <th className="text-left p-3 font-medium">Caja Real</th>
                    <th className="text-left p-3 font-medium">Diferencia</th>
                    <th className="text-left p-3 font-medium">Nota</th>
                    <th className="text-left p-3 font-medium">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {cashCloses.map((cc) => (
                    <tr key={cc.id}>
                      <td className="p-3">{formatLocalDate(cc.date)}</td>
                      <td className="p-3">{formatCurrency(cc.expectedCash)}</td>
                      <td className="p-3">{formatCurrency(cc.actualCash)}</td>
                      <td className={`p-3 font-bold ${cc.difference >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {cc.difference >= 0 ? '+' : ''}{formatCurrency(cc.difference)}
                      </td>
                      <td className="p-3 text-gray-500">{cc.note || '-'}</td>
                      <td className="p-3 text-gray-500">{cc.user?.name || '-'}</td>
                    </tr>
                  ))}
                  {cashCloses.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">No hay cierres de caja</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Cash Close Modal */}
      {showCashClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Cierre de Caja</h3>
              <button onClick={() => setShowCashClose(false)} className="p-1"><X size={20} /></button>
            </div>
            {dailyReport && (
              <p className="text-sm text-gray-500 mb-4">
                Caja esperada: <span className="font-bold">{formatCurrency(dailyReport.expectedCash)}</span>
              </p>
            )}
            <input
              type="number"
              placeholder="Dinero contado en caja"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 mb-3"
            />
            <input
              type="text"
              placeholder="Nota (opcional)"
              value={cashNote}
              onChange={(e) => setCashNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 mb-4"
            />
            <button
              onClick={handleCashClose}
              disabled={!actualCash}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              Registrar Cierre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className={color} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
