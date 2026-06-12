'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('salo_remember_email');
    const savedPassword = localStorage.getItem('salo_remember_password');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRemember(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<{ access_token: string; user: { id: string; name: string; email: string; role: string } }>('/auth/login', { email, password });
      setAuth(res.user, res.access_token);
      if (remember) {
        localStorage.setItem('salo_remember_email', email);
        localStorage.setItem('salo_remember_password', password);
      } else {
        localStorage.removeItem('salo_remember_email');
        localStorage.removeItem('salo_remember_password');
      }
      toast.success(`Bienvenido, ${res.user.name}!`);
      switch (res.user.role) {
        case 'ADMIN':
          router.push('/admin');
          break;
        case 'VENDEDOR':
          router.push('/pos');
          break;
        case 'COCINA':
          router.push('/cocina');
          break;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-salo-cream to-primary-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <img
              src="/logo.jpg"
              alt="Logo Vamos Donde Salo"
              className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 border-2 border-salo-orange shadow-md"
            />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vamos Donde Salo!</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Sistema POS</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-salo-orange focus:border-transparent outline-none transition"
                placeholder="admin@salo.co"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-salo-orange focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center pb-2">
              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-salo-orange focus:ring-salo-orange focus:ring-offset-0 cursor-pointer accent-salo-orange bg-gray-50 dark:bg-gray-700"
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Recordar contraseña
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-salo-orange hover:bg-primary-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">Demo:</p>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
              <p>Admin: admin@salo.co / admin123</p>
              <p>Vendedor: vendedor@salo.co / vendedor123</p>
              <p>Cocina: cocina@salo.co / cocina123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
