'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCartStore } from '@/store/cart';
import { cn, formatCurrency } from '@/lib/utils';
import { getSocket, joinRoom } from '@/lib/socket';
import { getOfflineQueue, addToOfflineQueue, syncOfflineQueue, isNetworkError } from '@/lib/offline-queue';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  CreditCard,
  UtensilsCrossed,
  Bike,
  ShoppingBag,
  Factory,
} from 'lucide-react';


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

interface Table {
  id: string;
  number: number;
  qrToken: string;
}

interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
}

interface PaymentMethodConfig {
  method: string;
  qrUrl: string | null;
  key: string | null;
  enabled: boolean;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Delivery fields
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Credit (fiar) fields
  const [showFiar, setShowFiar] = useState(false);
  const [fiarCedula, setFiarCedula] = useState('');
  const [fiarName, setFiarName] = useState('');
  const [fiarPhone, setFiarPhone] = useState('');
  const [existingCustomer, setExistingCustomer] = useState<{ id: string; name: string } | null>(null);

  const cart = useCartStore();
  const [showProduction, setShowProduction] = useState(false);
  const [productionProduct, setProductionProduct] = useState<Product | null>(null);
  const [productionQty, setProductionQty] = useState('');
  const [productionLoading, setProductionLoading] = useState(false);

