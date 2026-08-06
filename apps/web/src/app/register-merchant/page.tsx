'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatErrorMessage } from '@/lib/error-handler';
import { useAuthStore } from '@/store/auth';
import { ArrowLeft, Store, Shield, Check, DollarSign, Users, Award, Percent, Sparkles } from 'lucide-react';

export default function RegisterMerchantPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    // Account
    name: '',
    email: '',
    password: '',
    // Store
    storeName: '',
    whatsappNumber: '',
    description: '',
    category: 'RESTAURANT',
    // Plan
    plan: 'FREE' as 'FREE' | 'PRO' | 'PREMIUM',
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectPlan = (plan: 'FREE' | 'PRO' | 'PREMIUM') => {
    setFormData({ ...formData, plan });
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password) {
        toast.error('Por favor completa todos los campos de cuenta');
        return;
      }
      if (formData.password.length < 6) {
        toast.error('La contraseña debe tener al menos 6 caracteres');
        return;
      }
    } else if (step === 2) {
      if (!formData.storeName || !formData.whatsappNumber) {
        toast.error('Por favor completa los datos de tu tienda');
        return;
      }
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Step 1: Register user
      const registerRes = await fetch(`${API_URL}/auth/register-merchant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!registerRes.ok) {
        const error = await registerRes.json().catch(() => ({ message: 'Error de registro' }));
        throw new Error(error.message || 'Error registrando usuario');
      }

      const { access_token, user } = await registerRes.json();

      // Temporarily store credentials to use headers
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      // Step 2: Register store
      const storeRes = await fetch(`${API_URL}/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          name: formData.storeName,
          description: formData.description,
          whatsappNumber: formData.whatsappNumber,
          category: formData.category,
          plan: formData.plan,
        }),
      });

      if (!storeRes.ok) {
        const error = await storeRes.json().catch(() => ({ message: 'Error de creación de tienda' }));
        throw new Error(error.message || 'Error creando tienda');
      }

      // Finalize auth state
      setAuth(user, access_token);
      toast.success('¡Registro exitoso! Bienvenido a Vamos Donde Salo.');
      
      router.push('/merchant');
    } catch (err: any) {
      toast.error(formatErrorMessage(err, 'Hubo un error al registrarse'));
      // Clear half-logged sessions
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="absolute top-6 left-6">
        <Link href="/landing" className="flex items-center gap-2 text-sm font-bold text-orange-500 hover:text-orange-600 transition">
          <ArrowLeft size={16} /> Volver al Inicio
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          Registra tu Negocio
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Únete a Salo Store en Puerto Colombia y digitaliza tu catálogo hoy mismo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-sm border border-gray-100 dark:border-gray-700 sm:rounded-3xl sm:px-10 space-y-6">
          
          {/* Progress Indicators */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition ${
                  step === s
                    ? 'bg-orange-500 text-white shadow-sm'
                    : step > s
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-750 text-gray-400 dark:text-gray-500'
                }`}>
                  {step > s ? <Check size={14} /> : s}
                </span>
                <span className={`text-xs font-bold ${
                  step === s ? 'text-orange-500' : 'text-gray-400'
                }`}>
                  {s === 1 ? 'Cuenta' : s === 2 ? 'Tienda' : 'Plan'}
                </span>
              </div>
            ))}
          </div>

          {/* Wizard Steps */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Datos de Acceso</h3>
              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-500 dark:text-gray-400 tracking-wider mb-1">Nombre Completo</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Tu nombre y apellido"
                  className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-orange-400 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-500 dark:text-gray-400 tracking-wider mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ejemplo@negocio.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-orange-400 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-500 dark:text-gray-400 tracking-wider mb-1">Contraseña</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-orange-400 text-sm transition"
                />
              </div>
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold transition text-sm shadow-md mt-6"
              >
                Siguiente Paso →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Detalles de tu Tienda en Puerto Colombia</h3>
              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-500 dark:text-gray-400 tracking-wider mb-1">Nombre Comercial del Negocio</label>
                <input
                  type="text"
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleChange}
                  placeholder="Ej: Fritos Donde Salo, Artesanías del Muelle..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-orange-400 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-500 dark:text-gray-400 tracking-wider mb-1">WhatsApp para Pedidos (con indicativo)</label>
                <input
                  type="text"
                  name="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={handleChange}
                  placeholder="Ej: 573001234567"
                  className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-orange-400 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-500 dark:text-gray-400 tracking-wider mb-1">Categoría del Negocio</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-orange-400 text-sm transition"
                >
                  <option value="COMIDA">🍔 Comida / Restaurantes</option>
                  <option value="ARTESANIAS">🎨 Artesanías / Souvenirs</option>
                  <option value="PRODUCTOS">🛍️ Productos / Tienda</option>
                  <option value="SERVICIOS">🛠️ Servicios / Turismo</option>
                  <option value="SALUD">💊 Salud / Droguerías</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-500 dark:text-gray-400 tracking-wider mb-1">Descripción del Negocio</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Cuéntale a tus clientes de qué se trata tu tienda..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 outline-none focus:ring-2 focus:ring-orange-400 text-sm transition"
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="w-1/3 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 rounded-2xl font-bold transition text-sm"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-2/3 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold transition text-sm shadow-md"
                >
                  Siguiente Paso →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold">Selecciona tu Plan</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Free plan card */}
                <div
                  onClick={() => handleSelectPlan('FREE')}
                  className={`p-5 rounded-3xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    formData.plan === 'FREE'
                      ? 'border-orange-500 bg-orange-50/10 dark:bg-orange-950/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-650'
                  }`}
                >
                  <div className="space-y-2">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Plan Básico</span>
                    <h4 className="font-extrabold text-lg text-gray-900 dark:text-white">Gratis</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Prueba la plataforma sin costo fijo mensual.</p>
                  </div>
                  <ul className="space-y-2 mt-4 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-1.5"><Shield size={14} className="text-orange-500" /> Límite: 10 productos activos</li>
                    <li className="flex items-center gap-1.5"><Check size={14} className="text-orange-500" /> 1 Mes de Prueba Gratis</li>
                  </ul>
                </div>

                {/* Pro plan card */}
                <div
                  onClick={() => handleSelectPlan('PRO')}
                  className={`p-5 rounded-3xl border-2 transition cursor-pointer flex flex-col justify-between relative ${
                    formData.plan === 'PRO'
                      ? 'border-orange-500 bg-orange-50/10 dark:bg-orange-950/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-650'
                  }`}
                >
                  <div className="absolute -top-2.5 right-4 bg-orange-500 text-white text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase shadow-sm">Popular</div>
                  <div className="space-y-2">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">Plan Profesional</span>
                    <h4 className="font-extrabold text-lg text-gray-900 dark:text-white">$49,900 <span className="text-[10px] text-gray-400 font-bold">/ mes</span></h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Para negocios que buscan automatización y control total.</p>
                  </div>
                  <ul className="space-y-2 mt-4 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-1.5"><Shield size={14} className="text-orange-500" /> Sin límite de productos</li>
                    <li className="flex items-center gap-1.5"><DollarSign size={14} className="text-orange-500" /> Control de Vitrina vs Preparados</li>
                    <li className="flex items-center gap-1.5"><Users size={14} className="text-orange-500" /> Gestión de empleados</li>
                    <li className="flex items-center gap-1.5"><Award size={14} className="text-orange-500" /> Estadísticas y analíticas diarias</li>
                  </ul>
                </div>

                {/* Premium plan card */}
                <div
                  onClick={() => handleSelectPlan('PREMIUM')}
                  className={`p-5 rounded-3xl border-2 transition cursor-pointer flex flex-col justify-between relative ${
                    formData.plan === 'PREMIUM'
                      ? 'border-orange-500 bg-orange-50/10 dark:bg-orange-950/10'
                      : 'border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-650'
                  }`}
                >
                  <div className="absolute -top-2.5 right-4 bg-blue-600 text-white text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase shadow-sm">Completo</div>
                  <div className="space-y-2">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">Plan Chatbot IA</span>
                    <h4 className="font-extrabold text-lg text-gray-900 dark:text-white">$149,900 <span className="text-[10px] text-gray-400 font-bold">/ mes</span></h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Automatización de WhatsApp con IA y contexto de tu catálogo.</p>
                  </div>
                  <ul className="space-y-2 mt-4 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400"><Sparkles size={14} /> Chatbot IA en WhatsApp</li>
                    <li className="flex items-center gap-1.5"><Shield size={14} className="text-orange-500" /> Sin límite de productos</li>
                    <li className="flex items-center gap-1.5"><DollarSign size={14} className="text-orange-500" /> Control de Vitrina vs Preparados</li>
                    <li className="flex items-center gap-1.5"><Users size={14} className="text-orange-500" /> Gestión de empleados y reportes</li>
                    <li className="flex items-center gap-1.5"><Award size={14} className="text-orange-500" /> Métricas y tasa de conversión de IA</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="w-1/3 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 rounded-2xl font-bold transition text-sm"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="w-2/3 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-2xl font-bold transition text-sm shadow-md flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    'Finalizar Registro'
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
