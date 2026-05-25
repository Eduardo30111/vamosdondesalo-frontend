import { OrderType, PaymentMethod } from './types';

export interface CreateOrderDto {
  type: OrderType;
  tableId?: string;
  customerName: string;
  notes?: string;
  items: CreateOrderItemDto[];
}

export interface CreateOrderItemDto {
  productId: string;
  qty: number;
  notes?: string;
}

export interface UpdateOrderStatusDto {
  status: string;
}

export interface CreatePaymentDto {
  orderId: string;
  method: PaymentMethod;
  amount: number;
  proofUrl?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  photoUrl?: string;
  salePrice: number;
  costPrice: number;
  type: string;
  supplierId?: string;
  dailyStock: number;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface CreateTableDto {
  number: number;
}

export interface UpdatePaymentMethodConfigDto {
  qrUrl?: string;
  key?: string;
  enabled: boolean;
}
