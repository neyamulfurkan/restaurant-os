// src/store/cartStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  addItem: (
    item: {
      menuItemId: string;
      name: string;
      price: number;
      imageUrl?: string;
    },
    quantity?: number,
    customizations?: {
      groupName: string;
      optionName: string;
      price: number;
    }[],
    specialInstructions?: string
  ) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, quantity = 1, customizations, specialInstructions) => {
        set((state) => {
          // Check if item already exists in cart (same item + same customizations)
          const existingItemIndex = state.items.findIndex(
            (cartItem) =>
              cartItem.menuItemId === item.menuItemId &&
              JSON.stringify(cartItem.customizations) ===
                JSON.stringify(customizations) &&
              cartItem.specialInstructions === specialInstructions
          );

          if (existingItemIndex > -1) {
            // Item exists, update quantity
            const updatedItems = [...state.items];
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              quantity: updatedItems[existingItemIndex].quantity + quantity,
            };
            return { items: updatedItems };
          } else {
            // New item, add to cart
            const newItem: CartItem = {
              menuItemId: item.menuItemId,
              name: item.name,
              price: item.price,
              quantity,
              imageUrl: item.imageUrl,
              customizations,
              specialInstructions,
            };
            return { items: [...state.items, newItem] };
          }
        });
      },

      removeItem: (menuItemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.menuItemId !== menuItemId),
        }));
      },

      updateQuantity: (menuItemId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            // Remove item if quantity is 0 or negative
            return {
              items: state.items.filter((item) => item.menuItemId !== menuItemId),
            };
          }

          return {
            items: state.items.map((item) =>
              item.menuItemId === menuItemId ? { ...item, quantity } : item
            ),
          };
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotal: () => {
        const { items } = get();
        return items.reduce((total, item) => {
          // Calculate item price including customizations
          const customizationsTotal = item.customizations
            ? item.customizations.reduce((sum, custom) => sum + custom.price, 0)
            : 0;
          const itemTotal = (item.price + customizationsTotal) * item.quantity;
          return total + itemTotal;
        }, 0);
      },

      getItemCount: () => {
        const { items } = get();
        return items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage', // localStorage key
      // Optional: customize what gets persisted
      partialize: (state) => ({ items: state.items }),
    }
  )
);