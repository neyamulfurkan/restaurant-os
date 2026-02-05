// src/hooks/useCart.ts

import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';
import type { CartItem } from '@/types';

/**
 * Cart hook with side effects (toasts, analytics)
 * Wraps the Zustand cart store and adds user feedback
 */
export function useCart() {
  const store = useCartStore();

  // Wrapped addItem with toast notification
  const addItem = (
    item: {
      menuItemId: string;
      name: string;
      price: number;
    },
    quantity: number = 1,
    customizations?: {
      groupName: string;
      optionName: string;
      price: number;
    }[],
    specialInstructions?: string
  ) => {
    store.addItem(item, quantity, customizations, specialInstructions);
    
    toast.success(`${item.name} added to cart`, {
      description: `Quantity: ${quantity}`,
      duration: 2000,
    });

    // Optional: Track analytics
    if (typeof window !== 'undefined') {
      const win = window as unknown as { gtag?: (...args: unknown[]) => void };
      if (win.gtag) {
        win.gtag('event', 'add_to_cart', {
          currency: 'USD',
          value: item.price * quantity,
          items: [
            {
              item_id: item.menuItemId,
              item_name: item.name,
              price: item.price,
              quantity: quantity,
            },
          ],
        });
      }
    }
  };

  // Wrapped removeItem with toast notification
  const removeItem = (menuItemId: string) => {
    const itemToRemove = store.items.find(
      (item) => item.menuItemId === menuItemId
    );
    
    store.removeItem(menuItemId);
    
    if (itemToRemove) {
      toast.success(`${itemToRemove.name} removed from cart`, {
        duration: 2000,
      });

      // Optional: Track analytics
      if (typeof window !== 'undefined') {
        const win = window as unknown as { gtag?: (...args: unknown[]) => void };
        if (win.gtag) {
          win.gtag('event', 'remove_from_cart', {
            currency: 'USD',
            value: itemToRemove.price * itemToRemove.quantity,
            items: [
              {
                item_id: itemToRemove.menuItemId,
                item_name: itemToRemove.name,
                price: itemToRemove.price,
                quantity: itemToRemove.quantity,
              },
            ],
          });
        }
      }
    }
  };

  // Wrapped updateQuantity with validation
  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }

    if (quantity === 0) {
      // Removing item
      removeItem(menuItemId);
      return;
    }

    store.updateQuantity(menuItemId, quantity);
  };

  // Wrapped clearCart with confirmation
  const clearCart = () => {
    const itemCount = store.getItemCount();
    
    if (itemCount === 0) {
      toast.info('Cart is already empty');
      return;
    }

    store.clearCart();
    
    toast.success('Cart cleared', {
      description: `${itemCount} item${itemCount > 1 ? 's' : ''} removed`,
      duration: 2000,
    });
  };

  // Computed values
  const subtotal = store.getTotal();
  const itemCount = store.getItemCount();
  const isEmpty = itemCount === 0;

  // Get cart items
  const items = store.items;

  // Check if specific item is in cart
  const hasItem = (menuItemId: string): boolean => {
    return items.some((item) => item.menuItemId === menuItemId);
  };

  // Get quantity of specific item in cart
  const getItemQuantity = (menuItemId: string): number => {
    const item = items.find((item) => item.menuItemId === menuItemId);
    return item?.quantity ?? 0;
  };

  // Get item by ID (useful for cart sidebar)
  const getItem = (menuItemId: string): CartItem | undefined => {
    return items.find((item) => item.menuItemId === menuItemId);
  };

  return {
    // State
    items,
    subtotal,
    itemCount,
    isEmpty,
    
    // Actions (with side effects)
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    
    // Utility methods
    hasItem,
    getItemQuantity,
    getItem,
    
    // Direct store methods (if needed)
    getTotal: store.getTotal,
  };
}