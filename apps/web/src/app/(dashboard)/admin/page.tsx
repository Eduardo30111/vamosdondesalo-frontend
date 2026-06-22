'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, toLocalDateInputValue } from '@/lib/utils';
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Activity,
  Bike,
  Package,
  Warehouse,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface DashboardStats {
  totalSalesToday: number;
  ordersToday: number;
  activeOrders: number;
  profitToday: number;
  deliveryActive: number;
  topProducts: Array<{ name: string; count: number }>;
  weeklySales: Array<{ date: string; total: number }>;
  hourlyOrders: number[];
}

interface VitrinaItem {
  id: string;
  name: string;
  photoUrl: string | null;
  preparationMode: string;
  vitrinaStock: { qty: number } | null;
}

const getDaysAgo = (num: number) => {
  const d = new Date();
  d.setDate(d.getDate() - num);
  return toLocalDateInputValue(d);
};

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [vitrina, setVitrina] = useState<VitrinaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const todayDate = toLocalDateInputValue(new Date());
  const [chartDate, setChartDate] = useState(todayDate);
  const [productsDate, setProductsDate] = useState(todayDate);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (stats) {
      if (chartDate === todayDate) {
        loadChart(getDaysAgo(6), todayDate);
      } else {
        loadChart(chartDate, chartDate);
      }
    }
  }, [chartDate]);

  useEffect(() => {
    if (stats) {
      loadTopProducts(productsDate, productsDate);
    }
  }, [productsDate]);

  const loadStats = async () => {
    const today = toLocalDateInputValue(new Date());
    const cFrom = chartDate === today ? getDaysAgo(6) : chartDate;
    const cTo = chartDate === today ? today : chartDate;

    try {
      const [statsData, weeklyData, hourlyData, topProductsData, vitrinaData] = await Promise.all([
        api.get<DashboardStats>('/dashboard/stats'),
        api.get<Array<{ date: string; total: number }>>(`/dashboard/weekly-chart?from=${cFrom}&to=${cTo}`),
        api.get<{ hourlyOrders: number[] }>('/dashboard/hourly'),
        api.get<Array<{ name: string; count: number }>>(`/dashboard/top-products?from=${productsDate}&to=${productsDate}`),
        api.get<VitrinaItem[]>('/products'),
      ]);
      setStats({
        ...statsData,
        weeklySales: weeklyData,
        hourlyOrders: hourlyData.hourlyOrders,
        topProducts: topProductsData,
      });
      setVitrina(vitrinaData.filter((p) => p.preparationMode === 'VITRINA'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadChart = async (from: string, to: string) => {
    try {
      const data = await api.get<Array<{ date: string; total: number }>>(`/dashboard/weekly-chart?from=${from}&to=${to}`);
      setStats(prev => prev ? { ...prev, weeklySales: data } : null);
    } catch (err: unknown) {
      toast.error('Error cargando gráfico de ventas');
    }
  };

  const loadTopProducts = async (from: string, to: string) => {
    try {
      const data = await api.get<Array<{ name: string; count: number }>>(`/dashboard/top-products?from=${from}&to=${to}`);
      setStats(prev => prev ? { ...prev, topProducts: data } : null);
    } catch (err: unknown) {
      toast.error('Error cargando productos más vendidos');
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" />
      </div>
    );
  }

  const hourlyData = stats.hourlyOrders.map((count, hour) => ({
    hour: `${hour}:00`,
    orders: count,
  })).filter((_, i) => i >= 6 && i <= 22);

  const getChartData = () => {
    const isLongRange = stats.weeklySales.length > 7;
    return stats.weeklySales.map((d) => {
      let dateLabel = '';
      try {
        const parsedDate = new Date(d.date + 'T12:00:00');
        dateLabel = isLongRange
          ? parsedDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
          : parsedDate.toLocaleDateString('es-CO', { weekday: 'short' });
      } catch (e) {
        dateLabel = d.date;
      }
      return {
        date: dateLabel,
        total: d.total,
      };
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <MetricCard
          label="Ventas Hoy"
          value={formatCurrency(stats.totalSalesToday)}
          icon={DollarSign}
          color="text-green-500"
          bg="bg-green-50 dark:bg-green-900/20"
        />
        <MetricCard
          label="Utilidad Hoy"
          value={formatCurrency(stats.profitToday)}
          icon={TrendingUp}
          color={stats.profitToday >= 0 ? 'text-green-500' : 'text-red-500'}
          bg={stats.profitToday >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}
        />
        <MetricCard
          label="Pedidos Hoy"
          value={String(stats.ordersToday)}
          icon={ShoppingCart}
          color="text-blue-500"
          bg="bg-blue-50 dark:bg-blue-900/20"
        />
        <MetricCard
          label="Pedidos Activos"
          value={String(stats.activeOrders)}
          icon={Activity}
          color="text-orange-500"
          bg="bg-orange-50 dark:bg-orange-900/20"
        />
        <MetricCard
          label="Domicilios Activos"
          value={String(stats.deliveryActive)}
          icon={Bike}
          color="text-purple-500"
          bg="bg-purple-50 dark:bg-purple-900/20"
        />
        <MetricCard
          label="Productos Top"
          value={stats.topProducts[0]?.name || '-'}
          icon={Package}
          color="text-salo-orange"
          bg="bg-orange-50 dark:bg-orange-900/20"
          subtitle={stats.topProducts[0] ? `${stats.topProducts[0].count} uds` : ''}
        />
      </div>

      {/* Vitrina Stock */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Warehouse size={18} className="text-salo-orange" />
          Stock Vitrina
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {vitrina.map((p) => (
            <div key={p.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1 truncate">{p.name}</p>
              <p className={`text-xl font-bold ${(p.vitrinaStock?.qty ?? 0) < 5 ? 'text-red-500' : 'text-green-600'}`}>
                {p.vitrinaStock?.qty ?? 0}
              </p>
              <p className="text-[10px] text-gray-400">unidades</p>
            </div>
          ))}
          {vitrina.length === 0 && (
            <p className="text-center text-gray-400 col-span-full py-4 text-sm">Sin productos en vitrina</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly Sales Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="font-bold">
              {chartDate === todayDate ? 'Ventas de la Semana' : 'Ventas del Día'}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={chartDate}
                onChange={(e) => setChartDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none"
              />
              {chartDate !== todayDate && (
                <button
                  onClick={() => setChartDate(todayDate)}
                  className="px-2.5 py-1 bg-salo-orange hover:bg-orange-600 text-white rounded-lg font-bold transition"
                >
                  Actual
                </button>
              )}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="total" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Orders Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold mb-4">Horas Pico (Hoy)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hour" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold">
            {productsDate === todayDate ? 'Productos Más Vendidos (Hoy)' : 'Productos Más Vendidos'}
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={productsDate}
              onChange={(e) => setProductsDate(e.target.value)}
              className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none"
            />
            {productsDate !== todayDate && (
              <button
                onClick={() => setProductsDate(todayDate)}
                className="px-2.5 py-1 bg-salo-orange hover:bg-orange-600 text-white rounded-lg font-bold transition"
              >
                Actual
              </button>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {stats.topProducts.map((product, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-salo-orange text-white flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{product.name}</span>
                  <span className="text-sm text-gray-500">{product.count} unidades</span>
                </div>
                <div className="mt-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-salo-orange rounded-full"
                    style={{ width: `${(product.count / (stats.topProducts[0]?.count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {stats.topProducts.length === 0 && (
            <p className="text-center text-gray-400 py-4">No hay ventas en este período</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, bg, subtitle }: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon size={20} className={color} />
      </div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="font-bold text-lg truncate">{value}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}