import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Order } from '@/types';

interface OrdersResponse {
  orders: Order[];
  total: number;
}

interface CreateOrderData {
  items: Array<{
    menuItemId: string;
    quantity: number;
    customizations?: any;
    specialInstructions?: string;
  }>;
  type: 'DINE_IN' | 'PICKUP' | 'DELIVERY';
  tableNumber?: string;
  pickupTime?: string;
  deliveryAddressId?: string;
  paymentMethod: string;
  specialInstructions?: string;
  tipAmount?: number;
  promoCodeId?: string;
}

/**
 * Hook for fetching customer's orders
 * @param customerId - Optional customer ID filter
 * @param status - Optional status filter
 */
export function useOrders(customerId?: string, status?: string) {
  return useQuery<OrdersResponse>({
    queryKey: ['orders', customerId, status],
    queryFn: async () => {
      // Get restaurant ID from settings store
      const restaurantId = 'rest123456789'; // This matches your test restaurant ID
      
      const params = new URLSearchParams();
      params.append('restaurantId', restaurantId);
      if (customerId) params.append('customerId', customerId);
      if (status) params.append('status', status);

      const response = await fetch(`/api/orders?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const result = await response.json();
      
      // Transform API response to match expected structure
      return {
        orders: result.data || [],
        total: result.pagination?.total || 0,
      };
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook for fetching a single order by ID
 * @param orderId - Order ID
 */
export function useOrder(orderId: string) {
  return useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      
      return response.json();
    },
    enabled: !!orderId,
    staleTime: 10000, // 10 seconds for active order tracking
    refetchInterval: 10000, // Refetch every 10 seconds for live updates
  });
}

/**
 * Hook for creating a new order
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrderData) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate orders cache to refetch
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/**
 * Hook for reordering (creating order from previous order)
 * @param orderId - Original order ID
 */
export function useReorder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}/reorder`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reorder');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/**
 * Hook for cancelling an order
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel order');
      }

      return response.json();
    },
    onSuccess: (_, orderId) => {
      // Invalidate specific order and orders list
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}