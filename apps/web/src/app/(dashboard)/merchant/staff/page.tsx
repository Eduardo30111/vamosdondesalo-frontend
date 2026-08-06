'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Sparkles,
  Check,
  Send,
  UserCheck,
  Briefcase
} from 'lucide-react';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'VENDEDOR' | 'COCINA' | 'MERCHANT_STAFF';
  createdAt: string;
}

interface Store {
  id: string;
  name: string;
  plan: 'FREE' | 'PRO' | 'PREMIUM';
}

export default function MerchantStaffPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'VENDEDOR' as 'VENDEDOR' | 'COCINA' | 'MERCHANT_STAFF',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storeData = await api.get<Store>('/stores/my-store');
      setStore(storeData);

      if (storeData.plan === 'PRO') {
        const staffData = await api.get<StaffUser[]>('/users/store');
        setStaff(staffData);
      }
    } catch (err: any) {
      toast.error('Error cargando datos del personal');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'VENDEDOR',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user: StaffUser) => {
    setEditingStaff(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Leave empty on edit by default
      role: user.role,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este empleado?')) return;
    try {
      await api.delete(`/users/store/${id}`);
      toast.success('Empleado eliminado');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar empleado');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    if (!editingStaff && !formData.password) {
      toast.error('La contraseña es requerida para nuevos empleados');
      return;
    }

    try {
      if (editingStaff) {
        const payload: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        };
        if (formData.password) payload.password = formData.password;
        
        await api.put(`/users/store/${editingStaff.id}`, payload);
        toast.success('Empleado actualizado con éxito');
      } else {
        await api.post('/users/store', formData);
        toast.success('Empleado creado con éxito');
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar empleado');
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
  if (store?.plan === 'FREE') {
    const upgradeUrl = `https://wa.me/573001234567?text=${encodeURIComponent(`Hola, deseo subir a Plan PRO para mi tienda "${store.name}" y habilitar el módulo de Personal.`)}`;
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center font-sans space-y-8">
        <div className="w-20 h-20 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <Lock size={36} />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black">Control de Personal bloqueado</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
            La gestión de empleados, meseros y cocineros es una funcionalidad exclusiva del **Plan Profesional (PRO)**.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-150/60 dark:border-gray-750 p-6 rounded-3xl text-left space-y-4 shadow-sm">
          <h4 className="font-extrabold text-sm flex items-center gap-1.5"><Sparkles size={16} className="text-purple-500" /> Beneficios del Plan PRO ($49,900/mes):</h4>
          <ul className="space-y-2.5 text-xs text-gray-650 dark:text-gray-400 font-semibold">
            <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Cuentas ilimitadas para Vendedores y Cocina.</li>
            <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Visualización de pedidos en modo Cocina / Preparación.</li>
            <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Estadísticas y gráficos de ventas interactivos.</li>
            <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Carga de catálogo de productos ilimitado.</li>
          </ul>
        </div>

        <a
          href={upgradeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl font-black text-sm hover:opacity-95 shadow-md transition"
        >
          <Send size={15} /> Solicitar Plan PRO vía WhatsApp
        </a>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'VENDEDOR': return 'Vendedor / POS';
      case 'COCINA': return 'Operario Cocina';
      case 'MERCHANT_STAFF': return 'Administrador de Local';
      default: return role;
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-black">Mi Personal</h1>
          <p className="text-sm text-gray-500">Gestiona las cuentas de acceso de tus empleados</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm shadow-md transition"
        >
          <Plus size={16} /> Registrar Empleado
        </button>
      </div>

      {/* Staff list */}
      <div className="bg-white dark:bg-gray-800/60 border border-gray-150/40 dark:border-gray-700/60 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 font-extrabold text-xs uppercase tracking-wider border-b border-gray-150 dark:border-gray-700">
              <th className="py-4 px-6">Nombre</th>
              <th className="py-4 px-6">Correo</th>
              <th className="py-4 px-6">Rol</th>
              <th className="py-4 px-6">Fecha Registro</th>
              <th className="py-4 px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150 dark:divide-gray-700/60 text-sm font-semibold">
            {staff.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition">
                <td className="py-4 px-6 flex items-center gap-2.5">
                  <div className="p-2 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 rounded-xl">
                    <UserCheck size={18} />
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">{user.name}</span>
                </td>
                <td className="py-4 px-6 text-gray-500">{user.email}</td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-750 text-gray-700 dark:text-gray-300">
                    <Briefcase size={12} /> {getRoleLabel(user.role)}
                  </span>
                </td>
                <td className="py-4 px-6 text-gray-450 text-xs">
                  {new Date(user.createdAt).toLocaleDateString('es-CO')}
                </td>
                <td className="py-4 px-6 text-right space-x-2">
                  <button
                    onClick={() => handleOpenEdit(user)}
                    className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-xl transition inline-flex"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition inline-flex"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}

            {staff.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400 font-medium">
                  No tienes empleados registrados en tu tienda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-extrabold text-lg">
                {editingStaff ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <XCircleIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: María Gómez"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  placeholder="Ej: maria@tienda.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Contraseña {editingStaff && '(Dejar en blanco para conservar)'}</label>
                <input
                  type="password"
                  required={!editingStaff}
                  placeholder={editingStaff ? 'Conservar actual' : 'Mínimo 6 caracteres'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-1">Rol de Acceso *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition"
                >
                  <option value="VENDEDOR">Vendedor / Cajero POS</option>
                  <option value="COCINA">Cocinero / Operario de Producción</option>
                  <option value="MERCHANT_STAFF">Administrador de Local</option>
                </select>
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
                  {editingStaff ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function XCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
