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
  saleType: string;
  prices: string | null;
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
  saleType: string;
  prices: string;
  supplierId?: string;
}

const emptyForm: FormData = {
  name: '',
  description: '',
  photoUrl: '',
  salePrice: 0,
  costPrice: 0,
  type: 'OWN',
  preparationMode: 'VITRINA',
  dailyStock: 99999,
  saleType: 'UNIT',
  prices: '',
};

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [variants, setVariants] = useState<Array<{ label: string; price: number }>>([]);

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
      const calculatedSalePrice = (form.saleType === 'UNIT' && variants.length > 0) ? Number(variants[0].price) : Number(form.salePrice);
      let payload = {
        ...form,
        salePrice: calculatedSalePrice,
        prices: (form.saleType === 'UNIT' && variants.length > 0) ? JSON.stringify(variants) : null,
      };

      // If a file was selected, upload it first and set the URL in the payload
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const up = await api.upload<{ url: string; publicId: string }>('/upload/product-image', fd);
        payload.photoUrl = up.url;
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
      setVariants([]);
      setFile(null);
      setPreview(null);
      loadProducts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleEdit = (p: Product) => {
    let parsedVariants: any[] = [];
    try {
      if (p.prices) {
        parsedVariants = JSON.parse(p.prices);
      }
    } catch (e) {
      console.error('Error parsing prices JSON:', e);
    }
    setVariants(parsedVariants);
    setForm({
      name: p.name,
      description: p.description || '',
      photoUrl: p.photoUrl || '',
      salePrice: p.salePrice,
      costPrice: p.costPrice,
      type: p.type,
      preparationMode: (p as any).preparationMode || 'VITRINA',
      dailyStock: p.dailyStock,
      saleType: p.saleType || 'UNIT',
      prices: p.prices || '',
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
        <button onClick={() => { setForm(emptyForm); setVariants([]); setEditId(null); setShowForm(true); }} className="px-4 py-2 bg-salo-orange text-white rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-primary-700 transition">
          <Plus size={18} /> Nuevo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p) => {
          let priceDisplay = formatCurrency(p.salePrice);
          let badgeText = '';
          if (p.saleType === 'WEIGHT') {
            priceDisplay = `${formatCurrency(p.salePrice)} / Kg`;
            badgeText = 'Peso';
          } else if (p.saleType === 'MENUDEO') {
            priceDisplay = 'Libre';
            badgeText = 'Menudeo';
          } else if (p.prices) {
            try {
              const parsed = JSON.parse(p.prices);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const minPrice = Math.min(...parsed.map((v: any) => v.price));
                const maxPrice = Math.max(...parsed.map((v: any) => v.price));
                priceDisplay = minPrice === maxPrice ? formatCurrency(minPrice) : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;
                badgeText = 'Variantes';
              }
            } catch (e) {}
          }

          return (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden relative">
              {badgeText && (
                <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white shadow-xs">
                  {badgeText}
                </span>
              )}
              <div className="aspect-video relative bg-gray-100 dark:bg-gray-700">
                {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Package size={40} /></div>}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-sm truncate">{p.name}</h3>
                <p className="text-xs text-gray-500 truncate">{p.description || 'Sin descripción.'}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-bold text-salo-orange">{priceDisplay}</span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{p.type}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleEdit(p)} className="flex-1 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg font-medium flex items-center justify-center gap-1"><Pencil size={12} /> Editar</button>
                  <button onClick={() => handleDelete(p.id)} className="flex-1 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg font-medium flex items-center justify-center gap-1"><Trash2 size={12} /> Eliminar</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editId ? 'Editar' : 'Nuevo'} Producto</h3>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                <input type="text" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" required />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
                <input type="text" placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
              </div>
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

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tipo de Venta</label>
                <select
                  value={form.saleType}
                  onChange={(e) => setForm({ ...form, saleType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
                >
                  <option value="UNIT">Por Unidad</option>
                  <option value="WEIGHT">Por Peso (Kg / Lb)</option>
                  <option value="MENUDEO">Menudeo / Porción (Precio Libre)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    {form.saleType === 'WEIGHT' ? 'Precio Kg/Libra' : 'Precio venta'}
                  </label>
                  <input
                    type="number"
                    required={form.saleType !== 'MENUDEO'}
                    disabled={form.saleType === 'UNIT' && variants.length > 0}
                    value={(form.saleType === 'UNIT' && variants.length > 0) ? '' : (form.salePrice || '')}
                    onChange={(e) => setForm({ ...form, salePrice: +e.target.value })}
                    onFocus={(e) => e.target.select()}
                    placeholder={form.saleType === 'UNIT' && variants.length > 0 ? 'En variantes' : 'Ej: 3000'}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm disabled:opacity-50"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Precio costo</label>
                  <input type="number" value={form.costPrice || ''} onChange={(e) => setForm({ ...form, costPrice: +e.target.value })} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" min="0" />
                </div>
              </div>

              {form.saleType === 'UNIT' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasVariantsAdmin"
                      checked={variants.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVariants([{ label: 'Normal', price: form.salePrice || 0 }]);
                        } else {
                          setVariants([]);
                        }
                      }}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <label htmlFor="hasVariantsAdmin" className="text-sm text-gray-700 dark:text-gray-300">
                      Tiene múltiples precios / variantes
                    </label>
                  </div>

                  {variants.length > 0 && (
                    <div className="space-y-2 border border-gray-100 dark:border-gray-700 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-700/30">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Variantes y Precios</label>
                      {variants.map((variant, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Ej: Mediana"
                            required
                            value={variant.label}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[index].label = e.target.value;
                              setVariants(newVariants);
                            }}
                            className="flex-1 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <input
                            type="number"
                            placeholder="Precio"
                            required
                            min={0}
                            value={variant.price || ''}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[index].price = Number(e.target.value);
                              setVariants(newVariants);
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-20 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setVariants(variants.filter((_, i) => i !== index))}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setVariants([...variants, { label: '', price: 0 }])}
                        className="text-[11px] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 mt-1 transition"
                      >
                        <Plus size={12} /> Agregar Variante
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs text-gray-500">Tipo</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, supplierId: e.target.value === 'OWN' ? undefined : form.supplierId })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"><option value="OWN">Propio</option><option value="SUPPLIER">Proveedor</option></select>
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
