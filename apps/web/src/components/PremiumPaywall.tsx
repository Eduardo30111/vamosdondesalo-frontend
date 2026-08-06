'use client';

import React from 'react';
import { Lock, Check, X, ArrowLeft, MessageSquare, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PremiumPaywallProps {
  moduleName: string;
  description: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  storeName?: string;
}

export default function PremiumPaywall({ moduleName, description, icon: Icon, storeName }: PremiumPaywallProps) {
  const router = useRouter();
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573001234567';
  
  const upgradeMessage = encodeURIComponent(
    `Hola, me gustaría actualizar mi tienda "${storeName || 'Mi Negocio'}" al Plan PRO para habilitar el módulo de "${moduleName}".`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${upgradeMessage}`;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 font-sans space-y-8 animate-fade-in">
      {/* Back button and title bar */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-150 dark:border-gray-800">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-850 transition"
          title="Regresar"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Icon className="text-orange-500" size={24} />
            {moduleName}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Disponible en el Plan Profesional (PRO)</p>
        </div>
      </div>

      {/* Main card paywall */}
      <div className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-gray-200/60 dark:border-gray-750 p-8 sm:p-12 rounded-3xl shadow-xl space-y-8">
        {/* Glow decoration */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-200/30 dark:bg-orange-950/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-200/30 dark:bg-purple-950/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 mb-6 animate-pulse">
            <Lock size={30} />
          </div>

          <span className="px-3.5 py-1 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-purple-700 dark:text-purple-300 border border-purple-200/35 dark:border-purple-900/30 rounded-full text-[10px] font-black uppercase tracking-wider mb-4">
            Módulo Exclusivo PRO
          </span>

          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
            Desbloquea el Potencial de tu Tienda
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed mb-6 font-medium">
            {description}
          </p>

          <div className="w-full max-w-md bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 rounded-2xl p-4 text-xs text-orange-800 dark:text-orange-300 leading-relaxed font-bold mb-8 flex items-center gap-2">
            <span>⚠️</span>
            <span>Para poder obtener este módulo y optimizar tu administración, solicita el plan PRO.</span>
          </div>

          {/* Pricing Comparison Table */}
          <div className="w-full border border-gray-150 dark:border-gray-750 rounded-2xl overflow-hidden mb-8 shadow-xs">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-150 dark:border-gray-750 p-3 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <div className="text-left pl-2">Funcionalidad</div>
              <div>Plan FREE</div>
              <div className="text-purple-600 dark:text-purple-400">Plan PRO</div>
            </div>
            
            <div className="divide-y divide-gray-150 dark:divide-gray-750 text-xs font-semibold text-gray-700 dark:text-gray-300">
              <div className="grid grid-cols-3 p-3 items-center">
                <div className="text-left pl-2 font-bold text-gray-800 dark:text-gray-200">Límite de Productos</div>
                <div>Hasta 50 productos</div>
                <div className="text-purple-600 dark:text-purple-400 font-bold">Ilimitados</div>
              </div>

              <div className="grid grid-cols-3 p-3 items-center">
                <div className="text-left pl-2 font-bold text-gray-800 dark:text-gray-200">Domicilios y Entregas</div>
                <div className="text-red-500 flex justify-center"><X size={16} /></div>
                <div className="text-green-500 flex justify-center"><Check size={16} /></div>
              </div>
              <div className="grid grid-cols-3 p-3 items-center">
                <div className="text-left pl-2 font-bold text-gray-800 dark:text-gray-200">Inventario (Kardex)</div>
                <div className="text-red-500 flex justify-center"><X size={16} /></div>
                <div className="text-green-500 flex justify-center"><Check size={16} /></div>
              </div>
              <div className="grid grid-cols-3 p-3 items-center">
                <div className="text-left pl-2 font-bold text-gray-800 dark:text-gray-200">Control de Gastos y Flujo</div>
                <div className="text-red-500 flex justify-center"><X size={16} /></div>
                <div className="text-green-500 flex justify-center"><Check size={16} /></div>
              </div>
              <div className="grid grid-cols-3 p-3 items-center">
                <div className="text-left pl-2 font-bold text-gray-800 dark:text-gray-200">Facturación y Reportes PDF</div>
                <div className="text-red-500 flex justify-center"><X size={16} /></div>
                <div className="text-green-500 flex justify-center"><Check size={16} /></div>
              </div>
              <div className="grid grid-cols-3 p-3 items-center">
                <div className="text-left pl-2 font-bold text-gray-800 dark:text-gray-200">Multiusuario (Cajeros)</div>
                <div className="text-red-500 flex justify-center"><X size={16} /></div>
                <div className="text-green-500 flex justify-center"><Check size={16} /></div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <button
              onClick={() => router.back()}
              className="flex-1 py-3 px-5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl text-sm font-black hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Mantener Plan Básico
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 px-5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-650 hover:to-indigo-700 text-white rounded-2xl text-sm font-black shadow-md shadow-purple-500/10 flex items-center justify-center gap-2 transition"
            >
              <Sparkles size={16} /> Actualizar a Plan PRO
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
