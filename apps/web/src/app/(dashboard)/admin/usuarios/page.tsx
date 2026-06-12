'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Plus, Pencil, Trash2, X, Users } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  role: string;
}

const emptyForm: FormData = { name: '', email: '', password: '', role: 'VENDEDOR' };
const ROLE_LABELS: Record<string, string> = { ADMIN: 'Administrador', VENDEDOR: 'Vendedor', COCINA: 'Cocina' };

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const data = await api.get<User[]>('/users');
      setUsers(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        const payload: Partial<FormData> = { name: form.name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editId}`, payload);
        toast.success('Usuario actualizado');
      } else {
        await api.post('/users', form);
        toast.success('Usuario creado');
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleEdit = (u: User) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setEditId(u.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar usuario?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Usuario eliminado');
      loadUsers();
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
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="text-salo-orange" /> Usuarios</h1>
        <button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} className="px-4 py-2 bg-salo-orange text-white rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-primary-700 transition"><Plus size={18} /> Nuevo</button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Nombre</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Rol</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-salo-orange/10 text-salo-orange px-2 py-1 rounded-lg font-medium">{ROLE_LABELS[u.role]}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(u)} className="text-blue-500 hover:underline text-sm mr-3"><Pencil size={14} className="inline" /> Editar</button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:underline text-sm"><Trash2 size={14} className="inline" /> Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editId ? 'Editar' : 'Nuevo'} Usuario</h3>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" required />
              <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" required />
              <input type="password" placeholder={editId ? 'Nueva contraseña (opcional)' : 'Contraseña'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" {...(!editId && { required: true })} minLength={6} />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm">
                <option value="ADMIN">Administrador</option>
                <option value="VENDEDOR">Vendedor</option>
                <option value="COCINA">Cocina</option>
              </select>
              <button type="submit" className="w-full py-3 rounded-xl bg-salo-orange text-white font-semibold hover:bg-primary-700 transition">{editId ? 'Actualizar' : 'Crear'} Usuario</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
