'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Truck, Calendar } from 'lucide-react';

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

interface PayableSummary {
  supplierId: string;
  totalPayable: number;
  products: Array<{
    productId: string;
    productName: string;
    costPrice: number;
    qtySold: number;
    totalPayable: number;
  }>;
}

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [payables, setPayables] = useState<Record<string, PayableSummary>>({});
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
          <Truck className="text-salo-orange" />
          Proveedores
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Calendar size={18} className="text-gray-400" />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        <span className="text-gray-400">a</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <p className="text-sm text-gray-500">Total a pagar (todos los proveedores)</p>
        <p className="text-2xl font-bold text-salo-orange">{formatCurrency(totalPayable)}</p>
      </div>

      <div className="space-y-4">
        {suppliers.map((supplier) => {
          const payable = payables[supplier.id];
          return (
            <div key={supplier.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold">{supplier.name}</h3>
                  {supplier.phone && <p className="text-sm text-gray-500">{supplier.phone}</p>}
                </div>
                <span className="text-xl font-bold text-salo-orange">
                  {payable ? formatCurrency(payable.totalPayable) : '$0'}
                </span>
              </div>

              {payable && payable.products.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs">
                        <th className="text-left pb-2">Producto</th>
                        <th className="text-right pb-2">Costo</th>
                        <th className="text-right pb-2">Vendidos</th>
                        <th className="text-right pb-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payable.products.map((p) => (
                        <tr key={p.productId}>
                          <td className="py-1">{p.productName}</td>
                          <td className="py-1 text-right text-gray-500">{formatCurrency(p.costPrice)}</td>
                          <td className="py-1 text-right">{p.qtySold}</td>
                          <td className="py-1 text-right font-medium">{formatCurrency(p.totalPayable)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
