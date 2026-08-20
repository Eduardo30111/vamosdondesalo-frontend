'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { getSocket, joinRoom } from '@/lib/socket';
import { formatCurrency, toLocalDateInputValue } from '@/lib/utils';
import { toast } from 'sonner';
import { getOfflineQueue, saveOfflineQueue, removeFromOfflineQueue, syncOfflineQueue, OfflineQueueItem } from '@/lib/offline-queue';
import {
  DollarSign,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  X,
  Plus,
  Minus,
  Search,
  UtensilsCrossed,
  ChefHat,
  Smartphone,
  Banknote,
  User,
} from 'lucide-react';

interface OrderItem {
  id: string;
  qty: number;
  unitPrice: number;
  isPrep?: boolean;
  product: { id: string; name: string; preparationMode?: string };
}

interface Order {
  id: string;
  customerName: string;
  customerDoc?: string;
  customerPhone?: string;
  status: string;
  type: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
  table?: { number: number };
  paymentStatus?: string;
  payments?: Array<{ method: string; amount: number }>;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  salePrice: number;
  type: string;
  preparationMode: string;
  vitrinaStock: { qty: number } | null;
}

const getOrderTotalLocal = (item: OfflineQueueItem) => {
  if (typeof window === 'undefined') return 0;
  const cachedProducts = JSON.parse(localStorage.getItem('salo_cached_products') || '[]');
  return (item?.orderData?.items || []).reduce((sum: number, it: any) => {
    const product = cachedProducts.find((p: any) => p.id === it.productId);
    return sum + (product?.salePrice || 0) * it.qty;
  }, 0);
};

const queueItemToOrder = (item: OfflineQueueItem): Order => {
  if (typeof window === 'undefined') {
    return {
      id: item?.id || '',
      customerName: item?.orderData?.customerName || 'Cliente',
      status: 'PENDIENTE',
      type: item?.orderData?.type || 'TAKEAWAY',
      total: 0,
      createdAt: item?.createdAt || new Date().toISOString(),
      items: [],
    };
  }
  const cachedProducts = JSON.parse(localStorage.getItem('salo_cached_products') || '[]');
  const cachedTables = JSON.parse(localStorage.getItem('salo_cached_tables') || '[]');
  
  const items: OrderItem[] = (item?.orderData?.items || []).map((i, index) => {
    const product = cachedProducts.find((p: any) => p.id === i.productId);
    return {
      id: `${item.id}-item-${index}`,
      qty: i.qty,
      unitPrice: product?.salePrice || 0,
      product: {
        id: i.productId,
        name: product?.name || 'Producto Desconocido',
        preparationMode: product?.preparationMode || 'PREPARADO',
      }
    };
  });

  const total = items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
  const tableObj = cachedTables.find((t: any) => t.id === item?.orderData?.tableId);

  return {
    id: item?.id || '',
    customerName: item?.orderData?.customerName || 'Cliente',
    status: 'PENDIENTE',
    type: item?.orderData?.type || 'TAKEAWAY',
    total: total,
    createdAt: item?.createdAt || new Date().toISOString(),
    items: items,
    table: tableObj ? { number: tableObj.number } : undefined
  };
};

const minutosDesde = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
};

const getOrderPaymentMethodsText = (order: Order) => {
  if (order.paymentStatus === 'FIADO') {
    return 'Fiado';
  }
  
  if (order.payments && order.payments.length > 0) {
    const methods = order.payments.map((p: any) => {
      if (p.method === 'CASH') return 'Efectivo';
      if (p.method === 'NEQUI') return 'Nequi';
      return p.method;
    });
    const uniqueMethods = Array.from(new Set(methods));
    return uniqueMethods.join(', ');
  }
  
  return 'Pendiente';
};

