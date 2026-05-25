export enum UserRole {
  ADMIN = 'ADMIN',
  VENDEDOR = 'VENDEDOR',
  COCINA = 'COCINA',
}

export enum ProductType {
  OWN = 'OWN',
  SUPPLIER = 'SUPPLIER',
}

export enum OrderType {
  TABLE = 'TABLE',
  TAKEAWAY = 'TAKEAWAY',
  DELIVERY = 'DELIVERY',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  PAID = 'PAID',
}

export enum PaymentMethod {
  CASH = 'CASH',
  NEQUI = 'NEQUI',
  BANCOLOMBIA = 'BANCOLOMBIA',
  DAVIPLATA = 'DAVIPLATA',
  TRANSFER = 'TRANSFER',
}

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface ProductResponse {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  salePrice: number;
  costPrice: number;
  type: ProductType;
  supplierId: string | null;
  dailyStock: number;
}

export interface OrderResponse {
  id: string;
  type: OrderType;
  tableId: string | null;
  customerName: string;
  status: OrderStatus;
  notes: string | null;
  total: number;
  createdAt: string;
  items: OrderItemResponse[];
  table?: { id: string; number: number } | null;
}

export interface OrderItemResponse {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number;
  notes: string | null;
  product?: ProductResponse;
}

export interface TableResponse {
  id: string;
  number: number;
  qrToken: string;
}

export interface PaymentMethodConfigResponse {
  method: PaymentMethod;
  qrUrl: string | null;
  key: string | null;
  enabled: boolean;
}

export interface DashboardStats {
  salesToday: number;
  ordersToday: number;
  activeOrders: number;
  topProducts: Array<{ name: string; count: number }>;
}
