'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
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
  plan: 'FREE' | 'PRO';
  planExpiresAt: string;
  commissionRate: number;
  balance: number;
}

export default function MerchantConfigurationPage() {
  const [store, setStore] = useState<StoreDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    whatsappNumber: '',
    category: 'RESTAURANT',
    logoUrl: '',
    bannerUrl: '',
  });

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
      });
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
      await api.put(`/stores/${store.id}`, formData);
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

  return (
    <div className="space-y-6 font-sans pb-12 max-w-2xl mx-auto">
      <div className="border-b border-gray-100 dark:border-gray-800 pb-5">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Settings className="text-gray-400" size={24} /> Configuración de Tienda
        </h1>
        <p className="text-sm text-gray-500">Actualiza los datos públicos y de contacto de tu negocio</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-150/40 dark:border-gray-750/70 p-6 sm:p-8 rounded-3xl shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Nombre del Negocio *</label>
          <div className="relative">
            <Store size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
            <input
              type="text"
              name="name"
              required
              placeholder="Ej: Fritos Donde Salo!"
              value={formData.name}
              onChange={handleChange}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">WhatsApp para Recibir Pedidos *</label>
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

        <div>
          <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Categoría del Negocio</label>
          <div className="relative">
            <Layers size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
            >
              <option value="RESTAURANT">Comida / Restaurante</option>
              <option value="SALUD">Salud / Farmacia</option>
              <option value="TIENDA">Tienda de Productos / Regalos</option>
              <option value="COMPRA_VENTA">Compra y Venta</option>
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
          <h3 className="font-extrabold text-sm text-gray-700 dark:text-gray-200">Identidad Visual</h3>
          
          <div>
            <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">URL del Logo (1:1 recomendado)</label>
            <div className="relative">
              <Link2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
              <input
                type="text"
                name="logoUrl"
                placeholder="Ej: https://miweb.com/logo.png"
                value={formData.logoUrl}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">URL de Portada / Banner (Aspecto Horizontal)</label>
            <div className="relative">
              <ImageIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
              <input
                type="text"
                name="bannerUrl"
                placeholder="Ej: https://miweb.com/banner.png"
                value={formData.bannerUrl}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
              />
            </div>
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
