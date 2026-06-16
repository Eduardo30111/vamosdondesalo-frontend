'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Info,
  DollarSign,
  Layers,
  Image as ImageIcon
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  salePrice: number;
  costPrice: number;
  type: string; // OWN | SUPPLIER
  preparationMode: 'VITRINA' | 'PREPARADO';
  active: boolean;
  dailyStock: number;
  saleType: string;
  prices: string | null;
  photoUrl: string | null;
  storeId: string | null;
}

interface Store {
  id: string;
  name: string;
  plan: 'FREE' | 'PRO';
  products: Product[];
}

export default function MerchantProductsPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [variants, setVariants] = useState<Array<{ label: string; price: number }>>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    salePrice: 0,
    costPrice: 0,
    type: 'OWN',
    preparationMode: 'VITRINA' as 'VITRINA' | 'PREPARADO',
    dailyStock: 99999,
    saleType: 'UNIT', // UNIT | WEIGHT | MENUDEO
    prices: '',
    photoUrl: '',
    active: true,
  });

  useEffect(() => {
    loadStore();
  }, []);

  const loadStore = async () => {
    try {
      const data = await api.get<Store>('/stores/my-store');
      setStore(data);
    } catch (err: any) {
      toast.error('Error cargando los productos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      salePrice: 0,
      costPrice: 0,
      type: 'OWN',
      preparationMode: 'VITRINA',
      dailyStock: 99999,
      saleType: 'UNIT',
      prices: '',
      photoUrl: '',
      active: true,
    });
    setVariants([]);
    setFile(null);
    setPreview(null);
    setShowModal(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    let parsedVariants: any[] = [];
    try {
      if (prod.prices) {
        parsedVariants = JSON.parse(prod.prices);
      }
    } catch (e) {
      console.error('Error parsing prices JSON:', e);
    }
    setVariants(parsedVariants);
    setFormData({
      name: prod.name,
      description: prod.description || '',
      salePrice: prod.salePrice,
      costPrice: prod.costPrice,
      type: prod.type,
      preparationMode: prod.preparationMode,
      dailyStock: prod.dailyStock,
      saleType: prod.saleType || 'UNIT',
      prices: prod.prices || '',
      photoUrl: prod.photoUrl || '',
      active: prod.active,
    });
    setFile(null);
    setPreview(null);
    setShowModal(true);
  };

  const handleToggleActive = async (prod: Product) => {
    if (!store) return;
    
    // If turning on, check FREE plan limit
    if (!prod.active && store.plan === 'FREE') {
      const activeCount = store.products.filter((p) => p.active).length;
      if (activeCount >= 50) {
        toast.error('El plan gratuito está limitado a un máximo de 50 productos activos');
        return;
      }
    }

    try {
      await api.put(`/products/${prod.id}`, { active: !prod.active });
      toast.success(prod.active ? 'Producto desactivado' : 'Producto activado');
      loadStore();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar estado');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.salePrice <= 0) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    if (!editingProduct && store?.plan === 'FREE' && formData.active) {
      const activeCount = store.products.filter((p) => p.active).length;
      if (activeCount >= 50) {
        toast.error('El plan gratuito está limitado a un máximo de 50 productos activos');
        return;
      }
    }

    // Default image if empty
    let finalPhoto = formData.photoUrl.trim();
    if (file) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const up = await api.upload<{ url: string; publicId: string }>('/upload/product-image', fd);
        finalPhoto = up.url;
      } catch (err: any) {
        toast.error('Error al subir la imagen');
        return;
      }
    } else if (!finalPhoto) {
      finalPhoto = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
    }

    const calculatedSalePrice = (formData.saleType === 'UNIT' && variants.length > 0) ? Number(variants[0].price) : Number(formData.salePrice);
    const payload = {
      ...formData,
      salePrice: calculatedSalePrice,
      costPrice: Number(formData.costPrice),
      dailyStock: Number(formData.dailyStock),
      prices: (formData.saleType === 'UNIT' && variants.length > 0) ? JSON.stringify(variants) : null,
      photoUrl: finalPhoto,
    };

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        toast.success('Producto actualizado con éxito');
      } else {
        await api.post('/products', payload);
        toast.success('Producto creado con éxito');
      }
      setShowModal(false);
      loadStore();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el producto');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  const activeProducts = store?.products.filter((p) => p.active) || [];
  const inactiveProducts = store?.products.filter((p) => !p.active) || [];

  return (
    <div className="space-y-6 font-sans pb-12">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-black">Mis Productos</h1>
          <p className="text-sm text-gray-500">Administra el menú y catálogo de tu tienda</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm shadow-md transition"
        >
          <Plus size={16} /> Agregar Producto
        </button>
      </div>

      {store?.plan === 'FREE' && (
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 rounded-3xl p-5 flex items-start gap-4">
          <Info className="text-orange-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-extrabold text-orange-800 dark:text-orange-400">Límite de Plan Básico</h4>
            <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed mt-1">
              Tienes <strong className="text-orange-900 dark:text-orange-200">{activeProducts.length} de 50</strong> productos activos. Desactiva productos antiguos si necesitas publicar nuevos productos en el catálogo de tu tienda.
            </p>
          </div>
        </div>
      )}

      {/* Grid of active / inactive sections */}
      <div className="space-y-8">
        {/* Active Products */}
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <CheckCircle className="text-green-500" size={20} /> Activos ({activeProducts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeProducts.map((p) => (
              <ProductCard key={p.id} product={p} onEdit={handleOpenEdit} onToggle={handleToggleActive} />
            ))}
            {activeProducts.length === 0 && (
              <p className="text-sm text-gray-400 py-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl text-center w-full col-span-full">
                No tienes productos activos hoy.
              </p>
            )}
          </div>
        </div>

        {/* Inactive Products */}
        <div className="space-y-4 pt-4">
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <XCircle className="text-gray-400" size={20} /> Ocultos / Inactivos ({inactiveProducts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {inactiveProducts.map((p) => (
              <ProductCard key={p.id} product={p} onEdit={handleOpenEdit} onToggle={handleToggleActive} />
            ))}
            {inactiveProducts.length === 0 && (
              <p className="text-sm text-gray-400 py-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl text-center w-full col-span-full">
                No tienes productos inactivos.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-extrabold text-lg">
                {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Empanada de Pollo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Descripción</label>
                <textarea
                  placeholder="Ej: Crujiente empanada con masa de maíz..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Tipo de Venta</label>
                <select
                  value={formData.saleType}
                  onChange={(e) => setFormData({ ...formData, saleType: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                >
                  <option value="UNIT">Por Unidad</option>
                  <option value="WEIGHT">Por Peso (Kg / Lb)</option>
                  <option value="MENUDEO">Menudeo / Porción (Precio Libre)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">
                    {formData.saleType === 'WEIGHT' ? 'Precio por Kg/Libra *' : 'Precio Venta *'}
                  </label>
                  <input
                    type="number"
                    required={formData.saleType !== 'MENUDEO'}
                    disabled={formData.saleType === 'UNIT' && variants.length > 0}
                    min={0}
                    placeholder={formData.saleType === 'UNIT' && variants.length > 0 ? 'Definido en variantes' : 'Ej: 3000'}
                    value={(formData.saleType === 'UNIT' && variants.length > 0) ? '' : (formData.salePrice || '')}
                    onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Precio Costo</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Ej: 1500"
                    value={formData.costPrice || ''}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                  />
                </div>
              </div>

              {formData.saleType === 'UNIT' && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasVariants"
                      checked={variants.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVariants([{ label: 'Normal', price: formData.salePrice || 0 }]);
                        } else {
                          setVariants([]);
                        }
                      }}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <label htmlFor="hasVariants" className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      Tiene múltiples precios / variantes
                    </label>
                  </div>

                  {variants.length > 0 && (
                    <div className="space-y-2 border border-gray-100 dark:border-gray-750 p-3 rounded-2xl bg-gray-50/50 dark:bg-gray-750/30">
                      <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider">Variantes y Precios</label>
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
                            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
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
                            className="w-28 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                          />
                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setVariants(variants.filter((_, i) => i !== index))}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setVariants([...variants, { label: '', price: 0 }])}
                        className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 mt-1 transition"
                      >
                        <Plus size={14} /> Agregar Variante
                      </button>
                    </div>
                  )}
                </div>
              )}

              {store?.plan === 'PRO' && (
                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-750 pt-3">
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Modo de Preparación</label>
                    <select
                      value={formData.preparationMode}
                      onChange={(e) => setFormData({ ...formData, preparationMode: e.target.value as any })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                    >
                      <option value="VITRINA">Stock Físico / Vitrina</option>
                      <option value="PREPARADO">Cocina / Preparación</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Stock Diario (Vitrina)</label>
                    <input
                      type="number"
                      min={0}
                      disabled={formData.preparationMode === 'PREPARADO'}
                      placeholder="Ej: 20"
                      value={formData.dailyStock || ''}
                      onChange={(e) => setFormData({ ...formData, dailyStock: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Cargar Foto de Producto</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    if (f) {
                      setPreview(URL.createObjectURL(f));
                    } else {
                      setPreview(null);
                    }
                  }}
                  className="w-full text-sm mb-2"
                />
                {(preview || formData.photoUrl) && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={preview || formData.photoUrl} alt="Vista previa" className="w-full h-32 object-cover" />
                  </div>
                )}
              </div>



              <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-750">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="active" className="text-sm font-bold text-gray-700 dark:text-gray-300">Publicar e iniciar activo inmediatamente</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/3 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 rounded-2xl font-bold transition text-sm text-gray-700 dark:text-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold transition text-sm shadow-md"
                >
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent ProductCard
function ProductCard({
  product,
  onEdit,
  onToggle
}: {
  product: Product;
  onEdit: (p: Product) => void;
  onToggle: (p: Product) => void;
}) {
  let priceDisplay = formatCurrency(product.salePrice);
  let badgeText = '';
  if (product.saleType === 'WEIGHT') {
    priceDisplay = `${formatCurrency(product.salePrice)} / Kg`;
    badgeText = 'Por Peso';
  } else if (product.saleType === 'MENUDEO') {
    priceDisplay = 'Precio Libre';
    badgeText = 'Menudeo';
  } else if (product.prices) {
    try {
      const parsed = JSON.parse(product.prices);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const minPrice = Math.min(...parsed.map((v: any) => v.price));
        const maxPrice = Math.max(...parsed.map((v: any) => v.price));
        priceDisplay = minPrice === maxPrice ? formatCurrency(minPrice) : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;
        badgeText = 'Variantes';
      }
    } catch (e) {}
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 border border-gray-150/40 dark:border-gray-750/70 shadow-xs flex flex-col justify-between hover:shadow-sm transition">
      <div className="space-y-3">
        <div className="aspect-video w-full rounded-2xl bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-100 dark:border-gray-700 relative">
          {product.photoUrl ? (
            <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs"><Package size={28} /></div>
          )}
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
              {product.preparationMode}
            </span>
            {badgeText && (
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white shadow-xs">
                {badgeText}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="font-extrabold text-base text-gray-900 dark:text-white truncate">{product.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{product.description || 'Sin descripción.'}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-750 flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Precio</p>
          <p className="text-base font-black text-orange-500">{priceDisplay}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(product)}
            className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-xl transition"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onToggle(product)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              product.active
                ? 'bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100'
                : 'bg-green-50 dark:bg-green-950/20 text-green-500 hover:bg-green-100'
            }`}
          >
            {product.active ? 'Ocultar' : 'Activar'}
          </button>
        </div>
      </div>
    </div>
  );
}
