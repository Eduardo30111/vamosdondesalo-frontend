'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  Settings,
  Store,
  Phone,
  Info,
  Layers,
  Image as ImageIcon,
  Save,
  Link2
} from 'lucide-react';

interface StoreDetails {
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
  customTheme: string | null;
  customDomain: string | null;
  deliveryFeePuerto: number;
  deliveryFeePradomar: number;
  deliveryFeeSalgar: number;
  deliveryFeeBarranquilla: number;
}

export default function MerchantConfigurationPage() {
  const [store, setStore] = useState<StoreDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    whatsappNumber: '',
    category: 'RESTAURANT',
    logoUrl: '',
    bannerUrl: '',
    customTheme: '',
    customDomain: '',
    deliveryFeePuerto: 2500,
    deliveryFeePradomar: 3000,
    deliveryFeeSalgar: 5000,
    deliveryFeeBarranquilla: 8000,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  useEffect(() => {
    loadStore();
  }, []);

  const loadStore = async () => {
    try {
      const data = await api.get<StoreDetails>('/stores/my-store');
      setStore(data);
      setFormData({
        name: data.name,
        description: data.description || '',
        whatsappNumber: data.whatsappNumber,
        category: data.category,
        logoUrl: data.logoUrl || '',
        bannerUrl: data.bannerUrl || '',
        customTheme: data.customTheme || '#F97316',
        customDomain: data.customDomain || '',
        deliveryFeePuerto: data.deliveryFeePuerto ?? 2500,
        deliveryFeePradomar: data.deliveryFeePradomar ?? 3000,
        deliveryFeeSalgar: data.deliveryFeeSalgar ?? 5000,
        deliveryFeeBarranquilla: data.deliveryFeeBarranquilla ?? 8000,
      });
      setLogoFile(null);
      setLogoPreview(null);
      setBannerFile(null);
      setBannerPreview(null);
    } catch (err: any) {
      toast.error('Error cargando los datos de configuración');
    } finally {
      setLoading(false);
    }
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
    if (!formData.name || !formData.whatsappNumber) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      let updatedFormData = {
        ...formData,
        deliveryFeePuerto: parseFloat(formData.deliveryFeePuerto.toString()) || 0,
        deliveryFeePradomar: parseFloat(formData.deliveryFeePradomar.toString()) || 0,
        deliveryFeeSalgar: parseFloat(formData.deliveryFeeSalgar.toString()) || 0,
        deliveryFeeBarranquilla: parseFloat(formData.deliveryFeeBarranquilla.toString()) || 0,
      };
      
      if (logoFile) {
        const fd = new FormData();
        fd.append('file', logoFile);
        const up = await api.upload<{ url: string; publicId: string }>('/upload/product-image', fd);
        updatedFormData.logoUrl = up.url;
      }
      
      if (bannerFile) {
        const fd = new FormData();
        fd.append('file', bannerFile);
        const up = await api.upload<{ url: string; publicId: string }>('/upload/product-image', fd);
        updatedFormData.bannerUrl = up.url;
      }

      await api.put(`/stores/${store.id}`, updatedFormData);
      toast.success('Configuración guardada con éxito');
      loadStore();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar los cambios');
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

  return (
    <div className="max-w-xl mx-auto pb-12 font-sans">
      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-5 mb-5">
        <Settings className="text-orange-500" size={24} />
        <div>
          <h1 className="text-2xl font-black">Personalizar Tienda</h1>
          <p className="text-xs text-gray-500 mt-0.5">Configura la información pública y la identidad de tu comercio</p>
        </div>
      </div>

      <div className="flex gap-6 border-b border-gray-150 dark:border-gray-750 pb-px mb-6 text-sm font-semibold">
        <button
          type="button"
          className="border-b-2 border-orange-500 pb-3 text-orange-500 font-bold px-1 outline-none"
        >
          General
        </button>
        <Link
          href="/merchant/configuracion/chatbot"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 pb-3 px-1 transition"
        >
          Chatbot IA 🤖
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Nombre del Comercio *</label>
            <div className="relative">
              <Store size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
              <input
                type="text"
                name="name"
                required
                placeholder="Ej: Fritos Salo"
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">WhatsApp de Pedidos *</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
              <input
                type="text"
                name="whatsappNumber"
                required
                placeholder="Ej: 573001234567"
                value={formData.whatsappNumber}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Categoría del Comercio *</label>
          <div className="relative">
            <Layers size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
            >
              <option value="COMIDA">🍔 Comida / Restaurantes</option>
              <option value="ARTESANIAS">🎨 Artesanías / Souvenirs</option>
              <option value="PRODUCTOS">🛍️ Productos / Tienda</option>
              <option value="SERVICIOS">🛠️ Servicios / Turismo</option>
              <option value="SALUD">💊 Salud / Droguerías</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Descripción Pública</label>
          <div className="relative">
            <Info size={18} className="absolute left-3.5 top-4 text-gray-450" />
            <textarea
              name="description"
              placeholder="Ej: Ofrecemos comida rápida local de excelente calidad..."
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
            />
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-750 pt-4 space-y-4">
          <h3 className="font-extrabold text-sm text-gray-700 dark:text-gray-200">Tarifas de Domicilio</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Puerto Colombia ($)</label>
              <input
                type="number"
                name="deliveryFeePuerto"
                value={formData.deliveryFeePuerto}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Pradomar ($)</label>
              <input
                type="number"
                name="deliveryFeePradomar"
                value={formData.deliveryFeePradomar}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Salgar ($)</label>
              <input
                type="number"
                name="deliveryFeeSalgar"
                value={formData.deliveryFeeSalgar}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Barranquilla ($)</label>
              <input
                type="number"
                name="deliveryFeeBarranquilla"
                value={formData.deliveryFeeBarranquilla}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-750 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              Personalización Premium
              {store.plan !== 'PRO' && (
                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                  PRO
                </span>
              )}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1 flex items-center gap-1">
                Color de Acentuación
                {store.plan !== 'PRO' && <span className="text-gray-400">🔒</span>}
              </label>
              <div className="relative flex gap-2">
                <input
                  type="color"
                  name="customTheme"
                  disabled={store.plan !== 'PRO'}
                  value={formData.customTheme}
                  onChange={handleChange}
                  className="w-12 h-11 p-1 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                />
                <input
                  type="text"
                  name="customTheme"
                  disabled={store.plan !== 'PRO'}
                  placeholder="#F97316"
                  value={formData.customTheme}
                  onChange={handleChange}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1 flex items-center gap-1">
                Dominio Personalizado
                {store.plan !== 'PRO' && <span className="text-gray-400">🔒</span>}
              </label>
              <div className="relative">
                <Link2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
                <input
                  type="text"
                  name="customDomain"
                  disabled={store.plan !== 'PRO'}
                  placeholder={store.plan === 'PRO' ? "Ej: mitienda.com" : "Disponible en Plan PRO 🔒"}
                  value={formData.customDomain}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {store.plan !== 'PRO' && (
            <div className="p-3.5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl border border-purple-500/20 flex flex-col gap-2">
              <p className="text-xs text-purple-750 dark:text-purple-300 font-medium">
                La personalización de color de marca y dominio propio son exclusivos para tiendas con el <strong>Plan PRO</strong>.
              </p>
              <a
                href={`https://wa.me/${store.whatsappNumber}?text=Hola!%20Quiero%20adquirir%20el%20Plan%20PRO%20para%20mi%20tienda%20${encodeURIComponent(store.name)}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-purple-600 hover:text-purple-750 transition flex items-center gap-0.5 self-start"
              >
                Solicitar Plan PRO ahora &rarr;
              </a>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-750 pt-4 space-y-4">
          <h3 className="font-extrabold text-sm text-gray-700 dark:text-gray-200">Identidad Visual</h3>
          
          <div>
            <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Cargar Logo de la Tienda (1:1 recomendado)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setLogoFile(f);
                if (f) {
                  setLogoPreview(URL.createObjectURL(f));
                } else {
                  setLogoPreview(null);
                }
              }}
              className="w-full text-sm mb-2"
            />
            {(logoPreview || formData.logoUrl) && (
              <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 w-24 h-24">
                <img src={logoPreview || formData.logoUrl!} alt="Logo de la tienda" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Cargar Banner / Portada (Aspecto Horizontal)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setBannerFile(f);
                if (f) {
                  setBannerPreview(URL.createObjectURL(f));
                } else {
                  setBannerPreview(null);
                }
              }}
              className="w-full text-sm mb-2"
            />
            {(bannerPreview || formData.bannerUrl) && (
              <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 w-full h-32">
                <img src={bannerPreview || formData.bannerUrl!} alt="Portada de la tienda" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-55 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 mt-6"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <>
              <Save size={16} /> Guardar Configuración
            </>
          )}
        </button>
      </form>
    </div>
  );
}
