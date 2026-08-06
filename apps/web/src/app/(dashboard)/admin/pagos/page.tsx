'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { CreditCard, Save } from 'lucide-react';

interface PaymentMethodConfig {
  method: string;
  qrUrl: string | null;
  key: string | null;
  enabled: boolean;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  NEQUI: 'Nequi',
  BANCOLOMBIA: 'Bancolombia',
  DAVIPLATA: 'Daviplata',
  TRANSFER: 'Transferencia',
  BREB: 'Breb',
};

export default function PagosPage() {
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMethods(); }, []);

  const loadMethods = async () => {
    try {
      const data = await api.get<PaymentMethodConfig[]>('/payments/methods');
      setMethods(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (method: string, data: Partial<PaymentMethodConfig>) => {
    try {
      const current = methods.find((m) => m.method === method);
      await api.put(`/payments/methods/${method}`, { ...current, ...data, enabled: data.enabled ?? current?.enabled ?? true });
      toast.success('Método actualizado');
      loadMethods();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><CreditCard className="text-salo-orange" /> Métodos de Pago</h1>
      <div className="space-y-4">
        {methods.map((m) => (
          <div key={m.method} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{METHOD_LABELS[m.method] || m.method}</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-500">{m.enabled ? 'Activo' : 'Inactivo'}</span>
                <input type="checkbox" checked={m.enabled} onChange={(e) => handleUpdate(m.method, { enabled: e.target.checked })} className="w-5 h-5 rounded accent-salo-orange" />
              </label>
            </div>
            {m.method !== 'CASH' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Imagen del QR</label>
                  {m.qrUrl && (
                    <div className="mb-2 w-20 h-20 border rounded-lg overflow-hidden relative group bg-gray-50 dark:bg-gray-700">
                      <img src={m.qrUrl} alt="QR Code" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const fd = new FormData();
                        fd.append('file', file);
                        const uploadToast = toast.loading('Subiendo imagen...');
                        const up = await api.upload<{ url: string; publicId: string }>('/upload/product-image', fd);
                        toast.success('Imagen de QR subida', { id: uploadToast });
                        handleUpdate(m.method, { qrUrl: up.url });
                      } catch (err: any) {
                        toast.error(err.message || 'Error al subir imagen');
                      }
                    }}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:file:bg-gray-700 dark:file:text-gray-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Llave / Número</label>
                  <input
                    type="text"
                    defaultValue={m.key || ''}
                    onBlur={(e) => handleUpdate(m.method, { key: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
                    placeholder="Número o referencia"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
