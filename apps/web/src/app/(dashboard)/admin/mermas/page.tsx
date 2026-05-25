'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Trash2, Plus, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  costPrice: number;
}

interface Waste {
  id: string;
  qty: number;
  reason: string;
  note: string | null;
  createdAt: string;
  product: { name: string; costPrice: number };
  user: { name: string };
}

const reasonLabels: Record<string, string> = {
  DAMAGED: 'Dañado',
  GIFTED: 'Cortesía',
  LOST: 'Perdido',
  OTHER: 'Otro',
};

export default function MermasPage() {
  const [wastes, setWastes] = useState<Waste[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: '', qty: '1', reason: 'DAMAGED', note: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [w, p] = await Promise.all([
        api.get<Waste[]>('/wastes'),
        api.get<Product[]>('/products'),
      ]);
      setWastes(w);
      setProducts(p);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.productId || !form.qty) {
      toast.error('Selecciona un producto y cantidad');
      return;
    }
    try {
      await api.post('/wastes', {
        productId: form.productId,
        qty: parseInt(form.qty),
        reason: form.reason,
        note: form.note || undefined,
      });
      toast.success('Merma registrada');
      setShowForm(false);
      setForm({ productId: '', qty: '1', reason: 'DAMAGED', note: '' });
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error registrando merma');
    }
  };

  const totalCost = wastes.reduce((sum, w) => sum + w.qty * w.product.costPrice, 0);

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
          <Trash2 className="text-salo-orange" />
          Mermas
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2.5 bg-salo-orange text-white rounded-xl font-medium text-sm hover:bg-primary-700 transition flex items-center gap-2"
        >
          <Plus size={16} />
          Registrar Merma
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <p className="text-sm text-gray-500">Costo total en mermas (visible)</p>
        <p className="text-2xl font-bold text-red-500">{formatCurrency(totalCost)}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="text-left p-3 font-medium">Producto</th>
              <th className="text-left p-3 font-medium">Cantidad</th>
              <th className="text-left p-3 font-medium">Razón</th>
              <th className="text-left p-3 font-medium">Costo</th>
              <th className="text-left p-3 font-medium">Registrado por</th>
              <th className="text-left p-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {wastes.map((waste) => (
              <tr key={waste.id}>
                <td className="p-3 font-medium">{waste.product.name}</td>
                <td className="p-3">{waste.qty}</td>
                <td className="p-3">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs">
                    {reasonLabels[waste.reason] || waste.reason}
                  </span>
                </td>
                <td className="p-3 text-red-500">{formatCurrency(waste.qty * waste.product.costPrice)}</td>
                <td className="p-3 text-gray-500">{waste.user.name}</td>
                <td className="p-3 text-gray-500">{new Date(waste.createdAt).toLocaleDateString('es-CO')}</td>
              </tr>
            ))}
            {wastes.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">No hay mermas registradas</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Waste Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Registrar Merma</h3>
              <button onClick={() => setShowForm(false)} className="p-1"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              >
                <option value="">Seleccionar producto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                placeholder="Cantidad"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              />

              <select
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              >
                <option value="DAMAGED">Dañado</option>
                <option value="GIFTED">Cortesía</option>
                <option value="LOST">Perdido</option>
                <option value="OTHER">Otro</option>
              </select>

              <input
                type="text"
                placeholder="Nota (opcional)"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              />

              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-salo-orange text-white rounded-xl font-semibold hover:bg-primary-700 transition"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
