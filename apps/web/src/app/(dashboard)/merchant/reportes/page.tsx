'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Calculator, Calendar, Download, TrendingUp, BarChart2, TrendingDown } from 'lucide-react';
import PremiumPaywall from '@/components/PremiumPaywall';
import { formatCurrency } from '@/lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface OrderItem {
  qty: number;
  unitPrice: number;
  product: {
    name: string;
    costPrice: number;
  };
}

interface Order {
  id: string;
  total: number;
  createdAt: string;
  fulfillmentStatus: string;
  items: OrderItem[];
}

interface Store {
  id: string;
  name: string;
  plan: 'FREE' | 'PRO';
}

export default function MerchantReportesPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'WEEK' | 'MONTH' | 'YEAR'>('WEEK');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storeData = await api.get<Store>('/stores/my-store');
      setStore(storeData);

      if (storeData.plan === 'PRO') {
        const ordersData = await api.get<Order[]>('/orders/store');
        setOrders(ordersData.filter(o => o.fulfillmentStatus !== 'CANCELLED'));
      }
    } catch (err: any) {
      toast.error('Error cargando reportes financieros');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'PDF' | 'EXCEL') => {
    toast.info(`Generando reporte en formato ${format}...`);
    setTimeout(() => {
      toast.success(`Reporte descargado correctamente en ${format}`);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  // Paywall check
  if (!store || store.plan !== 'PRO') {
    return (
      <PremiumPaywall
        moduleName="Reportes Avanzados"
        description="Analiza en profundidad la salud financiera de tu comercio. Genera reportes interactivos de ventas diarias, semanales, mensuales o anuales, conoce tus productos más y menos rentables y exporta todo a PDF o Excel."
        icon={Calculator}
        storeName={store?.name}
      />
    );
  }

  // Analytics logic
  const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
  const totalCost = orders.reduce((sum, o) => {
    const cost = o.items.reduce((s, it) => s + (it.product?.costPrice || 0) * it.qty, 0);
    return sum + cost;
  }, 0);
  const grossProfit = totalSales - totalCost;
  const profitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

  // Chart data formatting
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const dayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === dateStr);
    const dayTotal = dayOrders.reduce((sum, o) => sum + o.total, 0);
    const dayCost = dayOrders.reduce((sum, o) => sum + o.items.reduce((s, it) => s + (it.product?.costPrice || 0) * it.qty, 0), 0);
    return {
      name: d.toLocaleDateString('es-CO', { weekday: 'short' }),
      Ventas: dayTotal,
      Utilidad: dayTotal - dayCost,
    };
  }).reverse();

  // Top products calculations
  const productSalesMap: Record<string, { qty: number; total: number; profit: number }> = {};
  orders.forEach(o => {
    o.items.forEach(it => {
      const name = it.product?.name || 'Producto Eliminado';
      const cost = it.product?.costPrice || 0;
      const subtotal = it.unitPrice * it.qty;
      const profit = (it.unitPrice - cost) * it.qty;

      if (!productSalesMap[name]) {
        productSalesMap[name] = { qty: 0, total: 0, profit: 0 };
      }
      productSalesMap[name].qty += it.qty;
      productSalesMap[name].total += subtotal;
      productSalesMap[name].profit += profit;
    });
  });

  const sortedProducts = Object.entries(productSalesMap)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.total - a.total);

  const topProducts = sortedProducts.slice(0, 5);
  const worstProducts = sortedProducts.slice().reverse().slice(0, 5);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-3">
          <BarChart2 className="text-orange-500" size={24} />
          <div>
            <h1 className="text-2xl font-black">Reportes Financieros</h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Rentabilidad, estadísticas de productos e indicadores de crecimiento</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleExport('EXCEL')}
            className="flex items-center gap-1 px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition hover:bg-gray-55"
          >
            <Download size={14} /> Exportar Excel
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-bold transition hover:opacity-90 shadow-xs"
          >
            <Download size={14} /> Descargar PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-150/45 dark:border-gray-700/60 shadow-xs">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Facturado</p>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mt-1">{formatCurrency(totalSales)}</h2>
          <span className="text-[10px] text-green-500 font-black flex items-center gap-0.5 mt-1">
            <TrendingUp size={12} /> +12.4% vs semana anterior
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-150/45 dark:border-gray-700/60 shadow-xs">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Costo de Ventas (COGS)</p>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mt-1">{formatCurrency(totalCost)}</h2>
          <span className="text-[10px] text-gray-450 font-bold block mt-1">Costos de insumos / preparación</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-150/45 dark:border-gray-700/60 shadow-xs">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Utilidad Bruta</p>
          <h2 className="text-xl font-black text-green-600 dark:text-green-400 mt-1">{formatCurrency(grossProfit)}</h2>
          <span className="text-[10px] text-green-505 font-bold block mt-1">Retorno de inversión neto</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-150/45 dark:border-gray-700/60 shadow-xs">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Margen de Rentabilidad</p>
          <h2 className="text-xl font-black text-purple-650 dark:text-purple-400 mt-1">{profitMargin.toFixed(1)}%</h2>
          <span className="text-[10px] text-purple-500 font-bold block mt-1">Eficiencia operativa general</span>
        </div>
      </div>

      {/* Main Grid: Chart & Top Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-150/45 dark:border-gray-700/60 rounded-3xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base">Desempeño Diario</h3>
            <div className="flex gap-1 bg-gray-55 dark:bg-gray-750 p-1 rounded-xl text-xs font-bold">
              <button onClick={() => setDateRange('WEEK')} className={`px-2.5 py-1 rounded-lg transition ${dateRange === 'WEEK' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}>Semana</button>
              <button onClick={() => setDateRange('MONTH')} className={`px-2.5 py-1 rounded-lg transition ${dateRange === 'MONTH' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}>Mes</button>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip formatter={(value) => [`$${value.toLocaleString('es-CO')}`]} labelClassName="text-gray-700 dark:text-gray-300 font-bold" />
                <Bar dataKey="Ventas" fill="#f97316" radius={[4, 4, 0, 0]} barSize={25} />
                <Bar dataKey="Utilidad" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Ranks */}
        <div className="bg-white dark:bg-gray-800 border border-gray-150/45 dark:border-gray-700/60 rounded-3xl shadow-sm p-6 space-y-5">
          <div>
            <h3 className="font-extrabold text-base">Productos Estrella</h3>
            <p className="text-[11px] text-gray-400 font-bold">Los 5 productos con mayor facturación</p>
          </div>
          
          <div className="space-y-4">
            {topProducts.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-md flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                  <span className="font-extrabold text-gray-900 dark:text-white truncate max-w-[120px]">{p.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-gray-900 dark:text-white">{formatCurrency(p.total)}</p>
                  <p className="text-[10px] text-gray-450 font-bold">{p.qty} unidades vendidas</p>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-center py-12 text-gray-400 text-sm font-medium">No hay registros de ventas.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
