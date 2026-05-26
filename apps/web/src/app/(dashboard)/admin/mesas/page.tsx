'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Plus, Trash2, QrCode, RefreshCw, Download, Grid3X3 } from 'lucide-react';

interface Table {
  id: string;
  number: number;
  qrToken: string;
}

export default function MesasPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNumber, setNewNumber] = useState('');

  useEffect(() => { loadTables(); }, []);

  const loadTables = async () => {
    try {
      const data = await api.get<Table[]>('/tables');
      setTables(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber) return;
    try {
      await api.post('/tables', { number: parseInt(newNumber) });
      toast.success('Mesa creada');
      setNewNumber('');
      loadTables();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar mesa?')) return;
    try {
      await api.delete(`/tables/${id}`);
      toast.success('Mesa eliminada');
      loadTables();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleRegenerate = async (id: string) => {
    try {
      await api.post(`/tables/${id}/regenerate-token`);
      toast.success('QR regenerado');
      loadTables();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const getMenuUrl = (token: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/mesa/${token}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Grid3X3 className="text-salo-orange" /> Mesas</h1>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input type="number" placeholder="Número de mesa" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm w-48" required min="1" />
        <button type="submit" className="px-4 py-2 bg-salo-orange text-white rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-primary-700 transition"><Plus size={18} /> Agregar</button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map((t) => (
          <div key={t.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold">Mesa {t.number}</h3>
              <QrCode className="text-salo-orange" size={24} />
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 mb-3">
              <p className="text-xs text-gray-500 mb-1">URL del menú:</p>
              <p className="text-xs font-mono break-all text-salo-orange">{getMenuUrl(t.qrToken)}</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => handleRegenerate(t.id)} className="flex-1 py-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg font-medium flex items-center justify-center gap-1"><RefreshCw size={12} /> Regenerar</button>
              <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/tables/${t.id}/qr`} download className="flex-1 py-2 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg font-medium flex items-center justify-center gap-1"><Download size={12} /> PNG</a>
              <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/tables/${t.id}/qr?format=pdf`} download className="flex-1 py-2 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg font-medium flex items-center justify-center gap-1"><Download size={12} /> PDF</a>
              <button onClick={() => handleDelete(t.id)} className="py-2 px-3 text-xs bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg font-medium flex items-center justify-center gap-1"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
