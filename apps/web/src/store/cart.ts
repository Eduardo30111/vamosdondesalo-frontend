import { create } from 'zustand';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  notes: string;
  photoUrl: string | null;
}

interface CartState {
  items: CartItem[];
  orderType: 'TABLE' | 'TAKEAWAY' | 'DELIVERY';
  tableId: string | null;
  customerName: string;
  notes: string;
  addItem: (item: Omit<CartItem, 'qty' | 'notes'>) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  updateItemNotes: (productId: string, notes: string) => void;
  setOrderType: (type: 'TABLE' | 'TAKEAWAY' | 'DELIVERY') => void;
  setTableId: (id: string | null) => void;
  setCustomerName: (name: string) => void;
  setNotes: (notes: string) => void;
  clear: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderType: 'TABLE',
  tableId: null,
  customerName: '',
  notes: '',
  addItem: (item) => {
    const items = get().items;
    const existing = items.find((i) => i.productId === item.productId);
    if (existing) {
      set({ items: items.map((i) => i.productId === item.productId ? { ...i, qty: i.qty + 1 } : i) });
    } else {
      set({ items: [...items, { ...item, qty: 1, notes: '' }] });
    }
  },
  removeItem: (productId) => set({ items: get().items.filter((i) => i.productId !== productId) }),
  updateQty: (productId, qty) => {
    if (qty <= 0) {
      set({ items: get().items.filter((i) => i.productId !== productId) });
    } else {
      set({ items: get().items.map((i) => i.productId === productId ? { ...i, qty } : i) });
    }
  },
  updateItemNotes: (productId, notes) => {
    set({ items: get().items.map((i) => i.productId === productId ? { ...i, notes } : i) });
  },
  setOrderType: (type) => set({ orderType: type }),
  setTableId: (id) => set({ tableId: id }),
  setCustomerName: (name) => set({ customerName: name }),
  setNotes: (notes) => set({ notes }),
  clear: () => set({ items: [], tableId: null, customerName: '', notes: '', orderType: 'TABLE' }),
  total: () => get().items.reduce((sum, item) => sum + item.price * item.qty, 0),
}));
