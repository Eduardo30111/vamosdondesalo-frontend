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
  Award
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
  plan: 'FREE' | 'PRO';
  planExpiresAt: string;
  commissionRate: number;
  balance: number;
  active: boolean;
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
  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today && o.fulfillmentStatus !== 'CANCELLED');
  
  const totalSalesToday = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const ordersTodayCount = todayOrders.length;
  
  // Commission deduction calculation
  const totalCommissionToday = todayOrders.reduce((sum, o) => {
    // total includes deliveryFee, so calculate items subtotal
    const subtotal = o.items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
    return sum + subtotal * store.commissionRate;
  }, 0);

  // Profit today = items total sale - items total cost - commission
  const profitToday = todayOrders.reduce((sum, o) => {
    const itemsSale = o.items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
    const itemsCost = o.items.reduce((s, it) => s + (it.product?.costPrice || 0) * it.qty, 0);
    const commission = itemsSale * store.commissionRate;
    return sum + (itemsSale - itemsCost - commission);
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
  const isDelinquent = isTrialExpired && store.plan === 'FREE' && store.balance < 5000;

  // Recharge message for WhatsApp
  const rechargeMsg = encodeURIComponent(
    `Hola Administrador, deseo solicitar una recarga de saldo para mi tienda "${store.name}".\nID Tienda: ${store.id}`
  );
  const adminWhatsAppUrl = `https://wa.me/573001234567?text=${rechargeMsg}`;

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl p-6 md:p-8 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white uppercase tracking-wider">
            {store.plan === 'PRO' ? '💎 Plan Profesional' : '🌱 Plan Básico (Prueba)'}
          </span>
          <h1 className="text-3xl font-black">{store.name}</h1>
          <p className="text-white/95 text-sm md:text-base max-w-xl">
            {store.description || 'Configura la descripción de tu negocio en la pestaña Configuración.'}
          </p>
        </div>
        <div className="shrink-0 flex gap-4">
          <div className="bg-white/10 px-4 py-3 rounded-2xl text-center">
            <p className="text-xs text-white/80 font-bold uppercase tracking-wider">Mi Saldo</p>
            <p className="text-xl font-black mt-0.5">{formatCurrency(store.balance)}</p>
          </div>
        </div>
      </div>

      {/* Warnings & Alerts */}
      {isDelinquent && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-3xl p-5 flex flex-col sm:flex-row items-start gap-4">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={24} />
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-red-800 dark:text-red-400">¡Tienda Ocultada por Saldo Insuficiente!</h4>
            <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
              Tu periodo de prueba ha finalizado y tu saldo es menor a $5.000 COP. Tus productos han sido ocultados automáticamente del marketplace para los clientes. Solicita una recarga inmediatamente para volver a activar tu tienda.
            </p>
            <a
              href={adminWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition mt-2"
            >
              <Send size={12} /> Solicitar Recarga vía WhatsApp
            </a>
          </div>
        </div>
      )}

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
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
          <div className="p-3 bg-orange-50 dark:bg-orange-950/30 text-orange-500 rounded-2xl">
            <Percent size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Comisión Aplicada</p>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{(store.commissionRate * 100)}%</p>
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
        <div className="lg:col-span-2 bg-white dark:bg-gray-800/80 p-5 border border-gray-150/45 dark:border-gray-700/60 rounded-3xl shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-lg">Historial de Ventas</h3>
            <p className="text-xs text-gray-400 font-medium">Facturación de los últimos 7 días</p>
          </div>
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
        </div>

        {/* Plan Expiry / Info */}
        <div className="bg-white dark:bg-gray-800/80 p-6 border border-gray-150/45 dark:border-gray-700/60 rounded-3xl shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg">Mi Suscripción</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                store.plan === 'PRO'
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
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-semibold flex items-center gap-1.5"><Percent size={16} /> Tasa de Comisión</span>
                <span className="font-bold">{(store.commissionRate * 100)}% por compra</span>
              </div>
              {store.plan === 'FREE' && (
                <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100/50 dark:border-orange-900/20 rounded-2xl p-3 text-[11px] text-orange-600 dark:text-orange-400 leading-relaxed font-semibold">
                  💡 En el Plan Básico estás limitado a 10 productos activos y un 8% de comisión. ¡Actualízate a PRO para eliminar los límites y bajar tu comisión al 4%!
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-750">
            <h4 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider">Recargas & Operación</h4>
            <a
              href={adminWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Send size={15} /> Recargar Saldo vía WhatsApp
            </a>
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
          </div>
        </div>

      </div>
    </div>
  );
}