  // Offline states
  const [isOnline, setIsOnline] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const handleSyncQueue = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncOfflineQueue((msg) => {
        toast.info(msg);
      });
      if (result.success > 0) {
        toast.success(`${result.success} pedido(s) local(es) sincronizado(s) exitosamente`);
        loadData();
      } else if (result.failed > 0) {
        toast.error('Ocurrieron errores al sincronizar algunos pedidos locales');
      } else {
        toast.info('No hay pedidos locales pendientes por sincronizar');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setOfflineCount(getOfflineQueue().length);
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
    
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      setOfflineCount(getOfflineQueue().length);

      const handleOnline = () => {
        setIsOnline(true);
        syncOfflineQueue().then((result) => {
          if (result.success > 0) {
            toast.success(`${result.success} pedido(s) local(es) sincronizado(s) automáticamente`);
            setOfflineCount(getOfflineQueue().length);
            loadData();
          }
        });
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
            const result = await syncOfflineQueue();
            if (result.success > 0) {
              toast.success(`${result.success} pedido(s) local(es) sincronizado(s) automáticamente`);
              setOfflineCount(getOfflineQueue().length);
              loadData();
            }
          }
        }
      }, 20000);

      const socket = getSocket();
      joinRoom('pos');

      const handleOrderStatusChanged = () => {
        toast.info('Estado de pedido actualizado');
      };

      const handleVitrinaUpdated = () => {
        loadData();
      };

      socket.on('order:status_changed', handleOrderStatusChanged);
      socket.on('vitrina:updated', handleVitrinaUpdated);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(syncInterval);
        socket.off('order:status_changed', handleOrderStatusChanged);
        socket.off('vitrina:updated', handleVitrinaUpdated);
      };
    }
  }, []);

  const loadData = async () => {
    try {
      const [prods, tbls, methods, zones] = await Promise.all([
        api.get<Product[]>('/products'),
        api.get<Table[]>('/tables'),
        api.get<PaymentMethodConfig[]>('/payments/methods'),
        api.get<DeliveryZone[]>('/delivery-zones/enabled'),
      ]);
      
      localStorage.setItem('salo_cached_products', JSON.stringify(prods));
      localStorage.setItem('salo_cached_tables', JSON.stringify(tbls));
      localStorage.setItem('salo_cached_payment_methods', JSON.stringify(methods));
      localStorage.setItem('salo_cached_delivery_zones', JSON.stringify(zones));

      setProducts(prods);
      setTables(tbls);
      setPaymentMethods(methods.filter((m) => m.enabled));
      setDeliveryZones(zones);
    } catch (err: unknown) {
      const cachedProds = localStorage.getItem('salo_cached_products');
      const cachedTables = localStorage.getItem('salo_cached_tables');
      const cachedMethods = localStorage.getItem('salo_cached_payment_methods');
      const cachedZones = localStorage.getItem('salo_cached_delivery_zones');

      if (cachedProds && cachedTables && cachedMethods && cachedZones) {
        setProducts(JSON.parse(cachedProds));
        setTables(JSON.parse(cachedTables));
        setPaymentMethods(JSON.parse(cachedMethods).filter((m: any) => m.enabled));
        setDeliveryZones(JSON.parse(cachedZones));
        toast.warning('Sin conexión. Usando datos guardados localmente.');
      } else {
        toast.error('Error cargando datos y no hay copia local guardada.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getDeliveryFee = () => {
    if (cart.orderType !== 'DELIVERY' || !selectedZone) return 0;
    const zone = deliveryZones.find(z => z.id === selectedZone);
    return zone?.fee || 0;
  };

  const getTotal = () => cart.total() + getDeliveryFee();

  const handleCreateOrder = async (paymentMethodForOffline?: string): Promise<{ id: string; total: number } | null> => {
    if (cart.items.length === 0) {
      toast.error('Agrega productos al pedido');
      return null;
    }
    // Validar stock para productos de VITRINA
    for (const item of cart.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && prod.preparationMode === 'VITRINA') {
        const stock = prod.vitrinaStock?.qty ?? 0;
        if (item.qty > stock) {
          toast.error(`No hay suficiente stock de "${prod.name}" en la vitrina (Disponible: ${stock})`);
          return null;
        }
      }
    }
    if (!cart.customerName.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return null;
    }
    if (cart.orderType === 'TABLE' && !cart.tableId) {
      toast.error('Selecciona una mesa');
      return null;
    }
    if (cart.orderType === 'DELIVERY' && !selectedZone) {
      toast.error('Selecciona una zona de domicilio');
      return null;
    }

    const orderData = {
      type: cart.orderType,
      tableId: cart.tableId,
      customerName: cart.customerName,
      customerPhone: cart.orderType === 'DELIVERY' ? customerPhone : undefined,
      customerAddress: cart.orderType === 'DELIVERY' ? customerAddress : undefined,
      deliveryZoneId: cart.orderType === 'DELIVERY' ? selectedZone : undefined,
      notes: cart.notes,
      items: cart.items.map((i) => ({
        productId: i.productId,
        qty: i.qty,
        notes: i.notes || undefined,
      })),
    };

    if (!navigator.onLine) {
      const tempId = 'local-' + Date.now();
      const total = getTotal();
      if (paymentMethodForOffline) {
        addToOfflineQueue({
          type: 'PAID',
          orderData,
          paymentData: {
            method: paymentMethodForOffline,
            amount: total,
          },
        });
      } else {
        addToOfflineQueue({
          type: 'STANDARD',
          orderData,
        });
      }
      setOfflineCount(getOfflineQueue().length);
      toast.warning('Sin conexión. Pedido guardado localmente en cola.');
      setShowPayment(false);
      resetDeliveryFields();
      cart.clear();
      return { id: tempId, total };
    }

    try {
      const order = await api.post<{ id: string; total: number }>('/orders', orderData);
      toast.success('Pedido creado exitosamente!');
      setShowPayment(false);
      resetDeliveryFields();
      cart.clear();
      return order;
    } catch (err: unknown) {
      if (err instanceof Error && isNetworkError(err)) {
        const tempId = 'local-' + Date.now();
        const total = getTotal();
        if (paymentMethodForOffline) {
          addToOfflineQueue({
            type: 'PAID',
            orderData,
            paymentData: {
              method: paymentMethodForOffline,
              amount: total,
            },
          });
        } else {
          addToOfflineQueue({
            type: 'STANDARD',
            orderData,
          });
        }
        setOfflineCount(getOfflineQueue().length);
        toast.warning('Error de red. Pedido guardado localmente para reintentar.');
        setShowPayment(false);
        resetDeliveryFields();
        cart.clear();
        return { id: tempId, total };
      }
      toast.error(err instanceof Error ? err.message : 'Error creando pedido');
      return null;
    }
  };

  const handlePayAndCreate = async () => {
    if (!selectedMethod) {
      toast.error('Selecciona un método de pago');
      return;
    }
    const order = await handleCreateOrder(selectedMethod);
    if (order && !order.id.startsWith('local-')) {
      try {
        await api.post('/payments', {
          orderId: order.id,
          method: selectedMethod,
          amount: order.total,
        });
        toast.success('Pago registrado');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Error registrando pago');
      }
    }
  };

  const handleFiarLookup = async () => {
    if (!fiarCedula.trim()) {
      toast.error('Ingresa la cédula');
      return;
    }
    try {
      const customer = await api.get<{ id: string; name: string; cedula: string } | null>(`/customers/cedula/${fiarCedula}`);
      if (customer) {
        setExistingCustomer(customer);
        setFiarName(customer.name);
      } else {
        setExistingCustomer(null);
        setFiarName('');
      }
    } catch {
      setExistingCustomer(null);
      setFiarName('');
    }
  };

  const handleFiar = async () => {
    if (cart.items.length === 0) {
      toast.error('Agrega productos al pedido');
      return;
    }
    if (!fiarCedula.trim()) {
      toast.error('Ingresa la cédula del cliente');
      return;
    }
    if (!existingCustomer && !fiarName.trim()) {
      toast.error('Ingresa el nombre del cliente nuevo');
      return;
    }

    const orderData = {
      type: cart.orderType,
      tableId: cart.tableId,
      customerName: fiarName || existingCustomer?.name || 'Cliente de Fiado',
      customerPhone: cart.orderType === 'DELIVERY' ? customerPhone : undefined,
      customerAddress: cart.orderType === 'DELIVERY' ? customerAddress : undefined,
      deliveryZoneId: cart.orderType === 'DELIVERY' ? selectedZone : undefined,
      notes: cart.notes,
      items: cart.items.map((i) => ({
        productId: i.productId,
        qty: i.qty,
        notes: i.notes || undefined,
      })),
    };

    const customerData = {
      cedula: fiarCedula,
      name: fiarName || undefined,
      phone: fiarPhone || undefined,
    };

    if (!navigator.onLine) {
      addToOfflineQueue({
        type: 'FIADO',
        orderData,
        customerData,
      });
      setOfflineCount(getOfflineQueue().length);
      toast.warning('Sin conexión. Fiado guardado localmente en la cola.');
      setShowFiar(false);
      setFiarCedula('');
      setFiarName('');
      setFiarPhone('');
      setExistingCustomer(null);
      resetDeliveryFields();
      cart.clear();
      return;
    }

    try {
      // Create or find customer
      const customer = await api.post<{ id: string; name: string }>('/customers', {
        cedula: fiarCedula,
        name: fiarName || undefined,
        phone: fiarPhone || undefined,
      });

      // Create the order
      const order = await api.post<{ id: string; total: number }>('/orders', {
        ...orderData,
        customerName: customer.name,
      });

      // Charge the customer
      await api.post(`/customers/${customer.id}/charge`, {
        amount: getTotal(),
        orderId: order.id,
        note: `Pedido fiado`,
      });

      // Mark order as FIADO
      await api.put(`/orders/${order.id}/fiar`, { customerId: customer.id });

      toast.success(`Fiado registrado para ${customer.name}`);
      setShowFiar(false);
      setFiarCedula('');
      setFiarName('');
      setFiarPhone('');
      setExistingCustomer(null);
      resetDeliveryFields();
      cart.clear();
    } catch (err: unknown) {
      if (err instanceof Error && isNetworkError(err)) {
        addToOfflineQueue({
          type: 'FIADO',
          orderData,
          customerData,
        });
        setOfflineCount(getOfflineQueue().length);
        toast.warning('Error de red. Fiado guardado localmente para reintentar.');
        setShowFiar(false);
        setFiarCedula('');
        setFiarName('');
        setFiarPhone('');
        setExistingCustomer(null);
        resetDeliveryFields();
        cart.clear();
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Error registrando fiado');
    }
  };

  const resetDeliveryFields = () => {
    setSelectedZone('');
    setCustomerPhone('');
    setCustomerAddress('');
  };

  const handleCreateProduction = async () => {
    if (!productionProduct || !productionQty) {
      toast.error('Ingresa la cantidad a producir');
      return;
    }
    setProductionLoading(true);
    try {
      await api.post('/production-orders', {
        productId: productionProduct.id,
        requestedQty: parseInt(productionQty),
        userId: 'system', // backend puede ignorar o tomar del token
      });
      toast.success('Solicitud de producción enviada a cocina');
      setShowProduction(false);
      setProductionProduct(null);
      setProductionQty('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error enviando producción');
    } finally {
      setProductionLoading(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-salo-orange" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-3.5rem)] min-h-0 pb-16 lg:pb-0">
      {/* Products Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold">Punto de Venta</h1>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isOnline 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                {isOnline ? 'En línea' : 'Sin conexión'}
              </span>

              {offlineCount > 0 && (
                <button
                  onClick={handleSyncQueue}
                  disabled={syncing || !isOnline}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>🔄 {offlineCount} pendiente{offlineCount > 1 ? 's' : ''}</span>
                </button>
              )}
            </div>
          </div>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-salo-orange outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const remaining = product.vitrinaStock?.qty ?? 0;
              const isVitrina = product.preparationMode === 'VITRINA';
              return (
                <div
                  key={product.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all text-left flex flex-col"
                >
                  <button
                    onClick={() => {
                      const existing = cart.items.find((i) => i.productId === product.id);
                      const currentQty = existing ? existing.qty : 0;
                      if (isVitrina) {
                        if (currentQty + 1 > remaining) {
                          toast.error(`No hay suficiente stock de "${product.name}" en la vitrina (Disponible: ${remaining})`);
                          return;
                        }
                      }
                      cart.addItem({ productId: product.id, name: product.name, price: product.salePrice, photoUrl: product.photoUrl });
                    }}
                    className="flex-1 text-left"
                  >
                    <div className="aspect-square relative rounded-lg overflow-hidden mb-2 bg-gray-100 dark:bg-gray-700">
                      {product.photoUrl ? (
                        <img
                          src={product.photoUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UtensilsCrossed className="text-gray-400" size={32} />
                        </div>
                      )}
                      {isVitrina && (
                        <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          Stock: {remaining}
                        </div>
                      )}
                      {!isVitrina && (
                        <div className="absolute top-1 right-1 bg-blue-600/80 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          Preparado
                        </div>
                      )}
                    </div>
                    <p className="font-medium text-xs truncate">{product.name}</p>
                    <p className="text-salo-orange font-bold text-sm">{formatCurrency(product.salePrice)}</p>
                  </button>
                  {isVitrina && (
                    <button
                      onClick={() => {
                        setProductionProduct(product);
                        setShowProduction(true);
                      }}
                      className="mt-2 w-full py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-medium flex items-center justify-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                      <Factory size={12} />
                      Solicitar más
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart Panel wrapper for mobile drawer */}
      <div className={cn(
        "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:backdrop-blur-none lg:bg-transparent lg:relative lg:inset-auto lg:z-auto transition-all duration-300",
        showMobileCart ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto lg:flex"
      )}
      onClick={() => setShowMobileCart(false)}
      >
        <div 
          className={cn(
            "fixed bottom-0 left-0 right-0 top-12 lg:top-auto bg-white dark:bg-gray-800 rounded-t-3xl lg:rounded-2xl shadow-2xl lg:shadow-lg border-t lg:border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh] lg:max-h-[calc(100vh-3.5rem)] lg:w-96 transition-transform duration-300 transform lg:transform-none w-full",
            showMobileCart ? "translate-y-0" : "translate-y-full lg:translate-y-0"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold flex items-center gap-2">
                <ShoppingCart size={20} />
                Pedido ({cart.items.length})
              </h2>
              <div className="flex items-center gap-2">
                {cart.items.length > 0 && (
                  <button onClick={() => cart.clear()} className="text-red-500 text-xs hover:underline mr-2">
                    Limpiar
                  </button>
                )}
                <button onClick={() => setShowMobileCart(false)} className="lg:hidden p-1 text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Order Type */}
            <div className="flex gap-2 mb-3">
              {[
                { type: 'TABLE' as const, label: 'Mesa', icon: UtensilsCrossed },
                { type: 'TAKEAWAY' as const, label: 'Llevar', icon: ShoppingBag },
                { type: 'DELIVERY' as const, label: 'Domicilio', icon: Bike },
              ].map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => cart.setOrderType(type)}
                  className={cn(
                    'flex-1 py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition',
                    cart.orderType === type
                      ? 'bg-salo-orange text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  )}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* Table selector */}
            {cart.orderType === 'TABLE' && (
              <select
                value={cart.tableId || ''}
                onChange={(e) => cart.setTableId(e.target.value || null)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm mb-2"
              >
                <option value="">Seleccionar mesa...</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>Mesa {t.number}</option>
                ))}
              </select>
            )}

            {/* Delivery fields */}
            {cart.orderType === 'DELIVERY' && (
              <div className="space-y-2 mb-2">
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
                >
                  <option value="">Seleccionar zona...</option>
                  {deliveryZones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name} (+{formatCurrency(z.fee)})</option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="Teléfono cliente"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
                />
                <input
                  type="text"
                  placeholder="Dirección de entrega"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
                />
              </div>
            )}

            {/* Customer name */}
            <input
              type="text"
              placeholder="Nombre del cliente"
              value={cart.customerName}
              onChange={(e) => cart.setCustomerName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
            />
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.items.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Agrega productos al pedido</p>
              </div>
            ) : (
              cart.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.price)} c/u</p>
                    <input
                      type="text"
                      placeholder="Nota..."
                      value={item.notes}
                      onChange={(e) => cart.updateItemNotes(item.productId, e.target.value)}
                      className="mt-1 w-full px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => cart.updateQty(item.productId, item.qty - 1)}
                      className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                    <button
                      onClick={() => {
                        const prod = products.find((p) => p.id === item.productId);
                        if (prod && prod.preparationMode === 'VITRINA') {
                          const stock = prod.vitrinaStock?.qty ?? 0;
                          if (item.qty + 1 > stock) {
                            toast.error(`No hay suficiente stock de "${prod.name}" en la vitrina (Disponible: ${stock})`);
                            return;
                          }
                        }
                        cart.updateQty(item.productId, item.qty + 1);
                      }}
                      className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => cart.removeItem(item.productId)}
                      className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center ml-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            {getDeliveryFee() > 0 && (
              <div className="flex justify-between items-center mb-1 text-sm text-gray-500">
                <span>Domicilio:</span>
                <span>+{formatCurrency(getDeliveryFee())}</span>
              </div>
            )}
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium">Total:</span>
              <span className="text-xl font-bold text-salo-orange">{formatCurrency(getTotal())}</span>
            </div>

            <textarea
              placeholder="Notas generales del pedido..."
              value={cart.notes}
              onChange={(e) => cart.setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm mb-3 resize-none h-16"
            />

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleCreateOrder()}
                disabled={cart.items.length === 0}
                className="py-3 rounded-xl bg-salo-orange text-white font-semibold text-sm hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear
              </button>
              <button
                onClick={() => setShowPayment(true)}
                disabled={cart.items.length === 0}
                className="py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                <CreditCard size={14} />
                Cobrar
              </button>
              <button
                onClick={() => setShowFiar(true)}
                disabled={cart.items.length === 0}
                className="py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Cobrar Pedido</h3>
              <button onClick={() => setShowPayment(false)} className="p-1">
                <X size={20} />
              </button>
            </div>

            <p className="text-2xl font-bold text-salo-orange mb-4">{formatCurrency(getTotal())}</p>

            <div className="space-y-2 mb-4">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.method}
                  onClick={() => setSelectedMethod(pm.method)}
                  className={cn(
                    'w-full p-3 rounded-xl border-2 text-left transition flex items-center justify-between',
                    selectedMethod === pm.method
                      ? 'border-salo-orange bg-orange-50 dark:bg-orange-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  )}
                >
                  <span className="font-medium text-sm">{pm.method}</span>
                  {pm.key && <span className="text-xs text-gray-500">{pm.key}</span>}
                </button>
              ))}
            </div>

            {selectedMethod && selectedMethod !== 'CASH' && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-center">
                <p className="text-xs text-gray-500 mb-2">QR de pago</p>
                {paymentMethods.find((m) => m.method === selectedMethod)?.qrUrl && (
                  <img
                    src={paymentMethods.find((m) => m.method === selectedMethod)?.qrUrl || ''}
                    alt="QR"
                    className="w-48 h-48 mx-auto rounded-lg"
                  />
                )}
              </div>
            )}

            <button
              onClick={handlePayAndCreate}
              disabled={!selectedMethod}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              Confirmar Pago y Crear Pedido
            </button>
          </div>
        </div>
      )}

      {/* Fiar Modal */}
      {showFiar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Fiar Pedido</h3>
              <button onClick={() => { setShowFiar(false); setExistingCustomer(null); setFiarCedula(''); setFiarName(''); setFiarPhone(''); }} className="p-1">
                <X size={20} />
              </button>
            </div>

            <p className="text-2xl font-bold text-purple-600 mb-4">{formatCurrency(getTotal())}</p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cédula del cliente"
                  value={fiarCedula}
                  onChange={(e) => setFiarCedula(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                />
                <button
                  onClick={handleFiarLookup}
                  className="px-4 py-2.5 bg-gray-200 dark:bg-gray-600 rounded-xl text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                >
                  Buscar
                </button>
              </div>

              {existingCustomer && (
                <p className="text-sm text-green-600 font-medium">Cliente encontrado: {existingCustomer.name}</p>
              )}

              {!existingCustomer && fiarCedula && (
                <>
                  <input
                    type="text"
                    placeholder="Nombre del cliente (nuevo)"
                    value={fiarName}
                    onChange={(e) => setFiarName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono (opcional)"
                    value={fiarPhone}
                    onChange={(e) => setFiarPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                  />
                </>
              )}

              <button
                onClick={handleFiar}
                disabled={!fiarCedula || (!existingCustomer && !fiarName)}
                className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition disabled:opacity-50"
              >
                Confirmar Fiado
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Production Request Modal */}
      {showProduction && productionProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Solicitar Producción</h3>
              <button onClick={() => setShowProduction(false)} className="p-1">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{productionProduct.name}</p>
            <input
              type="number"
              placeholder="Cantidad a producir"
              value={productionQty}
              onChange={(e) => setProductionQty(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowProduction(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProduction}
                disabled={productionLoading || !productionQty}
                className="flex-1 py-2.5 rounded-xl bg-salo-orange text-white text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50"
              >
                {productionLoading ? 'Enviando...' : 'Enviar a Cocina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mobile Cart Bar */}
      {cart.items.length > 0 && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="lg:hidden fixed bottom-4 left-4 right-4 z-30 bg-salo-orange hover:bg-orange-600 text-white rounded-2xl shadow-lg px-6 py-4 flex items-center justify-between animate-in slide-in-from-bottom duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
              {cart.items.reduce((acc, item) => acc + item.qty, 0)}
            </div>
            <span className="font-semibold text-sm">Ver Pedido</span>
          </div>
          <span className="font-bold text-base">{formatCurrency(getTotal())}</span>
        </button>
      )}
    </div>
  );
}
