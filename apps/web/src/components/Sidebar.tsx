'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  Package,
  Users,
  Grid3X3,
  CreditCard,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Bike,
  Truck,
  Trash2,
  Receipt,
  Calculator,
  Settings,
  Store,
  DollarSign,
  Smartphone,
  Apple,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vitrina', label: 'Vitrina', icon: DollarSign },
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/cocina', label: 'Cocina', icon: ChefHat },
  { href: '/admin/domicilios', label: 'Domicilios', icon: Bike },
  { href: '/admin/fiados', label: 'Fiados', icon: CreditCard },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/proveedores', label: 'Proveedores', icon: Truck },
  { href: '/admin/mermas', label: 'Mermas', icon: Trash2 },
  { href: '/admin/gastos', label: 'Gastos', icon: Receipt },
  { href: '/admin/contabilidad', label: 'Contabilidad', icon: Calculator },
  { href: '/admin/mesas', label: 'Mesas', icon: Grid3X3 },
  { href: '/admin/pagos', label: 'Métodos Pago', icon: CreditCard },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
];

const vendedorLinks = [
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/vitrina', label: 'Vitrina', icon: DollarSign },
  { href: '/cocina', label: 'Cocina', icon: ChefHat },
];

const cocinaLinks = [
  { href: '/cocina', label: 'Producción', icon: ChefHat },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isDark, setIsDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('darkMode', String(next));
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const links = user?.role === 'ADMIN' ? adminLinks : user?.role === 'VENDEDOR' ? vendedorLinks : cocinaLinks;

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Logo Vamos Donde Salo"
            className="w-10 h-10 rounded-xl object-cover border border-gray-100 dark:border-gray-700"
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm truncate">Donde Salo!</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.name}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              pathname === link.href
                ? 'bg-salo-orange text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <link.icon size={20} />
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
        <button
          onClick={() => {
            setShowDownloadModal(true);
            setMobileOpen(false);
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <Smartphone size={20} />
          Descargar App
        </button>
        <Link
          href="/landing"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <Store size={20} />
          Ver Landing
        </Link>
        <button
          onClick={toggleDark}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          {isDark ? 'Modo claro' : 'Modo oscuro'}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          <LogOut size={20} />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
      >
        <Menu size={24} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full bg-white dark:bg-gray-800 flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col fixed left-0 top-0">
        {sidebarContent}
      </aside>

      {/* Modal de Descarga */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowDownloadModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-salo-orange/10 text-salo-orange flex items-center justify-center mb-4">
                <Smartphone size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                Descargar Aplicación
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 px-4">
                Lleva la aplicación en tu celular para gestionar tu negocio más rápido.
              </p>

              <div className="w-full space-y-3">
                {/* Android Option */}
                <a
                  href="/app-salo.apk"
                  download
                  className="flex items-center gap-4 p-3.5 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 transition-all w-full text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M17.523 15.3l1.816 3.146a.5.5 0 0 1-.866.5l-1.838-3.185a9.92 9.92 0 0 1-4.635 1.139 9.92 9.92 0 0 1-4.635-1.139L5.527 18.95a.5.5 0 0 1-.866-.5L6.477 15.3A10.024 10.024 0 0 1 2 7c0-.262.01-.522.03-.78a.5.5 0 0 1 .494-.46h18.952a.5.5 0 0 1 .494.46c.02.258.03.518.03.78a10.024 10.024 0 0 1-4.477 8.3zM7 6H6v1h1V6zm12 0h-1v1h1V6zM12 2C9.5 2 7.3 3.5 6.3 5.7h11.4C16.7 3.5 14.5 2 12 2z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Android (APK)</h4>
                    <p className="text-[11px] opacity-80">Descarga directa para celular</p>
                  </div>
                </a>

                {/* iOS Option */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 w-full text-left">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0">
                      <Apple size={22} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">iPhone / iOS</h4>
                      <p className="text-[11px] opacity-80">Instalar como App Web (PWA)</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 pl-1">
                    Toca el botón <span className="font-semibold">Compartir</span> en Safari y luego selecciona <span className="font-semibold">"Agregar a inicio"</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
