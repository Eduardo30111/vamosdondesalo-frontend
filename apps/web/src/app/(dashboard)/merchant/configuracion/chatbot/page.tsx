'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  Settings,
  Bot,
  Sparkles,
  Lock,
  MessageSquare,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Save,
  Send,
  Calendar,
  AlertTriangle,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface StoreDetails {
  id: string;
  name: string;
  plan: 'FREE' | 'PRO' | 'PREMIUM';
  planExpiresAt: string;
}

interface ChatbotConfig {
  id: string;
  storeId: string;
  active: boolean;
  botName: string;
  welcomeMessage: string;
  whatsappNumber: string | null;
  evolutionApiKey: string | null;
  n8nUrl: string | null;
  businessHours: string;
  language: string;
  tone: string;
  promotions: string | null;
  featuredProducts: string | null;
  autoMessages: string | null;
  conversations: number;
  ordersGenerated: number;
  salesAttributed: number;
}

export default function ChatbotConfigurationPage() {
  const [store, setStore] = useState<StoreDetails | null>(null);
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    active: false,
    botName: 'Asistente Virtual',
    welcomeMessage: '¡Hola! ¿En qué puedo ayudarte hoy?',
    whatsappNumber: '',
    evolutionApiKey: '',
    n8nUrl: '',
    businessHours: '8:00 AM - 8:00 PM',
    language: 'es',
    tone: 'profesional',
    promotions: '',
    featuredProducts: '',
    autoMessages: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storeData = await api.get<StoreDetails>('/stores/my-store');
      setStore(storeData);

      if (storeData.plan === 'PREMIUM') {
        const isExpired = new Date() > new Date(storeData.planExpiresAt);
        if (!isExpired) {
          const configData = await api.get<ChatbotConfig>('/chatbot/config');
          setConfig(configData);
          setFormData({
            active: configData.active,
            botName: configData.botName || 'Asistente Virtual',
            welcomeMessage: configData.welcomeMessage || '¡Hola! ¿En qué puedo ayudarte hoy?',
            whatsappNumber: configData.whatsappNumber || '',
            evolutionApiKey: configData.evolutionApiKey || '',
            n8nUrl: configData.n8nUrl || '',
            businessHours: configData.businessHours || '8:00 AM - 8:00 PM',
            language: configData.language || 'es',
            tone: configData.tone || 'profesional',
            promotions: configData.promotions || '',
            featuredProducts: configData.featuredProducts || '',
            autoMessages: configData.autoMessages || '',
          });
        }
      }
    } catch (err: any) {
      toast.error('Error cargando los datos del chatbot');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = () => {
    setFormData((prev) => ({ ...prev, active: !prev.active }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    setSaving(true);
    try {
      const updated = await api.put<ChatbotConfig>('/chatbot/config', formData);
      setConfig(updated);
      toast.success('Configuración del Chatbot guardada con éxito');
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar configuración');
    } finally {
      setSaving(false);
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
        <h2 className="text-2xl font-bold">No se encontró información de la tienda</h2>
      </div>
    );
  }

  const isTrialExpired = new Date() > new Date(store.planExpiresAt);
  const isPremiumPlan = store.plan === 'PREMIUM';
  const showPaywall = !isPremiumPlan;
  const showExpiryAlert = isPremiumPlan && isTrialExpired;

  // Upgrade requests WhatsApp messages
  const upgradeMsg = encodeURIComponent(
    `Hola Administrador, deseo solicitar el ascenso al Plan PREMIUM para poder habilitar el Chatbot IA en mi tienda "${store.name}".`
  );
  const renewMsg = encodeURIComponent(
    `Hola Administrador, deseo renovar el Plan PREMIUM para mi tienda "${store.name}" y reactivar el Chatbot IA.`
  );

  return (
    <div className="max-w-xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-5 mb-5">
        <Bot className="text-blue-500" size={24} />
        <div>
          <h1 className="text-2xl font-black">Personalizar Tienda</h1>
          <p className="text-xs text-gray-500 mt-0.5">Configura la información pública y la identidad de tu comercio</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-150 dark:border-gray-750 pb-px mb-6 text-sm font-semibold">
        <Link
          href="/merchant/configuracion"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 pb-3 px-1 transition"
        >
          General
        </Link>
        <button
          type="button"
          className="border-b-2 border-orange-500 pb-3 text-orange-500 font-bold px-1 outline-none"
        >
          Chatbot IA 🤖
        </button>
      </div>

      {/* 1. Paywall - FREE / PRO Plans */}
      {showPaywall && (
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-750 p-8 sm:p-10 rounded-3xl shadow-md text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Lock size={30} />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-black uppercase tracking-wider">
              Exclusivo Plan PREMIUM
            </span>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Módulo de Chatbot IA bloqueado</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
              Para cubrir los consumos de la API de OpenAI (ChatGPT), la base de ejecución de n8n y los cargos de WhatsApp Meta, requieres una membresía **PREMIUM**.
            </p>
          </div>

          <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl p-5 text-left space-y-3 max-w-md mx-auto">
            <h4 className="font-extrabold text-xs text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
              <Sparkles size={14} /> Beneficios del Plan PREMIUM ($149,900/mes):
            </h4>
            <ul className="space-y-2 text-xs text-gray-650 dark:text-gray-400 font-semibold">
              <li className="flex items-center gap-2">✅ Asistente inteligente 24/7 en tu WhatsApp.</li>
              <li className="flex items-center gap-2">✅ Sincronización automática de tu catálogo de productos y stock.</li>
              <li className="flex items-center gap-2">✅ Información automática de horarios y métodos de pago a clientes.</li>
              <li className="flex items-center gap-2">✅ Captura de pedidos inteligente y métricas atribuidas.</li>
            </ul>
          </div>

          <a
            href={`https://wa.me/573001234567?text=${upgradeMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-black text-sm hover:opacity-95 shadow-md transition"
          >
            <Send size={15} /> Solicitar Plan PREMIUM en WhatsApp
          </a>
        </div>
      )}

      {/* 2. Expiry Screen */}
      {showExpiryAlert && (
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-red-200 dark:border-red-950 p-8 sm:p-10 rounded-3xl shadow-md text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle size={30} />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-full text-[10px] font-black uppercase tracking-wider">
              Plan Expirado
            </span>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Módulo Suspendido Temporalmente</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
              Tu membresía PREMIUM ha vencido. El Chatbot IA se ha desactivado automáticamente en tus números, pero hemos conservado toda tu configuración guardada. Renueva el plan para reactivarlo inmediatamente.
            </p>
          </div>

          <a
            href={`https://wa.me/573001234567?text=${renewMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-sm hover:opacity-95 shadow-md transition"
          >
            <Send size={15} /> Solicitar Renovación PREMIUM vía WhatsApp
          </a>
        </div>
      )}

      {/* 3. Metrics & Configuration Form (Active PREMIUM plan) */}
      {isPremiumPlan && !isTrialExpired && config && (
        <div className="space-y-8">
          {/* Metrics Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold uppercase text-gray-400 tracking-wider">Rendimiento del Chatbot IA</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 border border-gray-150/45 dark:border-gray-700/60 rounded-2xl shadow-xs">
                <div className="flex items-center gap-1.5 text-blue-500 mb-1">
                  <MessageSquare size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mensajes</span>
                </div>
                <p className="text-xl font-black">{config.conversations}</p>
                <p className="text-[9px] text-gray-400 font-semibold mt-0.5">Conversaciones</p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 border border-gray-150/45 dark:border-gray-700/60 rounded-2xl shadow-xs">
                <div className="flex items-center gap-1.5 text-green-500 mb-1">
                  <ShoppingCart size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pedidos</span>
                </div>
                <p className="text-xl font-black">{config.ordersGenerated}</p>
                <p className="text-[9px] text-gray-400 font-semibold mt-0.5">Atribuidos a IA</p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 border border-gray-150/45 dark:border-gray-700/60 rounded-2xl shadow-xs">
                <div className="flex items-center gap-1.5 text-orange-500 mb-1">
                  <DollarSign size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ventas</span>
                </div>
                <p className="text-sm font-black truncate">{formatCurrency(config.salesAttributed)}</p>
                <p className="text-[9px] text-gray-400 font-semibold mt-1">Facturación IA</p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 border border-gray-150/45 dark:border-gray-700/60 rounded-2xl shadow-xs">
                <div className="flex items-center gap-1.5 text-purple-500 mb-1">
                  <TrendingUp size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Conversión</span>
                </div>
                <p className="text-xl font-black">
                  {config.conversations > 0
                    ? `${((config.ordersGenerated / config.conversations) * 100).toFixed(1)}%`
                    : '0%'}
                </p>
                <p className="text-[9px] text-gray-400 font-semibold mt-0.5">Tasa de conversión</p>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-gray-800/60 border border-gray-150/45 dark:border-gray-700/60 rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-750 pb-4">
                <div>
                  <h3 className="font-extrabold text-base">Interruptor de Operación</h3>
                  <p className="text-xs text-gray-400 font-medium">Activa o desactiva las respuestas automáticas</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleActive}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                    formData.active ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      formData.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Nombre del Asistente *</label>
                  <input
                    type="text"
                    name="botName"
                    required
                    placeholder="Ej: SaloBot"
                    value={formData.botName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Horario de Atención *</label>
                  <input
                    type="text"
                    name="businessHours"
                    required
                    placeholder="Ej: Lunes a Sábado 8:00 AM - 10:00 PM"
                    value={formData.businessHours}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Mensaje de Bienvenida *</label>
                <textarea
                  name="welcomeMessage"
                  required
                  rows={2}
                  placeholder="Mensaje enviado al iniciar conversación..."
                  value={formData.welcomeMessage}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
                />
              </div>

              {/* API Integration */}
              <div className="border-t border-gray-100 dark:border-gray-750 pt-4 space-y-4">
                <h4 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                  Integración API & Webhook (n8n / Evolution)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Número de WhatsApp del Bot</label>
                    <input
                      type="text"
                      name="whatsappNumber"
                      placeholder="Ej: 573009998877"
                      value={formData.whatsappNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Evolution API Key</label>
                    <input
                      type="password"
                      name="evolutionApiKey"
                      placeholder="API Token de Evolution API..."
                      value={formData.evolutionApiKey}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">URL de n8n Webhook</label>
                  <input
                    type="url"
                    name="n8nUrl"
                    placeholder="https://n8n.tu-servidor.com/webhook/chat..."
                    value={formData.n8nUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                  />
                </div>
              </div>

              {/* Bot Persona Customization */}
              <div className="border-t border-gray-100 dark:border-gray-750 pt-4 space-y-4">
                <h4 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider">Tono & Personalización de Respuestas</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Idioma del Asistente</label>
                    <select
                      name="language"
                      value={formData.language}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                    >
                      <option value="es">Español (CO)</option>
                      <option value="en">Inglés (EN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Tono de Conversación</label>
                    <select
                      name="tone"
                      value={formData.tone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                    >
                      <option value="profesional">Profesional & Cordial</option>
                      <option value="amigable">Amigable & Cercano</option>
                      <option value="divertido">Divertido & Enérgico</option>
                      <option value="persuasivo">Persuasivo & Comercial</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Promociones Activas (Contexto IA)</label>
                  <textarea
                    name="promotions"
                    rows={2}
                    placeholder="Describe descuentos o promos vigentes (Ej: 2x1 los Jueves)..."
                    value={formData.promotions}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Productos Destacados / Recomendaciones</label>
                  <textarea
                    name="featuredProducts"
                    rows={2}
                    placeholder="Instruye a la IA para empujar ciertos productos (Ej: Salchipapa Especial)..."
                    value={formData.featuredProducts}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Mensajes Automáticos o FAQ</label>
                  <textarea
                    name="autoMessages"
                    rows={2}
                    placeholder="Respuestas predefinidas a preguntas frecuentes..."
                    value={formData.autoMessages}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-md flex items-center justify-center gap-2 transition"
            >
              <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Configuración del Chatbot'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
