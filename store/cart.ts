import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem } from "@/lib/types";

interface CartState {
  items: CartItem[];
  tableNumber: number | null;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setTableNumber: (tableNumber: number | null) => void;
  restoreCart: (items: CartItem[], tableNumber: number | null) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      tableNumber: null,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.product_id === item.product_id
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product_id === item.product_id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product_id !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((i) => i.product_id !== productId),
            };
          }
          return {
            items: state.items.map((i) =>
              i.product_id === productId ? { ...i, quantity } : i
            ),
          };
        }),

      clearCart: () => set({ items: [], tableNumber: null }),

      setTableNumber: (tableNumber) => set({ tableNumber }),

      restoreCart: (items, tableNumber) => set({ items, tableNumber }),
    }),
    {
      name: "cafe-pos-cart",
    }
  )
);
