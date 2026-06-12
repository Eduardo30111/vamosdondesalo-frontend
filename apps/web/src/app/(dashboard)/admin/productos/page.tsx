'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Plus, Pencil, Trash2, X, Package, ImageIcon } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  salePrice: number;
  costPrice: number;
  type: string;
  supplierId: string | null;
  dailyStock: number;
}

interface FormData {
  name: string;
  description: string;
  photoUrl: string;
  salePrice: number;
  costPrice: number;
  type: string;
  preparationMode: string;
  dailyStock: number;
  supplierId?: string;
}

const emptyForm: FormData = { name: '', description: '', photoUrl: '', salePrice: 0, costPrice: 0, type: 'OWN', preparationMode: 'VITRINA', dailyStock: 50 };

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await api.get<any[]>('/suppliers');
      setSuppliers(data);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await api.get<Product[]>('/products');
      setProducts(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Build the payload from current form state
      let payload = { ...form };

      // If a file was selected, upload it first and set the URL in the payload
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const up = await api.upload<{ url: string; publicId: string }>('/upload/product-image', fd);
        payload.photoUrl = up.url;
        setForm(payload);
      }

      if (editId) {
        await api.put(`/products/${editId}`, payload);
        toast.success('Producto actualizado');
      } else {
        await api.post('/products', payload);
        toast.success('Producto creado');
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      setFile(null);
      setPreview(null);
      loadProducts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleEdit = (p: Product) => {
    setForm({
      name: p.name,
      description: p.description || '',
      photoUrl: p.photoUrl || '',
      salePrice: p.salePrice,
      costPrice: p.costPrice,
      type: p.type,
      preparationMode: (p as any).preparationMode || 'VITRINA',
      dailyStock: p.dailyStock,
      supplierId: p.supplierId || undefined,
    });
    setEditId(p.id);
    setFile(null);
    setPreview(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar producto?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Producto eliminado');
      loadProducts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="text-salo-orange" /> Productos</h1>
        <button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} className="px-4 py-2 bg-salo-orange text-white rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-primary-700 transition">
          <Plus size={18} /> Nuevo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="aspect-video relative bg-gray-100 dark:bg-gray-700">
              {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Package size={40} /></div>}
            </div>
            <div className="p-4">
              <h3 className="font-bold text-sm truncate">{p.name}</h3>
              <p className="text-xs text-gray-500 truncate">{p.description}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-salo-orange">{formatCurrency(p.salePrice)}</span>
                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{p.type}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleEdit(p)} className="flex-1 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg font-medium flex items-center justify-center gap-1"><Pencil size={12} /> Editar</button>
                <button onClick={() => handleDelete(p.id)} className="flex-1 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg font-medium flex items-center justify-center gap-1"><Trash2 size={12} /> Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editId ? 'Editar' : 'Nuevo'} Producto</h3>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" required />
              <input type="text" placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
              <div className="space-y-2">
                <label className="text-xs text-gray-500">Foto del producto</label>
                <input type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  if (f) {
                    setPreview(URL.createObjectURL(f));
                  } else {
                    setPreview(null);
                  }
                }} className="w-full text-sm" />
                {(preview || form.photoUrl) && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                    <img src={preview || form.photoUrl} alt="Vista previa" className="w-full h-32 object-cover" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500">Precio venta</label><input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" min="0" required /></div>
                <div><label className="text-xs text-gray-500">Precio costo</label><input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" min="0" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500">Tipo</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, supplierId: e.target.value === 'OWN' ? undefined : form.supplierId })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"><option value="OWN">Propio</option><option value="SUPPLIER">Proveedor</option></select></div>
                <div><label className="text-xs text-gray-500">Stock diario</label><input type="number" value={form.dailyStock} onChange={(e) => setForm({ ...form, dailyStock: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" min="0" required /></div>
              </div>
              {form.type === 'SUPPLIER' && (
                <div>
                  <label className="text-xs text-gray-500">Proveedor</label>
                  <select value={form.supplierId || ''} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" required>
                    <option value="">Selecciona un proveedor</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500">Modo de preparación</label>
                <select value={form.preparationMode} onChange={(e) => setForm({ ...form, preparationMode: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm">
                  <option value="VITRINA">Vitrina (ya preparado)</option>
                  <option value="PREPARADO">Preparado (cocinar al momento)</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-salo-orange text-white font-semibold hover:bg-primary-700 transition">{editId ? 'Actualizar' : 'Crear'} Producto</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
