export type UserRole = "admin" | "manager" | "cashier";

export type OrderStatus = "pending" | "paid" | "refunded" | "completed";

export type PaymentType = "cash" | "credit";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  category: string;
  is_active: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  created_at: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
}

export interface Order {
  id: string;
  order_number: number;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_type: PaymentType;
  payment_ref: string | null;
  amount_received: number;
  change_amount: number;
  cashier_id: string;
  table_number: number | null;
  created_at: string;
  paid_at: string | null;
  completed_at: string | null;
  profiles?: Pick<Profile, "full_name">;
}

export interface Refund {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentType;
  restore_inventory: boolean;
  reason: string | null;
  cashier_id: string;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
}
