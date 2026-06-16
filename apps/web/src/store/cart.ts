import { create } from 'zustand';

interface CartItem {
  cartItemId: string;
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
  addItem: (item: Omit<CartItem, 'cartItemId' | 'qty' | 'notes'>) => void;
  removeItem: (cartItemId: string) => void;
  updateQty: (cartItemId: string, qty: number) => void;
  updateItemNotes: (cartItemId: string, notes: string) => void;
  updateItemPrice: (cartItemId: string, price: number) => void;
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
    const existing = items.find((i) => i.productId === item.productId && i.name === item.name && i.price === item.price);
    if (existing) {
      set({ items: items.map((i) => i.cartItemId === existing.cartItemId ? { ...i, qty: i.qty + 1 } : i) });
    } else {
      const cartItemId = `${item.productId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      set({ items: [...items, { ...item, cartItemId, qty: 1, notes: '' }] });
    }
  },
  removeItem: (cartItemId) => set({ items: get().items.filter((i) => i.cartItemId !== cartItemId) }),
  updateQty: (cartItemId, qty) => {
    if (qty <= 0) {
      set({ items: get().items.filter((i) => i.cartItemId !== cartItemId) });
    } else {
      set({ items: get().items.map((i) => i.cartItemId === cartItemId ? { ...i, qty } : i) });
    }
  },
  updateItemNotes: (cartItemId, notes) => {
    set({ items: get().items.map((i) => i.cartItemId === cartItemId ? { ...i, notes } : i) });
  },
  updateItemPrice: (cartItemId, price) => {
    set({ items: get().items.map((i) => i.cartItemId === cartItemId ? { ...i, price } : i) });
  },
  setOrderType: (type) => set({ orderType: type }),
  setTableId: (id) => set({ tableId: id }),
  setCustomerName: (name) => set({ customerName: name }),
  setNotes: (notes) => set({ notes }),
  clear: () => set({ items: [], tableId: null, customerName: '', notes: '', orderType: 'TABLE' }),
  total: () => get().items.reduce((sum, item) => sum + item.price * item.qty, 0),
}));
