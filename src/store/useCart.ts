import { create } from "zustand";
import type { CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  total: number;
  lastAddedAt: number;
  open: boolean;
  add: (productId: string, variantLabel: string, price: number) => void;
  remove: (id: string) => void;
  setOpen: (open: boolean) => void;
  clear: () => void;
}

let counter = 0;

export const useCart = create<CartState>((set) => ({
  items: [],
  total: 0,
  lastAddedAt: 0,
  open: false,
  add: (productId, variantLabel, price) =>
    set((s) => {
      counter += 1;
      const items = [...s.items, { id: `ci-${counter}`, productId, variantLabel, price }];
      return {
        items,
        total: items.reduce((acc, i) => acc + i.price, 0),
        lastAddedAt: counter,
      };
    }),
  remove: (id) =>
    set((s) => {
      const items = s.items.filter((i) => i.id !== id);
      return { items, total: items.reduce((acc, i) => acc + i.price, 0) };
    }),
  setOpen: (open) => set({ open }),
  clear: () => set({ items: [], total: 0 }),
}));
