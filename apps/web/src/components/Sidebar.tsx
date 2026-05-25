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
} from 'lucide-react';
import { useState, useEffect } from 'react';

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
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
  { href: '/cocina', label: 'Cocina', icon: ChefHat },
];

const cocinaLinks = [
  { href: '/cocina', label: 'Cocina', icon: ChefHat },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isDark, setIsDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <div className="w-10 h-10 bg-salo-orange rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
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
    </>
  );
}
