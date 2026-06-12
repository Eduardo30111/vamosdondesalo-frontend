'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Truck, Calendar, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, PackageOpen, MinusCircle, PlusCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  costPrice: number;
  salePrice: number;
}

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  products: Product[];
}

interface PayableProduct {
  productId: string;
  productName: string;
  costPrice: number;
  receivedQty: number;
  returnedQty: number;
  netQty: number;
  totalPayable: number;
}

interface PayableSummary {
  supplierId: string;
  totalPayable: number;
  products: PayableProduct[];
}

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [payables, setPayables] = useState<Record<string, PayableSummary>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Supplier Form modal state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierEditId, setSupplierEditId] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');

  // Stock Transaction Modal state
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState<'RECEIVE' | 'RETURN'>('RECEIVE');
  const [txProduct, setTxProduct] = useState<PayableProduct | null>(null);
  const [txQty, setTxQty] = useState('');
  const [txLoading, setTxLoading] = useState(false);

  // We keep date range state just in case, but calculation is based on lifetime totals
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (suppliers.length > 0) loadPayables();
  }, [suppliers, dateFrom, dateTo]);

  const loadSuppliers = async () => {
    try {
      const data = await api.get<Supplier[]>('/suppliers');
      setSuppliers(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando proveedores');
    } finally {
      setLoading(false);
    }
  };

  const loadPayables = async () => {
    const results: Record<string, PayableSummary> = {};
    for (const supplier of suppliers) {
      try {
        const data = await api.get<PayableSummary>(`/suppliers/${supplier.id}/payable?from=${dateFrom}&to=${dateTo}`);
        results[supplier.id] = data;
      } catch { /* ignore */ }
    }
    setPayables(results);
  };

  const totalPayable = Object.values(payables).reduce((sum, p) => sum + p.totalPayable, 0);

  const handleCreateOrUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return;

    try {
      const payload = { name: supplierName, phone: supplierPhone || undefined };
      if (supplierEditId) {
        await api.put(`/suppliers/${supplierEditId}`, payload);
        toast.success('Proveedor actualizado');
      } else {
        await api.post('/suppliers', payload);
        toast.success('Proveedor creado');
      }
      setShowSupplierModal(false);
      setSupplierName('');
      setSupplierPhone('');
      setSupplierEditId(null);
      loadSuppliers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar proveedor');
    }
  };

  const handleEditSupplier = (supplier: Supplier, e: React.MouseEvent) => {
    e.stopPropagation();
    setSupplierEditId(supplier.id);
    setSupplierName(supplier.name);
    setSupplierPhone(supplier.phone || '');
    setShowSupplierModal(true);
  };

  const handleDeleteSupplier = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Proveedor eliminado');
      loadSuppliers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar proveedor');
    }
  };

  const handleOpenTx = (product: PayableProduct, type: 'RECEIVE' | 'RETURN', e: React.MouseEvent) => {
    e.stopPropagation();
    setTxProduct(product);
    setTxType(type);
    setTxQty('');
    setShowTxModal(true);
  };

  const handleSaveTx = async () => {
    if (!txProduct || !txQty) return;
    const qtyNum = parseInt(txQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      toast.error('Cantidad inválida');
      return;
    }

    setTxLoading(true);
    try {
      const endpoint = txType === 'RECEIVE' ? 'receive-supplier' : 'return-supplier';
      await api.put(`/products/${txProduct.productId}/${endpoint}`, { qty: qtyNum });
      toast.success(txType === 'RECEIVE' ? 'Mercancía recibida registrada' : 'Devolución registrada');
      setShowTxModal(false);
      loadPayables();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error registrando transacción');
    } finally {
      setTxLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="text-salo-orange" />
          Proveedores
        </h1>
        <button
          onClick={() => {
            setSupplierEditId(null);
            setSupplierName('');
            setSupplierPhone('');
            setShowSupplierModal(true);
          }}
          className="px-4 py-2 bg-salo-orange text-white rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-primary-700 transition"
        >
          <Plus size={18} /> Nuevo Proveedor
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total a pagar (todos los proveedores)</p>
          <p className="text-3xl font-extrabold text-salo-orange">{formatCurrency(totalPayable)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {suppliers.map((supplier) => {
          const payable = payables[supplier.id];
          const isExpanded = expandedId === supplier.id;

          return (
            <div key={supplier.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-200">
              <div
                onClick={() => setExpandedId(isExpanded ? null : supplier.id)}
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-salo-orange">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{supplier.name}</h3>
                    {supplier.phone && <p className="text-sm text-gray-500 dark:text-gray-400">{supplier.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Por Pagar</p>
                    <p className="text-xl font-extrabold text-salo-orange">
                      {payable ? formatCurrency(payable.totalPayable) : '$0'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleEditSupplier(supplier, e)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteSupplier(supplier.id, e)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                    {isExpanded ? <ChevronUp size={20} className="text-gray-400 ml-2" /> : <ChevronDown size={20} className="text-gray-400 ml-2" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-5 bg-gray-50/50 dark:bg-gray-800/20">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 text-xs border-b border-gray-200 dark:border-gray-700 pb-2">
                          <th className="text-left pb-3 font-semibold">Producto</th>
                          <th className="text-right pb-3 font-semibold">Costo</th>
                          <th className="text-right pb-3 font-semibold">Recibidos</th>
                          <th className="text-right pb-3 font-semibold">Devueltos</th>
                          <th className="text-right pb-3 font-semibold">Por Pagar (Neto)</th>
                          <th className="text-right pb-3 font-semibold">Total Costo</th>
                          <th className="text-center pb-3 font-semibold w-36">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {payable && payable.products.map((p) => (
                          <tr key={p.productId} className="hover:bg-gray-100/30 dark:hover:bg-gray-700/10">
                            <td className="py-3 font-medium">{p.productName}</td>
                            <td className="py-3 text-right text-gray-500">{formatCurrency(p.costPrice)}</td>
                            <td className="py-3 text-right text-green-600 font-medium">{p.receivedQty}</td>
                            <td className="py-3 text-right text-red-500 font-medium">{p.returnedQty}</td>
                            <td className="py-3 text-right font-medium">{p.netQty}</td>
                            <td className="py-3 text-right font-bold text-salo-orange">{formatCurrency(p.totalPayable)}</td>
                            <td className="py-3 flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => handleOpenTx(p, 'RECEIVE', e)}
                                className="px-2.5 py-1 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 text-green-600 dark:text-green-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                              >
                                <PlusCircle size={12} /> Recibir
                              </button>
                              <button
                                onClick={(e) => handleOpenTx(p, 'RETURN', e)}
                                className="px-2.5 py-1 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-500 dark:text-red-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                              >
                                <MinusCircle size={12} /> Devolver
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(!payable || payable.products.length === 0) && (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-gray-400 text-sm">
                              <PackageOpen className="mx-auto mb-2 opacity-40" size={32} />
                              Sin productos registrados o entregados para este proveedor
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {suppliers.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400">
            <Truck className="mx-auto mb-3 opacity-30" size={48} />
            <p className="text-sm">No hay proveedores registrados aún.</p>
          </div>
        )}
      </div>

      {/* Supplier Create/Edit Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-hidden transition-all duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold">{supplierEditId ? 'Editar' : 'Nuevo'} Proveedor</h3>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdateSupplier} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Fritos la 12"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Teléfono</label>
                <input
                  type="text"
                  placeholder="Ej: 3001234567"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-salo-orange hover:bg-primary-700 text-white font-bold transition shadow-md"
              >
                {supplierEditId ? 'Actualizar' : 'Crear'} Proveedor
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Received / Return Qty Modal */}
      {showTxModal && txProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl overflow-hidden transition-all duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold">
                {txType === 'RECEIVE' ? 'Recibir Mercancía' : 'Devolución de Producto'}
              </h3>
              <button
                onClick={() => setShowTxModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400">Producto</p>
                <p className="font-bold">{txProduct.productName}</p>
                <p className="text-xs text-gray-500 mt-1">Costo Unitario: {formatCurrency(txProduct.costPrice)}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  Cantidad a {txType === 'RECEIVE' ? 'ingresar' : 'devolver'}
                </label>
                <input
                  type="number"
                  placeholder="Cantidad"
                  value={txQty}
                  onChange={(e) => setTxQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-orange-400 text-center text-lg font-bold"
                  min="1"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowTxModal(false)}
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveTx}
                  disabled={txLoading || !txQty}
                  className="flex-1 py-3 bg-salo-orange hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition shadow-md disabled:opacity-50"
                >
                  {txLoading ? 'Registrando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
