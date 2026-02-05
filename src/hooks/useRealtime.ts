// src/hooks/useRealtime.ts

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Type for database table names that support realtime
 */
type RealtimeTable = 'Order' | 'Booking';

/**
 * Type for the change event from Supabase
 */
type ChangePayload<T extends Record<string, any> = any> = RealtimePostgresChangesPayload<T>;

/**
 * Callback function type for handling realtime changes
 */
type ChangeCallback<T extends Record<string, any> = any> = (payload: ChangePayload<T>) => void;

/**
 * Options for configuring the realtime subscription
 */
interface UseRealtimeOptions<T extends Record<string, any> = any> {
  /**
   * Database table to subscribe to
   */
  table: RealtimeTable;
  
  /**
   * Event types to listen for
   * Default: ['INSERT', 'UPDATE', 'DELETE']
   */
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  
  /**
   * Callback function when changes occur
   */
  onInsert?: ChangeCallback<T>;
  onUpdate?: ChangeCallback<T>;
  onDelete?: ChangeCallback<T>;
  onChange?: ChangeCallback<T>; // Called for all events
  
  /**
   * Optional filter to apply to the subscription
   * Example: `status=eq.PENDING` to only listen to pending orders
   */
  filter?: string;
  
  /**
   * Schema name (default: 'public')
   */
  schema?: string;
  
  /**
   * Enable/disable the subscription
   * Useful for conditional subscriptions
   */
  enabled?: boolean;
}

/**
 * Hook to subscribe to Supabase realtime changes on Order and Booking tables
 * 
 * Automatically unsubscribes when component unmounts
 * 
 * @example
 * // Listen to all order updates
 * useRealtime({
 *   table: 'Order',
 *   onUpdate: (payload) => {
 *     console.log('Order updated:', payload.new);
 *     refetchOrders();
 *   }
 * });
 * 
 * @example
 * // Listen to new bookings only
 * useRealtime({
 *   table: 'Booking',
 *   event: 'INSERT',
 *   onInsert: (payload) => {
 *     toast.success('New booking received!');
 *   }
 * });
 * 
 * @example
 * // Listen to specific order status changes
 * useRealtime({
 *   table: 'Order',
 *   filter: 'status=eq.READY',
 *   onChange: (payload) => {
 *     notifyKitchen(payload.new);
 *   }
 * });
 */
export function useRealtime<T extends Record<string, any> = any>(options: UseRealtimeOptions<T>): void {
  const {
    table,
    event = '*',
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    filter,
    schema = 'public',
    enabled = true,
  } = options;

  // Store channel reference to clean up on unmount
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Don't subscribe if disabled
    if (!enabled) {
      return;
    }

    // Create unique channel name to avoid conflicts
    const channelName = `${table.toLowerCase()}-changes-${Date.now()}`;

    // Create subscription channel
    const channel = supabase
      .channel(channelName)
      .on<T extends { [key: string]: any } ? T : any>(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
          filter,
        },
        (payload: ChangePayload<T>) => {
          // Call event-specific callbacks
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload);
              break;
            case 'UPDATE':
              onUpdate?.(payload);
              break;
            case 'DELETE':
              onDelete?.(payload);
              break;
          }

          // Always call the general onChange callback
          onChange?.(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to ${table} changes`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Error subscribing to ${table}`);
        } else if (status === 'TIMED_OUT') {
          console.error(`[Realtime] Timeout subscribing to ${table}`);
        }
      });

    // Store channel reference for cleanup
    channelRef.current = channel;

    // Cleanup function: unsubscribe when component unmounts
    return () => {
      if (channelRef.current) {
        console.log(`[Realtime] Unsubscribing from ${table} changes`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, event, filter, schema, enabled, onInsert, onUpdate, onDelete, onChange]);
}

/**
 * Hook to subscribe to Order table changes
 * Convenience wrapper around useRealtime
 * 
 * @example
 * useOrderRealtime({
 *   onUpdate: (payload) => {
 *     if (payload.new.status === 'READY') {
 *       toast.success('Order is ready!');
 *     }
 *   }
 * });
 */
export function useOrderRealtime(
  options: Omit<UseRealtimeOptions, 'table'>
): void {
  useRealtime({
    ...options,
    table: 'Order',
  });
}

/**
 * Hook to subscribe to Booking table changes
 * Convenience wrapper around useRealtime
 * 
 * @example
 * useBookingRealtime({
 *   onInsert: (payload) => {
 *     console.log('New booking:', payload.new);
 *     refetchBookings();
 *   }
 * });
 */
export function useBookingRealtime(
  options: Omit<UseRealtimeOptions, 'table'>
): void {
  useRealtime({
    ...options,
    table: 'Booking',
  });
}

/**
 * Manually subscribe to realtime changes (without React hooks)
 * Use this in non-React contexts or when you need manual control
 * 
 * @returns Unsubscribe function
 * 
 * @example
 * const unsubscribe = subscribeToOrders({
 *   onChange: (payload) => console.log('Order changed:', payload)
 * });
 * 
 * // Later...
 * unsubscribe();
 */
export function subscribeToOrders(
  options: Omit<UseRealtimeOptions, 'table'>
): () => void {
  const {
    event = '*',
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    filter,
    schema = 'public',
  } = options;

  const channelName = `order-changes-${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event,
        schema,
        table: 'Order',
        filter,
      },
      (payload: ChangePayload) => {
        switch (payload.eventType) {
          case 'INSERT':
            onInsert?.(payload);
            break;
          case 'UPDATE':
            onUpdate?.(payload);
            break;
          case 'DELETE':
            onDelete?.(payload);
            break;
        }
        onChange?.(payload);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Manually subscribe to booking changes (without React hooks)
 * 
 * @returns Unsubscribe function
 * 
 * @example
 * const unsubscribe = subscribeToBookings({
 *   filter: 'date=eq.2024-01-30',
 *   onChange: (payload) => console.log('Booking changed:', payload)
 * });
 * 
 * // Later...
 * unsubscribe();
 */
export function subscribeToBookings(
  options: Omit<UseRealtimeOptions, 'table'>
): () => void {
  const {
    event = '*',
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    filter,
    schema = 'public',
  } = options;

  const channelName = `booking-changes-${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event,
        schema,
        table: 'Booking',
        filter,
      },
      (payload: ChangePayload) => {
        switch (payload.eventType) {
          case 'INSERT':
            onInsert?.(payload);
            break;
          case 'UPDATE':
            onUpdate?.(payload);
            break;
          case 'DELETE':
            onDelete?.(payload);
            break;
        }
        onChange?.(payload);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}