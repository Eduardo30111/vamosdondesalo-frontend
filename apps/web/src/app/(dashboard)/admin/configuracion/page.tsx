'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Settings, Save } from 'lucide-react';

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await api.get<Record<string, string>>('/config');
      setConfig(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/config', config);
      toast.success('Configuración guardada');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="text-salo-orange" />
          Configuración
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2.5 bg-salo-orange text-white rounded-xl font-medium text-sm hover:bg-primary-700 transition flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
        <div>
          <h2 className="font-bold mb-4">WhatsApp</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Número de WhatsApp</label>
              <input
                type="text"
                placeholder="573001234567"
                value={config.whatsapp_number || ''}
                onChange={(e) => setConfig({ ...config, whatsapp_number: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              />
              <p className="text-xs text-gray-400 mt-1">Formato internacional sin + (ej: 573001234567)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Mensaje predefinido</label>
              <input
                type="text"
                placeholder="Hola! Quiero hacer un pedido"
                value={config.whatsapp_message || ''}
                onChange={(e) => setConfig({ ...config, whatsapp_message: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
          <h2 className="font-bold mb-4">Negocio</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre del negocio</label>
              <input
                type="text"
                placeholder="Donde Salo!"
                value={config.business_name || ''}
                onChange={(e) => setConfig({ ...config, business_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">URL del logo</label>
              <input
                type="text"
                placeholder="https://..."
                value={config.business_logo_url || ''}
                onChange={(e) => setConfig({ ...config, business_logo_url: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
