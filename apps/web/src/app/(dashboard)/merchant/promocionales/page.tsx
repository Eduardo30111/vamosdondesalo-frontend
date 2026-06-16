'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Megaphone,
  Lock,
  Sparkles,
  Plus,
  Trash2,
  Video,
  Image as ImageIcon,
  Send,
  Check,
  ArrowRight
} from 'lucide-react';

interface Store {
  id: string;
  name: string;
  plan: 'FREE' | 'PRO';
  promoMedia: string | null;
}

interface PromoMediaItem {
  url: string;
  type: 'IMAGE' | 'VIDEO';
  publicId: string;
}

export default function MerchantPromocionalesPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [promoList, setPromoList] = useState<PromoMediaItem[]>([]);

  useEffect(() => {
    loadStore();
  }, []);

  const loadStore = async () => {
    try {
      const data = await api.get<Store>('/stores/my-store');
      setStore(data);
      if (data.promoMedia) {
        try {
          const parsed = JSON.parse(data.promoMedia) as PromoMediaItem[];
          setPromoList(Array.isArray(parsed) ? parsed : []);
        } catch {
          setPromoList([]);
        }
      } else {
        setPromoList([]);
      }
    } catch (err: any) {
      toast.error('Error cargando los datos de la tienda');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !store) return;
    const file = e.target.files[0];
    
    // Check local upload limits
    const isVideo = file.type.startsWith('video/');
    const limit = isVideo ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > limit) {
      toast.error(`El archivo excede el tamaño máximo permitido (${isVideo ? '20MB' : '5MB'}).`);
      return;
    }

    setIsUploading(true);
    const fd = new FormData();
    fd.append('file', file);

    try {
      // Upload file to the promo media endpoint
      const res = await api.upload<{ url: string; publicId: string; type: 'IMAGE' | 'VIDEO' }>('/upload/promo-media', fd);
      
      const newMediaItem: PromoMediaItem = {
        url: res.url,
        type: res.type,
        publicId: res.publicId,
      };

      const updatedList = [...promoList, newMediaItem];
      
      // Update store in database
      await api.put(`/stores/${store.id}`, {
        promoMedia: JSON.stringify(updatedList),
      });

      toast.success('Elemento promocional subido correctamente');
      setPromoList(updatedList);
    } catch (err: any) {
      toast.error(err.message || 'Error al subir el archivo');
    } finally {
      setIsUploading(false);
      // Reset input value
      e.target.value = '';
    }
  };

  const handleDelete = async (publicId: string) => {
    if (!store || !confirm('¿Estás seguro de que deseas eliminar este banner promocional?')) return;
    
    const updatedList = promoList.filter((item) => item.publicId !== publicId);

    try {
      await api.put(`/stores/${store.id}`, {
        promoMedia: JSON.stringify(updatedList),
      });
      toast.success('Banner promocional eliminado');
      setPromoList(updatedList);
    } catch (err: any) {
      toast.error('Error al eliminar el banner');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  // Paywall check for FREE plan
  if (!store || store.plan !== 'PRO') {
    const upgradeUrl = `https://wa.me/573001234567?text=${encodeURIComponent(
      `Hola, me gustaría actualizar mi tienda "${store?.name || ''}" al plan PRO para activar el módulo de Publicidad y Banners Promocionales.`
    )}`;
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center font-sans space-y-8">
        <div className="flex items-center gap-3 border-b border-gray-150 dark:border-gray-800 pb-5 mb-8 text-left">
          <Megaphone className="text-orange-500" size={24} />
          <div>
            <h1 className="text-2xl font-black">Publicidad Promocional</h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Banners interactivos para tu tienda</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-150/45 dark:border-gray-700/60 p-8 sm:p-12 rounded-3xl shadow-lg mt-6">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-100 dark:bg-purple-950/20 rounded-full blur-2xl opacity-50" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-105 dark:bg-indigo-950/20 rounded-full blur-2xl opacity-50" />

          <div className="relative flex flex-col items-center">
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center shadow-inner mb-6">
              <Lock size={32} />
            </div>

            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-black uppercase tracking-wider mb-4">
              Módulo de Publicidad PRO
            </span>

            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
              Módulo Bloqueado
            </h2>

            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4 mb-8 text-sm text-purple-700 dark:text-purple-400 leading-relaxed font-semibold max-w-md">
              💎 Este módulo requiere que tu tienda cuente con el Plan Profesional (PRO) activo.
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
              Resalta frente al resto de comercios subiendo videos e imágenes promocionales que se reproducirán como un carrusel banner en la parte superior de tu tienda. ¡Da una imagen 100% profesional!
            </p>

            <a
              href={upgradeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-purple-500 to-indigo-650 hover:from-purple-650 hover:to-indigo-750 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition"
            >
              <Sparkles size={16} /> Subir a Plan PRO ($49,900)
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Unlocked PRO interface
  return (
    <div className="space-y-6 font-sans pb-12">
      <div className="flex items-center justify-between border-b border-gray-150 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-black">Publicidad y Banners</h1>
          <p className="text-sm text-gray-500">Sube fotos y videos para promocionar tus productos destacados</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 uppercase border border-purple-100 dark:border-purple-900/30">
          <Sparkles size={12} /> Tienda PRO
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Panel */}
        <div className="bg-white dark:bg-gray-800 border border-gray-150/45 dark:border-gray-700/60 p-6 rounded-3xl shadow-sm space-y-4 h-fit">
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <Plus size={18} className="text-orange-500" /> Nuevo Contenido
          </h3>
          <p className="text-xs text-gray-400 font-medium">
            Formatos aceptados: Imágenes (JPG, PNG, WebP) hasta 5MB. Videos (MP4, WebM) hasta 20MB.
          </p>

          <label className={`w-full h-36 border-2 border-dashed border-gray-200 dark:border-gray-750 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition hover:bg-gray-50/50 dark:hover:bg-gray-750/30 ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            ) : (
              <>
                <Plus className="text-gray-400" size={24} />
                <span className="text-xs font-bold text-gray-500">Subir Imagen o Video</span>
              </>
            )}
          </label>
        </div>

        {/* Banners Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-150/45 dark:border-gray-700/60 p-6 rounded-3xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <Megaphone size={18} className="text-orange-500" /> Banners Activos ({promoList.length})
          </h3>

          {promoList.length === 0 ? (
            <div className="text-center py-16 text-gray-400 border border-dashed border-gray-250/30 dark:border-gray-700 rounded-2xl">
              <Megaphone size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-bold">Aún no has agregado banners promocionales</p>
              <p className="text-[10px] text-gray-500 mt-1">Sube tu primer contenido en el panel lateral.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {promoList.map((item) => (
                <div
                  key={item.publicId}
                  className="group relative rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 aspect-[16/9]"
                >
                  {item.type === 'VIDEO' ? (
                    <video
                      src={item.url}
                      muted
                      loop
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt="Banner Promocional"
                      className="w-full h-full object-cover"
                    />
                  )}

                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5">
                    {item.type === 'VIDEO' ? <Video size={10} /> : <ImageIcon size={10} />}
                    {item.type === 'VIDEO' ? 'Video' : 'Imagen'}
                  </div>

                  <button
                    onClick={() => handleDelete(item.publicId)}
                    className="absolute top-2 right-2 p-1.5 bg-red-650 hover:bg-red-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow-sm"
                    title="Eliminar banner"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
