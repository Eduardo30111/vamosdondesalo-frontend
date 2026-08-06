'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Store,
  CheckCircle,
  XCircle,
  PlusCircle,
  Edit,
  DollarSign,
  User,
  Activity,
  Award,
  ShieldAlert,
  Percent,
  Trash2
} from 'lucide-react';

interface StoreAdminData {
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
  active: boolean;
  createdAt: string;
  owner: {
    name: string;
    email: string;
  };
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreAdminData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Recharge modal states
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreAdminData | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  // Edit store modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStoreData, setEditStoreData] = useState<{
    id: string;
    plan: 'FREE' | 'PRO' | 'PREMIUM';
  } | null>(null);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const data = await api.get<StoreAdminData[]>('/stores/admin-list');
      setStores(data);
    } catch (err: any) {
      toast.error('Error cargando las tiendas');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (store: StoreAdminData) => {
    try {
      await api.post(`/stores/${store.id}/approve`, { active: !store.active });
      toast.success(store.active ? 'Tienda desactivada' : 'Tienda aprobada / activada');
      loadStores();
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estado de la tienda');
    }
  };



  const handleOpenEdit = (store: StoreAdminData) => {
    setEditStoreData({
      id: store.id,
      plan: store.plan,
    });
    setSelectedStore(store);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStoreData || !selectedStore) return;

    try {
      await api.put(`/stores/${editStoreData.id}`, {
        plan: editStoreData.plan,
      });
      toast.success(`Planes actualizados para ${selectedStore.name}`);
      setShowEditModal(false);
      loadStores();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar planes');
    }
  };

  const handleDeleteStore = async (store: StoreAdminData) => {
    if (store.name === 'Donde Salo!') {
      toast.error('No se puede eliminar la tienda oficial del administrador.');
      return;
    }
    if (!confirm(`¿Estás seguro de eliminar la tienda "${store.name}"? Esta acción es irreversible y eliminará todos sus productos y pedidos.`)) {
      return;
    }
    try {
      await api.delete(`/stores/${store.id}`);
      toast.success('Tienda eliminada con éxito');
      loadStores();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar la tienda');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'RESTAURANT': return 'Comida';
      case 'SALUD': return 'Salud';
      case 'TIENDA': return 'Tienda';
      case 'COMPRA_VENTA': return 'Compra/Venta';
      default: return category;
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      <div className="border-b border-gray-100 dark:border-gray-800 pb-5">
        <h1 className="text-2xl font-black">Aceptaciones de Tiendas</h1>
        <p className="text-sm text-gray-500">Supervisa planes y aprueba comercios del marketplace</p>
      </div>

      <div className="bg-white dark:bg-gray-800/60 border border-gray-150/40 dark:border-gray-700/60 rounded-3xl overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 font-extrabold text-xs uppercase tracking-wider border-b border-gray-150 dark:border-gray-700">
              <th className="py-4 px-6">Tienda / Propietario</th>
              <th className="py-4 px-6">Categoría</th>
              <th className="py-4 px-6">Suscripción</th>
              <th className="py-4 px-6">Estado</th>
              <th className="py-4 px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150 dark:divide-gray-700/60 text-sm font-semibold">
            {stores.map((store) => (
              <tr key={store.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition">
                <td className="py-4 px-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-100 dark:border-gray-750 flex-shrink-0 overflow-hidden relative">
                    {store.logoUrl ? (
                      <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400"><Store size={22} /></div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-gray-900 dark:text-white text-base">{store.name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><User size={12} /> {store.owner.name} ({store.owner.email})</p>
                  </div>
                </td>
                
                <td className="py-4 px-6">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-750 text-gray-700 dark:text-gray-300 border border-gray-200/40">
                    {getCategoryLabel(store.category)}
                  </span>
                </td>

                  <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    store.plan === 'PREMIUM'
                      ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                      : store.plan === 'PRO'
                      ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                      : 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                  }`}>
                    PLAN {store.plan}
                  </span>

                <td className="py-4 px-6">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    store.active
                      ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-950/20 text-red-500'
                  }`}>
                    <Activity size={12} /> {store.active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>

                <td className="py-4 px-6 text-right space-x-1">
                  <button
                    onClick={() => handleOpenEdit(store)}
                    className="p-2 text-gray-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-xl transition inline-flex"
                    title="Editar Plan"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleToggleActive(store)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                      store.active
                        ? 'bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100'
                        : 'bg-green-50 dark:bg-green-950/20 text-green-500 hover:bg-green-100'
                    }`}
                  >
                    {store.active ? 'Desactivar' : 'Activar'}
                  </button>
                  {store.name !== 'Donde Salo!' && (
                    <button
                      onClick={() => handleDeleteStore(store)}
                      className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition inline-flex align-middle"
                      title="Eliminar Tienda"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Store Modal */}
      {showEditModal && editStoreData && selectedStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-850 rounded-3xl shadow-2xl p-6">
            <h3 className="text-lg font-black mb-1">Editar Plan</h3>
            <p className="text-xs text-gray-400 font-medium mb-4">Actualiza las condiciones de "{selectedStore.name}"</p>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Plan de Suscripción</label>
                <select
                  value={editStoreData.plan}
                  onChange={(e) => setEditStoreData({ ...editStoreData, plan: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                >
                  <option value="FREE">Plan Básico (FREE)</option>
                  <option value="PRO">Plan Profesional (PRO)</option>
                  <option value="PREMIUM">Plan Chatbot IA (PREMIUM)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-1/3 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 rounded-xl font-bold transition text-sm text-gray-750 dark:text-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold transition text-sm shadow-md"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