export default function VitrinaPage() {
  const router = useRouter();
  const { user, hydrate } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Fiar modal
  const [showFiarModal, setShowFiarModal] = useState(false);
  const [fiarOrderId, setFiarOrderId] = useState<string | null>(null);
  const [fiarTotal, setFiarTotal] = useState(0);
  const [cedula, setCedula] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Edit (add items) modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [editSearch, setEditSearch] = useState('');
  const [newItems, setNewItems] = useState<{ product: Product; qty: number }[]>([]);
  const [addingItems, setAddingItems] = useState(false);

  // Nequi payment modal
  const [showNequiModal, setShowNequiModal] = useState(false);
  const [nequiOrderId, setNequiOrderId] = useState<string | null>(null);
  const [nequiOrderTotal, setNequiOrderTotal] = useState(0);
  const [nequiAmount, setNequiAmount] = useState('');
  const [nequiPayingTotal, setNequiPayingTotal] = useState(false);
  const [processingNequi, setProcessingNequi] = useState(false);

  // Cash payment modal
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashOrderId, setCashOrderId] = useState<string | null>(null);
  const [cashOrderTotal, setCashOrderTotal] = useState(0);
  const [receivedCashAmount, setReceivedCashAmount] = useState('');
  const [processingCash, setProcessingCash] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // Pago incompleto (fiar el resto) states
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [partialCedula, setPartialCedula] = useState('');
  const [partialCustomer, setPartialCustomer] = useState<any>(null);
  const [partialNewName, setPartialNewName] = useState('');
  const [partialNewPhone, setPartialNewPhone] = useState('');

  // Abono modal
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [abonoCustomer, setAbonoCustomer] = useState<any>(null);
  const [abonoAmount, setAbonoAmount] = useState('');
  const [abonoMethod, setAbonoMethod] = useState<'Efectivo' | 'Transferencia'>('Efectivo');
  const [processingAbono, setProcessingAbono] = useState(false);

  // Ventas del día (sales history table)
  const [salesDate, setSalesDate] = useState(toLocalDateInputValue(new Date()));
  const [dailySales, setDailySales] = useState<Order[]>([]);
  const [expandedSales, setExpandedSales] = useState<Record<string, boolean>>({});
  const [salesLoading, setSalesLoading] = useState(false);

  // Corregir Venta (Edit Sale Modal)
  const [showEditSaleModal, setShowEditSaleModal] = useState(false);
  const [editSaleOrder, setEditSaleOrder] = useState<Order | null>(null);
  const [editSaleTotal, setEditSaleTotal] = useState<string>('');
  const [editSaleMethod, setEditSaleMethod] = useState<'CASH' | 'NEQUI' | 'FIADO'>('CASH');
  const [editSaleCustomerId, setEditSaleCustomerId] = useState<string | null>(null);
  const [editSaleCustomerDoc, setEditSaleCustomerDoc] = useState('');
  const [editSaleCustomerName, setEditSaleCustomerName] = useState('');
  const [editSaleCustomerPhone, setEditSaleCustomerPhone] = useState('');
  const [processingEditSale, setProcessingEditSale] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'COCINA') {
      fetchOrders();
      fetchCustomers();
    }

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        handleSyncQueue();
      };
      
      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      const syncInterval = setInterval(async () => {
        if (navigator.onLine) {
          const queue = getOfflineQueue();
          if (queue.length > 0) {
            handleSyncQueue();
          }
        }
      }, 20000);

      const socket = getSocket();
      joinRoom('pos');

      const handleVitrinaUpdated = () => fetchOrders();
      const handleOrderStatusChanged = () => fetchOrders();

      socket.on('vitrina:updated', handleVitrinaUpdated);
      socket.on('order:status_changed', handleOrderStatusChanged);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(syncInterval);
        socket.off('vitrina:updated', handleVitrinaUpdated);
        socket.off('order:status_changed', handleOrderStatusChanged);
      };
    }
  }, [user]);

  const handleSyncQueue = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncOfflineQueue();
      if (result.success > 0) {
        toast.success(`${result.success} pedido(s) local(es) sincronizado(s) automáticamente`);
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let serverOrders: Order[] = [];
      if (navigator.onLine) {
        serverOrders = await api.get<Order[]>('/orders/cuentas-activas');
        localStorage.setItem('salo_cached_active_orders', JSON.stringify(serverOrders));
        fetchDailySales(salesDate);
      } else {
        const cached = localStorage.getItem('salo_cached_active_orders');
        serverOrders = cached ? JSON.parse(cached) : [];
      }
      
      const queue = getOfflineQueue();
      const offlineOrders = queue
        .filter((item) => item.type === 'STANDARD')
        .map(queueItemToOrder);

      setOrders([...offlineOrders, ...serverOrders]);
    } catch (e) {
      console.error(e);
      const cached = localStorage.getItem('salo_cached_active_orders');
      const serverOrders = cached ? JSON.parse(cached) : [];
      const queue = getOfflineQueue();
      const offlineOrders = queue
        .filter((item) => item.type === 'STANDARD')
        .map(queueItemToOrder);

      setOrders([...offlineOrders, ...serverOrders]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      if (navigator.onLine) {
        const data = await api.get<any[]>('/customers');
        setCustomers(data);
        localStorage.setItem('salo_cached_vitrina_customers', JSON.stringify(data));
      } else {
        const cached = localStorage.getItem('salo_cached_vitrina_customers');
        setCustomers(cached ? JSON.parse(cached) : []);
      }
    } catch (e) {
      console.error('Error fetching customers:', e);
    }
  };

  const fetchDailySales = async (date: string) => {
    try {
      setSalesLoading(true);
      if (navigator.onLine) {
        const data = await api.get<Order[]>(`/orders/by-date?date=${date}`);
        setDailySales(data);
      }
    } catch (e) {
      console.error('Error fetching daily sales:', e);
    } finally {
      setSalesLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'COCINA' && salesDate) {
      fetchDailySales(salesDate);
    }
  }, [salesDate, user]);

  const handleRemoveItem = async (orderId: string, itemId: string) => {
    if (!navigator.onLine) {
      toast.error('Debes estar conectado a internet para editar cuentas activas');
      return;
    }
    if (!confirm('¿Eliminar este ítem del pedido? El stock se devolverá.')) return;
    try {
      await api.put(`/orders/${orderId}/remove-item/${itemId}`);
      toast.success('Ítem eliminado y total recalculado');
      fetchOrders();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar ítem');
    }
  };

  const handleEditItemPrice = async (orderId: string, itemId: string, currentPrice: number) => {
    if (!navigator.onLine) {
      toast.error('Debes estar conectado a internet para editar cuentas activas');
      return;
    }
    const newPrice = prompt('Ingresa el nuevo precio para este ítem:', currentPrice.toString());
    if (newPrice === null || isNaN(Number(newPrice))) return;
    try {
      await api.put(`/orders/${orderId}/edit-item/${itemId}`, { unitPrice: Number(newPrice) });
      toast.success('Precio actualizado');
      fetchOrders();
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar precio');
    }
  };

  // ─── Cobrar en efectivo ───────────────────
  const abrirCash = (id: string, total: number) => {
    setCashOrderId(id);
    setCashOrderTotal(total);
    setReceivedCashAmount('');
    setIsPartialPayment(false);
    setPartialCedula('');
    setPartialCustomer(null);
    setPartialNewName('');
    setPartialNewPhone('');
    setShowCashModal(true);
  };

  const confirmarPagar = async () => {
    if (!cashOrderId) return;
    setProcessingCash(true);
    
    const id = cashOrderId;
    if (id && id.startsWith && id.startsWith('local-')) {
      const queue = getOfflineQueue();
      const itemIndex = queue.findIndex((it) => it.id === id);
      if (itemIndex > -1) {
        queue[itemIndex].type = 'PAID';
        queue[itemIndex].paymentData = {
          method: 'CASH',
          amount: getOrderTotalLocal(queue[itemIndex]),
        };
        saveOfflineQueue(queue);
        toast.success('Pago en efectivo registrado localmente. Se sincronizará al recuperar conexión.');
        setShowCashModal(false);
        fetchOrders();
      }
      setProcessingCash(false);
      return;
    }

    try {
      const order = orders.find((o) => o.id === id);
      const orderTotal = order ? order.total : cashOrderTotal;
      const paidAmount = parseFloat(receivedCashAmount) || 0;

      if (isPartialPayment) {
        let customerId = partialCustomer?.id;
        if (!customerId) {
          if (!partialNewName.trim() || partialCedula.length < 5) {
            alert('Ingresa nombre y cédula del cliente');
            setProcessingCash(false);
            return;
          }
          const data = await api.post<any>('/customers', {
            name: partialNewName,
            cedula: partialCedula,
            phone: partialNewPhone || undefined,
          });
          customerId = data.id;
        }

        const remainder = Math.max(0, orderTotal - paidAmount);

        // 1. Register the partial payment in Cash
        await api.post('/payments', { orderId: id, method: 'CASH', amount: paidAmount });
        
        // 2. Charge the remainder to the customer's debt
        await api.post(`/customers/${customerId}/charge`, { amount: remainder });

        // 3. Mark the order as FIADO and link the customer
        await api.put(`/orders/${id}/fiar`, { customerId });

        toast.success('Pago parcial registrado y saldo restante fiado');
        setShowCashModal(false);
        fetchOrders();
        fetchCustomers();
      } else {
        await api.post('/payments', { orderId: id, method: 'CASH', amount: orderTotal });
        toast.success('Pago en efectivo registrado');
        setShowCashModal(false);
        fetchOrders();
      }
    } catch (e: any) {
      console.error(e);
      alert('Error al procesar el pago: ' + (e.message || ''));
    } finally {
      setProcessingCash(false);
    }
  };

  // ─── Cancelar pedido ─────────────────────
  const cancelar = async (id: string) => {
    if (!confirm('¿Cancelar este pedido? El stock de vitrina se devolverá.')) return;
    
    if (id && id.startsWith && id.startsWith('local-')) {
      const queue = getOfflineQueue();
      const item = queue.find((it) => it.id === id);
      if (item) {
        // Restore stock
        const cachedProducts = JSON.parse(localStorage.getItem('salo_cached_products') || '[]');
        (item?.orderData?.items || []).forEach((it: any) => {
          const product = cachedProducts.find((p: any) => p.id === it.productId);
          if (product && product.preparationMode === 'VITRINA') {
            if (!product.vitrinaStock) product.vitrinaStock = { qty: 0 };
            product.vitrinaStock.qty += it.qty;
          }
        });
        localStorage.setItem('salo_cached_products', JSON.stringify(cachedProducts));
        
        removeFromOfflineQueue(id);
        toast.success('Pedido local cancelado y stock de vitrina restaurado.');
        fetchOrders();
      }
      return;
    }

    await api.put(`/orders/${id}/cancelar`);
    fetchOrders();
  };

  // ─── Fiar modal ───────────────────────────
  const abrirFiar = (orderId: string, total: number) => {
    setFiarOrderId(orderId);
    setFiarTotal(total);
    setShowFiarModal(true);
    setCedula('');
    setFoundCustomer(null);
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  const buscarCedula = async () => {
    if (!cedula.trim()) return;
    try {
      if (navigator.onLine) {
        const data = await api.get<any>(`/customers/cedula/${cedula}`);
        setFoundCustomer(data);
      } else {
        setFoundCustomer(null);
      }
    } catch {
      setFoundCustomer(null);
    }
  };

  const buscarPartialCedula = async () => {
    if (!partialCedula.trim()) return;
    try {
      if (navigator.onLine) {
        const data = await api.get<any>(`/customers/cedula/${partialCedula}`);
        setPartialCustomer(data);
      } else {
        setPartialCustomer(null);
      }
    } catch {
      setPartialCustomer(null);
    }
  };

  const fiar = async () => {
    if (!fiarOrderId) return;
    
    if (fiarOrderId && fiarOrderId.startsWith && fiarOrderId.startsWith('local-')) {
      const queue = getOfflineQueue();
      const itemIndex = queue.findIndex((it) => it.id === fiarOrderId);
      if (itemIndex > -1) {
        queue[itemIndex].type = 'FIADO';
        queue[itemIndex].customerData = {
          cedula,
          name: newCustomerName || foundCustomer?.name || 'Cliente Fiado',
          phone: newCustomerPhone || foundCustomer?.phone || undefined,
        };
        saveOfflineQueue(queue);
        setShowFiarModal(false);
        toast.success('Fiado registrado localmente. Se sincronizará al recuperar conexión.');
        fetchOrders();
      }
      return;
    }

    try {
      let customerId = foundCustomer?.id;
      if (!customerId) {
        if (!newCustomerName.trim() || cedula.length < 5) {
          alert('Ingresa nombre y cedula');
          return;
        }
        const data = await api.post<any>('/customers', { name: newCustomerName, cedula, phone: newCustomerPhone });
        customerId = data.id;
      }
      await api.post(`/customers/${customerId}/charge`, { amount: fiarTotal });
      await api.put(`/orders/${fiarOrderId}/fiar`, { customerId });
      setShowFiarModal(false);
      fetchOrders();
    } catch (e) {
      console.error(e);
      alert('Error al registrar el fiado');
    }
  };

  // ─── Corregir Venta Modal (Admin Edit Sale) ──────
  const abrirCorregirVenta = (sale: Order) => {
    setEditSaleOrder(sale);
    setEditSaleTotal(sale.total.toString());
    
    let currentMethod: 'CASH' | 'NEQUI' | 'FIADO' = 'CASH';
    if (sale.paymentStatus === 'FIADO') currentMethod = 'FIADO';
    else if (sale.payments && sale.payments.some(p => p.method === 'NEQUI')) currentMethod = 'NEQUI';
    
    setEditSaleMethod(currentMethod);
    setEditSaleCustomerId(null);
    setEditSaleCustomerDoc(sale.customerDoc || '');
    setEditSaleCustomerName(sale.customerName || '');
    setEditSaleCustomerPhone(sale.customerPhone || '');
    setShowEditSaleModal(true);
  };

  const handleCorregirVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSaleOrder) return;
    
    const numTotal = parseFloat(editSaleTotal);
    if (isNaN(numTotal) || numTotal < 0) {
      toast.error('El total ingresado no es válido');
      return;
    }

    if (editSaleMethod === 'FIADO') {
      if (!editSaleCustomerId && (!editSaleCustomerName || !editSaleCustomerDoc)) {
        toast.error('Debes seleccionar o ingresar un cliente para fiar');
        return;
      }
    }

    try {
      setProcessingEditSale(true);
      await api.put(`/orders/${editSaleOrder.id}/admin-edit-sale`, {
        total: numTotal,
        paymentMethod: editSaleMethod,
        customerId: editSaleCustomerId || undefined,
        customerName: editSaleCustomerName || undefined,
        customerPhone: editSaleCustomerPhone || undefined,
        customerDoc: editSaleCustomerDoc || undefined,
      });
      
      toast.success('Venta corregida exitosamente');
      setShowEditSaleModal(false);
      fetchOrders();
      fetchCustomers();
      if (salesDate) {
        // Refresh sales for the current date
        const data = await api.get<Order[]>(`/orders/by-date?date=${salesDate}`);
        setDailySales(data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al corregir venta');
    } finally {
      setProcessingEditSale(false);
    }
  };

  // ─── Edit (add items) modal ───────────────
  const abrirEditar = async (order: Order) => {
    setEditOrder(order);
    setNewItems([]);
    setEditSearch('');
    setShowEditModal(true);
    try {
      let prods: Product[] = [];
      if (navigator.onLine) {
        prods = await api.get<Product[]>('/products');
      } else {
        const cached = localStorage.getItem('salo_cached_products');
        prods = cached ? JSON.parse(cached) : [];
      }
      setProducts(prods);
    } catch {
      const cached = localStorage.getItem('salo_cached_products');
      setProducts(cached ? JSON.parse(cached) : []);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`¿Eliminar el producto "${product.name}" de forma permanente del catálogo?`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      toast.success('Producto eliminado con éxito');
      let prods: Product[] = [];
      if (navigator.onLine) {
        prods = await api.get<Product[]>('/products');
      } else {
        const cached = localStorage.getItem('salo_cached_products');
        prods = cached ? JSON.parse(cached) : [];
      }
      setProducts(prods);
    } catch (err: any) {
      toast.error(err.message || 'Error eliminando el producto');
    }
  };

  const addNewItem = (product: Product) => {
    setNewItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateNewItemQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setNewItems((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setNewItems((prev) => prev.map((i) => i.product.id === productId ? { ...i, qty } : i));
    }
  };

  const confirmarAgregarItems = async () => {
    if (!editOrder || newItems.length === 0) return;
    
    if (editOrder.id && editOrder.id.startsWith && editOrder.id.startsWith('local-')) {
      const queue = getOfflineQueue();
      const itemIndex = queue.findIndex((it) => it.id === editOrder.id);
      if (itemIndex > -1) {
        newItems.forEach((newItem) => {
          const existing = queue[itemIndex].orderData.items.find((i) => i.productId === newItem.product.id);
          if (existing) {
            existing.qty += newItem.qty;
          } else {
            queue[itemIndex].orderData.items.push({
              productId: newItem.product.id,
              qty: newItem.qty,
            });
          }
          
          // Deduct local stock for added items
          const cachedProducts = JSON.parse(localStorage.getItem('salo_cached_products') || '[]');
          const product = cachedProducts.find((p: any) => p.id === newItem.product.id);
          if (product && product.preparationMode === 'VITRINA') {
            if (!product.vitrinaStock) product.vitrinaStock = { qty: 0 };
            product.vitrinaStock.qty = Math.max(0, product.vitrinaStock.qty - newItem.qty);
            localStorage.setItem('salo_cached_products', JSON.stringify(cachedProducts));
          }
        });
        
        saveOfflineQueue(queue);
        setShowEditModal(false);
        setEditOrder(null);
        setNewItems([]);
        toast.success('Productos agregados al pedido local.');
        fetchOrders();
      }
      return;
    }

    setAddingItems(true);
    try {
      await api.put(`/orders/${editOrder.id}/add-items`, {
        items: newItems.map((i) => ({ productId: i.product.id, qty: i.qty })),
      });
      setShowEditModal(false);
      setEditOrder(null);
      setNewItems([]);
      fetchOrders();
    } catch (e) {
      console.error(e);
      alert('Error al agregar items');
    } finally {
      setAddingItems(false);
    }
  };

  const newItemsTotal = newItems.reduce((sum, i) => sum + i.product.salePrice * i.qty, 0);
  const hasPrepItems = newItems.some((i) => i.product.preparationMode === 'PREPARADO');

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(editSearch.toLowerCase())
  );

  // ─── Nequi payment modal ──────────────────
  const abrirNequi = (orderId: string, total: number) => {
    setNequiOrderId(orderId);
    setNequiOrderTotal(total);
    setNequiAmount(total.toString());
    setNequiPayingTotal(true);
    setIsPartialPayment(false);
    setPartialCedula('');
    setPartialCustomer(null);
    setPartialNewName('');
    setPartialNewPhone('');
    setShowNequiModal(true);
  };

  const nequiAmountNum = parseFloat(nequiAmount) || 0;
  const cashAmount = Math.max(0, nequiOrderTotal - nequiAmountNum);

  const paidCashAmount = parseFloat(receivedCashAmount) || 0;
  const isCashButtonDisabled = processingCash || (
    isPartialPayment ? (
      !isOnline ||
      paidCashAmount <= 0 ||
      paidCashAmount >= cashOrderTotal ||
      (!partialCustomer && (!partialNewName.trim() || partialCedula.length < 5))
    ) : (
      !receivedCashAmount ||
      paidCashAmount < cashOrderTotal
    )
  );

  const isNequiButtonDisabled = processingNequi || (
    isPartialPayment ? (
      !isOnline ||
      nequiAmountNum <= 0 ||
      nequiAmountNum >= nequiOrderTotal ||
      (!partialCustomer && (!partialNewName.trim() || partialCedula.length < 5))
    ) : (
      nequiAmountNum <= 0 ||
      nequiAmountNum > nequiOrderTotal
    )
  );

  const confirmarNequi = async () => {
    if (!nequiOrderId || nequiAmountNum <= 0) return;
    
    if (nequiOrderId && nequiOrderId.startsWith && nequiOrderId.startsWith('local-')) {
      const queue = getOfflineQueue();
      const itemIndex = queue.findIndex((it) => it.id === nequiOrderId);
      if (itemIndex > -1) {
        queue[itemIndex].type = 'PAID';
        queue[itemIndex].paymentData = {
          method: 'NEQUI',
          amount: nequiOrderTotal,
        };
        saveOfflineQueue(queue);
        setShowNequiModal(false);
        toast.success('Pago con Nequi registrado localmente. Se sincronizará al recuperar conexión.');
        fetchOrders();
      }
      return;
    }

    setProcessingNequi(true);
    try {
      if (isPartialPayment) {
        let customerId = partialCustomer?.id;
        if (!customerId) {
          if (!partialNewName.trim() || partialCedula.length < 5) {
            alert('Ingresa nombre y cédula del cliente');
            setProcessingNequi(false);
            return;
          }
          const data = await api.post<any>('/customers', {
            name: partialNewName,
            cedula: partialCedula,
            phone: partialNewPhone || undefined,
          });
          customerId = data.id;
        }

        const remainder = Math.max(0, nequiOrderTotal - nequiAmountNum);

        // 1. Register the partial payment in Nequi
        await api.post('/payments', {
          orderId: nequiOrderId,
          method: 'NEQUI',
          amount: nequiAmountNum,
        });

        // 2. Charge the remainder to the customer's debt
        await api.post(`/customers/${customerId}/charge`, { amount: remainder });

        // 3. Mark the order as FIADO and link the customer
        await api.put(`/orders/${nequiOrderId}/fiar`, { customerId });

        toast.success('Pago parcial registrado y saldo restante fiado');
        setShowNequiModal(false);
        fetchOrders();
        fetchCustomers();
      } else {
        // Register Nequi payment
        await api.post('/payments', {
          orderId: nequiOrderId,
          method: 'NEQUI',
          amount: nequiAmountNum,
        });

        // If there's a cash remainder, register cash payment too
        if (cashAmount > 0) {
          await api.post('/payments', {
            orderId: nequiOrderId,
            method: 'CASH',
            amount: cashAmount,
          });
        }

        toast.success('Pago registrado exitosamente');
        setShowNequiModal(false);
        fetchOrders();
      }
    } catch (e: any) {
      console.error(e);
      alert('Error al procesar el pago: ' + (e.message || ''));
    } finally {
      setProcessingNequi(false);
    }
  };

  if (!user) return <div className="p-8 text-center">Cargando...</div>;

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.cedula.includes(q);
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">Vitrina — Cuentas Activas</h1>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isOnline 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">Pedidos entregados esperando pago o fiado.</p>

      {/* ═══ Modal Fiar ═══ */}
      {showFiarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowFiarModal(false)} className="absolute top-4 right-4 p-1"><X size={20} /></button>
            <h2 className="text-lg font-bold mb-4">Fiar pedido — {formatCurrency(fiarTotal)}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Buscar o seleccionar cliente existente</label>
                <select
                  value={foundCustomer ? foundCustomer.id : ''}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (selectedId === '') {
                      setFoundCustomer(null);
                      setCedula('');
                      setNewCustomerName('');
                    } else {
                      const cust = customers.find((c) => c.id === selectedId);
                      if (cust) {
                        setFoundCustomer(cust);
                        setCedula(cust.cedula);
                      }
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-orange-500 transition"
                >
                  <option value="">-- Crear cliente nuevo --</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (C.C. {c.cedula})
                    </option>
                  ))}
                </select>
              </div>

              {!foundCustomer && (
                <>
                  <input
                    type="text"
                    placeholder="Cédula del cliente *"
                    required
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    onBlur={buscarCedula}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Nombre del cliente (nuevo) *"
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono (opcional)"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
                  />
                  <p className="text-[10px] text-gray-400">Cliente nuevo — se creará automáticamente</p>
                </>
              )}

              {foundCustomer && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl text-sm">
                  <p className="font-bold">{foundCustomer.name}</p>
                  <p className="text-gray-500">Deuda actual: {formatCurrency(foundCustomer.totalDebt)}</p>
                </div>
              )}
              <button onClick={fiar} className="w-full py-3 bg-yellow-500 text-white rounded-xl font-bold hover:opacity-90 text-sm">Confirmar Fiado</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal Editar (agregar items) ═══ */}
      {showEditModal && editOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col relative">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 p-1"><X size={20} /></button>
              <h2 className="text-lg font-bold">Agregar productos</h2>
              <p className="text-sm text-gray-500">{editOrder.customerName} — Pedido actual: {formatCurrency(editOrder.total)}</p>
            </div>

            {/* Search */}
            <div className="px-5 pt-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={editSearch}
                  onChange={(e) => setEditSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
                />
              </div>
            </div>

            {/* Products grid */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="grid grid-cols-2 gap-2">
                {filteredProducts.map((product) => {
                  const inCart = newItems.find((i) => i.product.id === product.id);
                  const isPrep = product.preparationMode === 'PREPARADO';
                   return (
                    <div
                      key={product.id}
                      onClick={() => addNewItem(product)}
                      className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-left hover:bg-orange-50 dark:hover:bg-orange-900/20 transition relative cursor-pointer"
                    >
                      {inCart && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-salo-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {inCart.qty}
                        </span>
                      )}
                      <p className="font-medium text-xs truncate pr-6">{product.name}</p>
                      <p className="text-salo-orange font-bold text-sm mt-0.5">{formatCurrency(product.salePrice)}</p>
                      <div className="flex justify-between items-end mt-1">
                        {isPrep ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 font-medium">
                            <ChefHat size={10} /> Preparado
                          </span>
                        ) : (
                          <span />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product);
                          }}
                          className="p-1.5 text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"
                          title="Eliminar producto"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* New items summary */}
            {newItems.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nuevos items</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {newItems.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(item.product.salePrice)} c/u</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); updateNewItemQty(item.product.id, item.qty - 1); }} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <Minus size={12} />
                        </button>
                        <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                        <button onClick={(e) => { e.stopPropagation(); updateNewItemQty(item.product.id, item.qty + 1); }} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {hasPrepItems && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2 text-xs text-blue-600">
                    <ChefHat size={14} />
                    <span>Los productos preparados pasarán por cocina</span>
                  </div>
                )}

                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-gray-500">Subtotal nuevos:</span>
                  <span className="font-bold text-salo-orange">{formatCurrency(newItemsTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Nuevo total:</span>
                  <span className="font-bold text-lg text-salo-orange">{formatCurrency(editOrder.total + newItemsTotal)}</span>
                </div>
              </div>
            )}

            {/* Confirm button */}
            <div className="p-5 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={confirmarAgregarItems}
                disabled={newItems.length === 0 || addingItems}
                className="w-full py-3 bg-salo-orange text-white rounded-xl font-bold text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addingItems ? 'Agregando...' : (
                  <>
                    <Plus size={16} />
                    Agregar {newItems.length} producto{newItems.length !== 1 ? 's' : ''} al pedido
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal Efectivo (Calculadora de Cambio) ═══ */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${isPartialPayment ? 'max-w-md' : 'max-w-sm'} p-6 relative transition-all duration-300 animate-in fade-in zoom-in`}>
            <button onClick={() => setShowCashModal(false)} className="absolute top-4 right-4 p-1"><X size={20} /></button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <Banknote size={20} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Pago en Efectivo</h2>
                <p className="text-sm text-gray-500">Total: {formatCurrency(cashOrderTotal)}</p>
              </div>
            </div>

            {/* Cash amount input */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 font-semibold block mb-1">Monto Recibido</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  type="number"
                  placeholder="¿Con cuánto paga el cliente?"
                  value={receivedCashAmount}
                  onChange={(e) => setReceivedCashAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-lg font-bold focus:ring-2 focus:ring-green-300 outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Pago Incompleto Checkbox */}
            <div className="mb-4">
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPartialPayment}
                  onChange={(e) => setIsPartialPayment(e.target.checked)}
                  className="w-4 h-4 accent-green-600 rounded"
                />
                <span className="text-sm font-medium">Pago incompleto (Fiar el resto)</span>
              </label>
            </div>

            {/* If Partial Payment is checked, show customer selection/registration */}
            {isPartialPayment && (
              <div className="mb-4 p-4 border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl space-y-3">
                {!isOnline && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl text-center">
                    <span className="text-xs font-bold text-red-500">
                      ⚠️ El pago incompleto (fiar) requiere conexión a internet.
                    </span>
                  </div>
                )}
                {isOnline && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Seleccionar Cliente
                      </label>
                      <select
                        value={partialCustomer ? partialCustomer.id : ''}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          if (selectedId === '') {
                            setPartialCustomer(null);
                            setPartialCedula('');
                            setPartialNewName('');
                            setPartialNewPhone('');
                          } else {
                            const cust = customers.find((c) => c.id === selectedId);
                            if (cust) {
                              setPartialCustomer(cust);
                              setPartialCedula(cust.cedula);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                      >
                        <option value="">-- Crear cliente nuevo --</option>
                        {customers.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (C.C. {c.cedula})
                          </option>
                        ))}
                      </select>
                    </div>

                    {!partialCustomer && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Cédula del cliente *"
                          required
                          value={partialCedula}
                          onChange={(e) => setPartialCedula(e.target.value)}
                          onBlur={buscarPartialCedula}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <input
                          type="text"
                          placeholder="Nombre del cliente *"
                          required
                          value={partialNewName}
                          onChange={(e) => setPartialNewName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <input
                          type="tel"
                          placeholder="Teléfono (opcional)"
                          value={partialNewPhone}
                          onChange={(e) => setPartialNewPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <p className="text-[10px] text-gray-400">Cliente nuevo — se creará automáticamente</p>
                      </div>
                    )}

                    {partialCustomer && (
                      <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg text-xs space-y-1">
                        <p><strong>Cliente:</strong> {partialCustomer.name}</p>
                        <p><strong>Deuda actual:</strong> {formatCurrency(partialCustomer.totalDebt)}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Change calculation / Error */}
            {parseFloat(receivedCashAmount) > 0 && (
              parseFloat(receivedCashAmount) < cashOrderTotal ? (
                isPartialPayment ? (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Restante a fiar:</span>
                    <span className="text-lg font-bold text-blue-700 dark:text-blue-400">
                      {formatCurrency(cashOrderTotal - (parseFloat(receivedCashAmount) || 0))}
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl text-center mb-4">
                    <span className="text-xs font-bold text-red-500">
                      El monto es menor al total a pagar
                    </span>
                  </div>
                )
              ) : (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-xl flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {isPartialPayment ? "Total cubierto (no se fiará nada):" : "Cambio a devolver:"}
                  </span>
                  <span className="text-lg font-bold text-green-700 dark:text-green-400">
                    {formatCurrency((parseFloat(receivedCashAmount) || 0) - cashOrderTotal)}
                  </span>
                </div>
              )
            )}

            {/* Confirm */}
            <button
              onClick={confirmarPagar}
              disabled={isCashButtonDisabled}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processingCash ? 'Procesando...' : (
                <>
                  <DollarSign size={16} />
                  Confirmar Pago
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Modal Nequi ═══ */}
      {showNequiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${isPartialPayment ? 'max-w-md' : 'max-w-sm'} p-6 relative transition-all duration-300`}>
            <button onClick={() => setShowNequiModal(false)} className="absolute top-4 right-4 p-1"><X size={20} /></button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Smartphone size={20} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Pago Nequi</h2>
                <p className="text-sm text-gray-500">Total: {formatCurrency(nequiOrderTotal)}</p>
              </div>
            </div>

            {/* Quick toggle: pay full amount */}
            {!isPartialPayment && (
              <div className="mb-4">
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nequiPayingTotal}
                    onChange={(e) => {
                      setNequiPayingTotal(e.target.checked);
                      if (e.target.checked) {
                        setNequiAmount(nequiOrderTotal.toString());
                      } else {
                        setNequiAmount('');
                      }
                    }}
                    className="w-4 h-4 accent-purple-600 rounded"
                  />
                  <span className="text-sm font-medium">Pagar todo por Nequi</span>
                </label>
              </div>
            )}

            {/* Nequi amount input */}
            <div className="mb-3">
              <label className="text-xs text-gray-500 font-medium block mb-1">Monto pagado por Nequi</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  type="number"
                  placeholder="0"
                  value={nequiAmount}
                  onChange={(e) => {
                    setNequiAmount(e.target.value);
                    const val = parseFloat(e.target.value) || 0;
                    setNequiPayingTotal(val >= nequiOrderTotal);
                  }}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-lg font-bold focus:ring-2 focus:ring-purple-300 outline-none"
                />
              </div>
            </div>

            {/* Pago Incompleto Checkbox */}
            <div className="mb-4">
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPartialPayment}
                  onChange={(e) => {
                    setIsPartialPayment(e.target.checked);
                    if (e.target.checked) {
                      setNequiPayingTotal(false);
                      if (parseFloat(nequiAmount) >= nequiOrderTotal) {
                        setNequiAmount('');
                      }
                    }
                  }}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
                <span className="text-sm font-medium">Pago incompleto (Fiar el resto)</span>
              </label>
            </div>

            {/* If Partial Payment is checked, show customer selection/registration */}
            {isPartialPayment && (
              <div className="mb-4 p-4 border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl space-y-3">
                {!isOnline && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl text-center">
                    <span className="text-xs font-bold text-red-500">
                      ⚠️ El pago incompleto (fiar) requiere conexión a internet.
                    </span>
                  </div>
                )}
                {isOnline && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Seleccionar Cliente
                      </label>
                      <select
                        value={partialCustomer ? partialCustomer.id : ''}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          if (selectedId === '') {
                            setPartialCustomer(null);
                            setPartialCedula('');
                            setPartialNewName('');
                            setPartialNewPhone('');
                          } else {
                            const cust = customers.find((c) => c.id === selectedId);
                            if (cust) {
                              setPartialCustomer(cust);
                              setPartialCedula(cust.cedula);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-purple-500 transition"
                      >
                        <option value="">-- Crear cliente nuevo --</option>
                        {customers.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (C.C. {c.cedula})
                          </option>
                        ))}
                      </select>
                    </div>

                    {!partialCustomer && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Cédula del cliente *"
                          required
                          value={partialCedula}
                          onChange={(e) => setPartialCedula(e.target.value)}
                          onBlur={buscarPartialCedula}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                          type="text"
                          placeholder="Nombre del cliente *"
                          required
                          value={partialNewName}
                          onChange={(e) => setPartialNewName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                          type="tel"
                          placeholder="Teléfono (opcional)"
                          value={partialNewPhone}
                          onChange={(e) => setPartialNewPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <p className="text-[10px] text-gray-400">Cliente nuevo — se creará automáticamente</p>
                      </div>
                    )}

                    {partialCustomer && (
                      <div className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg text-xs space-y-1">
                        <p><strong>Cliente:</strong> {partialCustomer.name}</p>
                        <p><strong>Deuda actual:</strong> {formatCurrency(partialCustomer.totalDebt)}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Remainder display */}
            {nequiOrderTotal - nequiAmountNum > 0 && !nequiPayingTotal && (
              isPartialPayment ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-between mb-4">
                  <span className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <User size={16} />
                    Restante a fiar
                  </span>
                  <span className="text-lg font-bold text-blue-600">{formatCurrency(nequiOrderTotal - nequiAmountNum)}</span>
                </div>
              ) : (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-between mb-4">
                  <span className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Banknote size={16} />
                    Restante en efectivo
                  </span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(cashAmount)}</span>
                </div>
              )
            )}

            {/* Summary */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl mb-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1"><Smartphone size={12} /> Nequi</span>
                <span className="font-bold text-purple-600">{formatCurrency(nequiAmountNum)}</span>
              </div>
              {nequiOrderTotal - nequiAmountNum > 0 && (
                isPartialPayment ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1"><User size={12} /> Fiado (Deuda)</span>
                    <span className="font-bold text-blue-600">{formatCurrency(nequiOrderTotal - nequiAmountNum)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1"><Banknote size={12} /> Efectivo</span>
                    <span className="font-bold text-green-600">{formatCurrency(cashAmount)}</span>
                  </div>
                )
              )}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-1 flex justify-between text-sm font-bold">
                <span>Total</span>
                <span className="text-salo-orange">{formatCurrency(nequiOrderTotal)}</span>
              </div>
            </div>

            {/* Confirm */}
            <button
              onClick={confirmarNequi}
              disabled={isNequiButtonDisabled}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processingNequi ? 'Procesando...' : (
                <>
                  <CreditCard size={16} />
                  Confirmar Pago
                </>
              )}
            </button>

            {nequiAmountNum > nequiOrderTotal && (
              <p className="text-xs text-red-500 mt-2 text-center">El monto Nequi no puede superar el total</p>
            )}
          </div>
        </div>
      )}

      {/* ═══ Modal Abono ═══ */}
      {showAbonoModal && abonoCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowAbonoModal(false)} className="absolute top-4 right-4 p-1"><X size={20} /></button>
            <h2 className="text-lg font-bold mb-2">Registrar Abono</h2>
            <p className="text-sm text-gray-500 mb-4">
              {abonoCustomer.name} — Deuda: <span className="font-bold text-red-500">{formatCurrency(abonoCustomer.totalDebt)}</span>
            </p>
            <div className="mb-3">
              <label className="text-xs text-gray-500 font-semibold block mb-1">Monto del abono</label>
              <input
                type="number"
                placeholder="Monto"
                value={abonoAmount}
                disabled={processingAbono}
                onChange={(e) => setAbonoAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 disabled:opacity-50"
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Método de pago</label>
              <div className="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAbonoMethod('Efectivo')}
                  disabled={processingAbono}
                  className={`flex-1 py-2 text-sm font-medium transition ${
                    abonoMethod === 'Efectivo'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-650'
                  } disabled:opacity-50`}
                >
                  Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setAbonoMethod('Transferencia')}
                  disabled={processingAbono}
                  className={`flex-1 py-2 text-sm font-medium transition ${
                    abonoMethod === 'Transferencia'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-650'
                  } disabled:opacity-50`}
                >
                  Transferencia
                </button>
              </div>
            </div>
            <button
              onClick={async () => {
                const amt = parseFloat(abonoAmount);
                if (!amt || amt <= 0) return;
                setProcessingAbono(true);
                try {
                  await api.post(`/customers/${abonoCustomer.id}/payment`, {
                    amount: amt,
                    note: 'Abono desde vitrina',
                    paymentMethod: abonoMethod,
                  });
                  toast.success('Abono registrado con éxito');
                  setShowAbonoModal(false);
                  setAbonoAmount('');
                  setAbonoMethod('Efectivo');
                  fetchCustomers();
                  fetchOrders();
                } catch (e: any) {
                  toast.error(e.message || 'Error al registrar abono');
                } finally {
                  setProcessingAbono(false);
                }
              }}
              disabled={processingAbono || !abonoAmount || parseFloat(abonoAmount) <= 0}
              className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processingAbono ? 'Registrando...' : 'Confirmar Abono'}
            </button>
          </div>
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cuentas Activas (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-extrabold flex items-center gap-2 mb-3">
            <Clock className="text-orange-500" size={20} /> Cuentas Activas
          </h2>
          {loading ? (
            <div className="text-center py-12">Cargando...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No hay cuentas activas.</div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const isExpanded = expanded === o.id;
                return (
                  <div key={o.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
                    {/* Fila principal */}
                    <div className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button onClick={() => setExpanded(isExpanded ? null : o.id)} className="p-1">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        <div>
                          <p className="font-bold flex items-center gap-1.5">
                            {o.customerName}
                            {o.id && o.id.startsWith && o.id.startsWith('local-') && (
                              <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">Local (Sin sincronizar)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {o.type === 'TABLE' ? (o.table?.number === 0 ? 'Recepción' : `Mesa ${o.table?.number || '?'}`) : o.type === 'TAKEAWAY' ? 'Para llevar' : 'Domicilio'}
                            {' · '}
                            <Clock size={12} className="inline" /> {minutosDesde(o.createdAt)} min
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-orange-500">{formatCurrency(o.total)}</span>
                        {o.status === 'READY' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">Listo</span>
                        )}
                        {o.status === 'DELIVERED' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Entregado</span>
                        )}
                      </div>
                    </div>

                    {/* Detalle expandido */}
                    {isExpanded && (
                      <div className="border-t dark:border-gray-700 px-4 pb-4">
                        <div className="py-3 space-y-2">
                          {o.items.map((item) => {
                            const canModify = o.id && !o.id.startsWith('local-');
                            return (
                              <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-750/30 p-2 rounded-xl">
                                <div className="flex-1">
                                  <span className="font-semibold">{item.qty}x</span> {item.product?.name || 'Producto'}
                                  <span className="block text-[11px] text-gray-500">{formatCurrency(item.unitPrice)} c/u</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(item.unitPrice * item.qty)}</span>
                                  {canModify && (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleEditItemPrice(o.id, item.id, item.unitPrice)}
                                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition"
                                        title="Editar precio"
                                      >
                                        <Edit3 size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleRemoveItem(o.id, item.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"
                                        title="Eliminar ítem"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <div className="border-t dark:border-gray-600 pt-2 flex justify-between font-bold">
                            <span>Total</span>
                            <span>{formatCurrency(o.total)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <button onClick={() => abrirCash(o.id, o.total)} className="flex-1 min-w-[100px] py-2 bg-green-500 text-white rounded-lg font-bold text-sm hover:opacity-90 flex items-center justify-center gap-1">
                            <DollarSign size={16} /> Efectivo
                          </button>
                          <button onClick={() => abrirNequi(o.id, o.total)} className="flex-1 min-w-[100px] py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:opacity-90 flex items-center justify-center gap-1">
                            <Smartphone size={16} /> Nequi
                          </button>
                          <button onClick={() => abrirFiar(o.id, o.total)} className="py-2 px-3 bg-yellow-500 text-white rounded-lg font-bold text-sm hover:opacity-90 flex items-center justify-center gap-1">
                            <CreditCard size={16} /> Fiado
                          </button>
                          <button onClick={() => abrirEditar(o)} className="py-2 px-3 bg-blue-500 text-white rounded-lg font-bold text-sm hover:opacity-90 flex items-center justify-center gap-1">
                            <Edit3 size={16} /> Editar
                          </button>
                          <button onClick={() => cancelar(o.id)} className="py-2 px-3 bg-red-500 text-white rounded-lg font-bold text-sm hover:opacity-90 flex items-center justify-center gap-1">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      {/* Right Column / Sidebar (1/3) */}
      <div className="space-y-6">
        {/* Directorio de Deudores */}
        <div className="space-y-4 bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-150/40 dark:border-gray-750/70 shadow-xs h-[fit-content]">
          <div>
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <DollarSign className="text-red-500" size={20} /> Clientes y Deudas
            </h2>
            <p className="text-xs text-gray-500">Consulta saldos y registra abonos en tiempo real</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-755 text-xs outline-none focus:ring-2 focus:ring-orange-500 transition"
            />
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {filteredCustomers.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No se encontraron clientes.</p>
            ) : (
              filteredCustomers.map((c: any) => (
                <div key={c.id} className="p-3 bg-gray-50 dark:bg-gray-750/30 rounded-2xl flex items-center justify-between border border-gray-100/50 dark:border-gray-700/50">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="font-extrabold text-xs text-gray-800 dark:text-gray-200 truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">C.C. {c.cedula} {c.phone ? `· Cel. ${c.phone}` : ''}</p>
                    {c.totalDebt > 0 ? (
                      <p className="text-xs font-black text-red-500 mt-1">Debe: {formatCurrency(c.totalDebt)}</p>
                    ) : (
                      <p className="text-xs text-green-500 mt-1">Sin deudas</p>
                    )}
                  </div>
                    {c.totalDebt > 0 && (
                      <button
                        onClick={() => {
                          setAbonoCustomer(c);
                          setAbonoAmount('');
                          setAbonoMethod('Efectivo');
                          setShowAbonoModal(true);
                        }}
                        className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-[10px] shadow-sm transition shrink-0"
                      >
                        Abonar
                      </button>
                    )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ventas del Día */}
        <div className="space-y-4 bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-150/40 dark:border-gray-750/70 shadow-xs h-[fit-content]">
          <div>
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <Banknote className="text-green-500" size={20} /> Ventas del Día
            </h2>
            <p className="text-xs text-gray-500">Historial de ventas finalizadas</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={salesDate}
              onChange={(e) => setSalesDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-755 text-xs outline-none focus:ring-2 focus:ring-green-500 transition"
            />
          </div>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {salesLoading ? (
              <p className="text-xs text-gray-400 text-center py-6">Cargando ventas...</p>
            ) : dailySales.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No hay ventas registradas para este día.</p>
            ) : (
              dailySales.map((sale) => {
                const isExpanded = !!expandedSales[sale.id];
                return (
                  <div key={sale.id} className="p-3 bg-gray-50 dark:bg-gray-750/30 rounded-2xl border border-gray-100/50 dark:border-gray-700/50">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-xs text-gray-800 dark:text-gray-200 truncate">{sale.customerName}</p>
                        <p className="text-[10px] text-gray-500 flex flex-wrap gap-1">
                          <span>
                            {sale.type === 'TABLE' ? (sale.table?.number === 0 ? 'Recepción' : `Mesa ${sale.table?.number || '?'}`) : sale.type === 'TAKEAWAY' ? 'Para llevar' : 'Domicilio'}
                          </span>
                          <span>·</span>
                          <span>
                            {new Date(sale.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </p>
                      </div>
                      <div className="text-right ml-2 shrink-0">
                        <p className="text-xs font-black text-green-600">{formatCurrency(sale.total)}</p>
                        <div className="flex items-center gap-2 mt-1 justify-end">
                          <button
                            onClick={() => abrirCorregirVenta(sale)}
                            className="text-[10px] text-blue-500 hover:text-blue-600 font-bold flex items-center gap-0.5"
                          >
                            <Edit3 size={10} /> Corregir
                          </button>
                          <button
                            onClick={() => setExpandedSales({ ...expandedSales, [sale.id]: !isExpanded })}
                            className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold flex items-center gap-0.5"
                          >
                            {isExpanded ? 'Ocultar' : 'Detalles'} {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-750/50 space-y-1 bg-gray-50/50 dark:bg-gray-800/50 p-2 rounded-xl">
                        <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                          <span>Método de pago:</span>
                          <span className={sale.paymentStatus === 'FIADO' ? 'text-yellow-600 font-extrabold' : 'text-green-600 font-extrabold'}>
                            {getOrderPaymentMethodsText(sale)}
                          </span>
                        </div>
                        <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-1"></div>
                        {sale.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-[11px] text-gray-550 dark:text-gray-400">
                            <span>{item.qty}x {item.product?.name}</span>
                            <span>{formatCurrency(item.unitPrice * item.qty)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      </div>

      {/* ═══ Modal Corregir Venta ═══ */}
      {showEditSaleModal && editSaleOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowEditSaleModal(false)} className="absolute top-4 right-4 p-1">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-4">Corregir Venta</h2>
            <p className="text-xs text-gray-500 mb-6">
              Esta acción modificará la venta finalizada. Se actualizarán los totales en caja y en caso de fiado, se ajustará la deuda del cliente.
            </p>

            <form onSubmit={handleCorregirVenta} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Total de la Venta ($)</label>
                <input
                  type="number"
                  value={editSaleTotal}
                  onChange={(e) => setEditSaleTotal(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Método de Pago</label>
                <select
                  value={editSaleMethod}
                  onChange={(e) => setEditSaleMethod(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="NEQUI">Nequi / Transferencia</option>
                  <option value="FIADO">Fiado</option>
                </select>
              </div>

              {editSaleMethod === 'FIADO' && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-2xl space-y-3">
                  <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-500">Asignar Fiado a Cliente</h3>
                  
                  {editSaleCustomerId ? (
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-yellow-200 dark:border-yellow-700">
                      <div>
                        <p className="text-sm font-bold">{editSaleCustomerName}</p>
                        <p className="text-xs text-gray-500">C.C. {editSaleCustomerDoc}</p>
                      </div>
                      <button type="button" onClick={() => setEditSaleCustomerId(null)} className="text-xs font-bold text-red-500">
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Cédula del Cliente</label>
                        <input
                          type="text"
                          value={editSaleCustomerDoc}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditSaleCustomerDoc(val);
                            const found = customers.find(c => c.cedula === val);
                            if (found) {
                              setEditSaleCustomerId(found.id);
                              setEditSaleCustomerName(found.name);
                              setEditSaleCustomerPhone(found.phone || '');
                            }
                          }}
                          placeholder="Ej. 1140888999"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-750 text-sm"
                        />
                      </div>
                      {!editSaleCustomerId && editSaleCustomerDoc.length >= 5 && (
                        <>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Nombre Completo</label>
                            <input
                              type="text"
                              value={editSaleCustomerName}
                              onChange={(e) => setEditSaleCustomerName(e.target.value)}
                              placeholder="Nombre del nuevo cliente"
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-750 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Celular (Opcional)</label>
                            <input
                              type="text"
                              value={editSaleCustomerPhone}
                              onChange={(e) => setEditSaleCustomerPhone(e.target.value)}
                              placeholder="Ej. 3001234567"
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-750 text-sm"
                            />
                          </div>
                          <p className="text-[10px] text-yellow-600 dark:text-yellow-400">Si el cliente no existe, se creará automáticamente.</p>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={processingEditSale}
                className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition disabled:opacity-50"
              >
                {processingEditSale ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
