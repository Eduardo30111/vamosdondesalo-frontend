'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Percent,
  Calendar,
  AlertTriangle,
  Send,
  Sparkles,
  ShieldCheck,
  Award,
  Lock
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface Store {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  whatsappNumber: string;
  category: string;
  plan: 'FREE' | 'PRO' | 'PREMIUM';
  planExpiresAt: string;
  commissionRate: number;
  balance: number;
  active: boolean;
  createdAt: string;
}

interface Order {
  id: string;
  total: number;
  createdAt: string;
  fulfillmentStatus: string;
  items: Array<{
    qty: number;
    unitPrice: number;
    product: {
      costPrice: number;
    };
  }>;
}

export default function MerchantDashboard() {
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storeData = await api.get<Store>('/stores/my-store');
      setStore(storeData);

      // Fetch store orders for analytics
      const ordersData = await api.get<Order[]>('/orders/store');
      setOrders(ordersData);
    } catch (err: any) {
      toast.error(err.message || 'Error cargando datos del comerciante');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">No tienes ninguna tienda asociada</h2>
        <p className="text-gray-500 mt-2">Registra tu comercio para empezar.</p>
      </div>
    );
  }

  // Calculate analytics
  const isStoreInTrial = (Date.now() - new Date(store.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000;
  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today && o.fulfillmentStatus !== 'CANCELLED');
  
  const totalSalesToday = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const ordersTodayCount = todayOrders.length;
  
  // Profit today = items total sale - items total cost
  const profitToday = todayOrders.reduce((sum, o) => {
    const itemsSale = o.items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
    const itemsCost = o.items.reduce((s, it) => s + (it.product?.costPrice || 0) * it.qty, 0);
    return sum + (itemsSale - itemsCost);
  }, 0);

  // Weekly Sales Chart Data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toDateString();
  }).reverse();

  const chartData = last7Days.map((dateStr) => {
    const dayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === dateStr && o.fulfillmentStatus !== 'CANCELLED');
    const total = dayOrders.reduce((sum, o) => sum + o.total, 0);
    const dateObj = new Date(dateStr);
    return {
      name: dateObj.toLocaleDateString('es-CO', { weekday: 'short' }),
      Ventas: total,
    };
  });

  // Plan Expiry status
  const isTrialExpired = new Date() > new Date(store.planExpiresAt);
  const isDelinquent = false;

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl p-6 md:p-8 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white uppercase tracking-wider">
            {store.plan === 'PREMIUM' ? '🤖 Plan PREMIUM (Chatbot IA)' : store.plan === 'PRO' ? '💎 Plan Profesional' : '🌱 Plan Básico (Prueba)'}
          </span>
          <h1 className="text-3xl font-black">{store.name}</h1>
          <p className="text-white/95 text-sm md:text-base max-w-xl">
            {store.description || 'Configura la descripción de tu negocio en la pestaña Configuración.'}
          </p>
        </div>
      </div>

      {!store.active && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-3xl p-5 flex flex-col sm:flex-row items-start gap-4">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={24} />
          <div className="space-y-1">
            <h4 className="font-extrabold text-amber-800 dark:text-amber-400">Tienda Desactivada por el Administrador</h4>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              Tu negocio ha sido desactivado temporalmente por la administración de la plataforma. Ponte en contacto con el soporte para mayor información.
            </p>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-150/45 dark:border-gray-700/60 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-950/30 text-green-500 rounded-2xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Ventas de Hoy</p>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{formatCurrency(totalSalesToday)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-150/45 dark:border-gray-700/60 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-2xl">
            <ShoppingCart size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pedidos Hoy</p>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{ordersTodayCount} ord</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-150/45 dark:border-gray-700/60 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 text-purple-500 rounded-2xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Ganancia Estimada</p>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{formatCurrency(profitToday)}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Plans status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800/80 p-5 border border-gray-150/45 dark:border-gray-700/60 rounded-3xl shadow-sm space-y-4 relative overflow-hidden">
          <div>
            <h3 className="font-extrabold text-lg">Historial de Ventas</h3>
            <p className="text-xs text-gray-400 font-medium">Facturación de los últimos 7 días</p>
          </div>
          {store.plan === 'PRO' ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip formatter={(value) => [`$${value.toLocaleString('es-CO')}`, 'Facturado']} labelClassName="text-gray-700 dark:text-gray-300 font-bold" />
                  <Area type="monotone" dataKey="Ventas" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 relative">
              <div className="absolute inset-0 bg-white/40 dark:bg-gray-800/40 backdrop-blur-[4px] z-0 rounded-2xl" />
              <div className="z-10 flex flex-col items-center max-w-sm">
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center shadow-inner mb-3">
                  <Lock size={20} />
                </div>
                <h4 className="font-extrabold text-sm text-gray-800 dark:text-white mb-1">Gráficos de Ventas Exclusivos de PRO</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                  Visualiza el gráfico interactivo de tus ventas diarias de la semana, tendencias y picos de venta.
                </p>
                <a
                  href={`https://wa.me/573001234567?text=${encodeURIComponent(`Hola, deseo solicitar el ascenso a Plan PRO para mi tienda "${store.name}" para ver los gráficos de ventas.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1 hover:opacity-90"
                >
                  <Sparkles size={12} /> Habilitar con Plan PRO
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Plan Expiry / Info */}
        <div className="bg-white dark:bg-gray-800/80 p-6 border border-gray-150/45 dark:border-gray-700/60 rounded-3xl shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg">Mi Suscripción</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                store.plan === 'PREMIUM'
                  ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                  : store.plan === 'PRO'
                  ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                  : 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
              }`}>
                Plan {store.plan}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-semibold flex items-center gap-1.5"><Calendar size={16} /> Renovación</span>
                <span className="font-bold">{new Date(store.planExpiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              {store.plan === 'FREE' && (
                <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100/50 dark:border-orange-900/20 rounded-2xl p-3 text-[11px] text-orange-600 dark:text-orange-400 leading-relaxed font-semibold">
                  💡 En el Plan Básico estás limitado a 10 productos activos. ¡Actualízate a PRO para eliminar los límites!
                </div>
              )}
            </div>
          </div>

          {store.plan !== 'PREMIUM' && (
            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-750">
              <h4 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider">Mejorar Cuenta</h4>
              {store.plan === 'FREE' && (
                <a
                  href={`https://wa.me/573001234567?text=${encodeURIComponent(`Hola, deseo solicitar el ascenso a Plan PRO para mi tienda "${store.name}".`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition"
                >
                  <Sparkles size={15} /> Subir a Plan PRO ($49,900)
                </a>
              )}
              <a
                href={`https://wa.me/573001234567?text=${encodeURIComponent(`Hola, deseo solicitar el ascenso a Plan PREMIUM para mi tienda "${store.name}".`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition"
              >
                <Sparkles size={15} /> Subir a Plan PREMIUM ($149,900)
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
