import { api } from './api';

export interface OfflineQueueItem {
  id: string; // temp local id
  type: 'STANDARD' | 'PAID' | 'FIADO';
  createdAt: string;
  orderData: {
    type: 'TABLE' | 'TAKEAWAY' | 'DELIVERY';
    tableId: string | null;
    customerName: string;
    customerPhone?: string;
    customerAddress?: string;
    deliveryZoneId?: string;
    notes?: string;
    items: Array<{
      productId: string;
      qty: number;
      notes?: string;
    }>;
  };
  paymentData?: {
    method: string;
    amount: number;
  };
  customerData?: {
    cedula: string;
    name?: string;
    phone?: string;
  };
}

const STORAGE_KEY = 'salo_offline_queue';

export function getOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineQueueItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'createdAt'>) {
  const queue = getOfflineQueue();
  const newItem: OfflineQueueItem = {
    ...item,
    id: 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
  };
  queue.push(newItem);
  saveOfflineQueue(queue);
  return newItem;
}

export function removeFromOfflineQueue(id: string) {
  const queue = getOfflineQueue();
  const filtered = queue.filter(item => item.id !== id);
  saveOfflineQueue(filtered);
}

export function isNetworkError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('load failed') ||
    message.includes('server error') ||
    message.includes('error 502') ||
    message.includes('error 503') ||
    message.includes('error 504')
  );
}

export async function syncOfflineQueue(onProgress?: (msg: string) => void): Promise<{ success: number; failed: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let successCount = 0;
  let failedCount = 0;
  
  // Clone to avoid mutation problems during iteration
  const itemsToSync = [...queue];

  for (const item of itemsToSync) {
    try {
      if (onProgress) onProgress(`Sincronizando pedido de ${item.orderData.customerName}...`);

      if (item.type === 'STANDARD') {
        await api.post('/orders', item.orderData);
      } else if (item.type === 'PAID') {
        const order = await api.post<{ id: string; total: number }>('/orders', item.orderData);
        if (item.paymentData) {
          await api.post('/payments', {
            orderId: order.id,
            method: item.paymentData.method,
            amount: order.total,
          });
        }
      } else if (item.type === 'FIADO') {
        if (!item.customerData) throw new Error('Datos del cliente faltantes para fiado');
        
        // 1. Crear o buscar cliente
        const customer = await api.post<{ id: string; name: string }>('/customers', {
          cedula: item.customerData.cedula,
          name: item.customerData.name,
          phone: item.customerData.phone,
        });

        // 2. Crear pedido
        const order = await api.post<{ id: string; total: number }>('/orders', {
          ...item.orderData,
          customerName: customer.name,
        });

        // 3. Cargar cuenta al cliente
        await api.post(`/customers/${customer.id}/charge`, {
          amount: order.total,
          orderId: order.id,
          note: `Pedido fiado (sincronizado)`,
        });

        // 4. Marcar pedido como FIADO
        await api.put(`/orders/${order.id}/fiar`, { customerId: customer.id });
      }

      // Eliminar de la cola si tuvo éxito
      removeFromOfflineQueue(item.id);
      successCount++;
    } catch (err: any) {
      console.error('Error sincronizando item:', item.id, err);
      // Si el error es de red (no pudo conectar), paramos de sincronizar el resto
      if (isNetworkError(err)) {
        if (onProgress) onProgress('Sincronización pausada: sin conexión al servidor.');
        failedCount++;
        break;
      }
      
      // Si es otro error (por ejemplo, lógica o validación), lo removemos de la cola 
      // para evitar trancar el resto y registramos la falla.
      removeFromOfflineQueue(item.id);
      failedCount++;
    }
  }

  return { success: successCount, failed: failedCount };
}
