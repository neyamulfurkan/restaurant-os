// src/hooks/useBookings.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  BookingWithRelations,
  BookingFilters,
  CreateBookingRequest,
  UpdateBookingRequest,
  CheckAvailabilityRequest,
  AvailabilityResponse,
  ApiResponse,
} from '@/types';

// ============= QUERY KEYS =============
const BOOKINGS_QUERY_KEY = 'bookings';
const BOOKING_DETAIL_QUERY_KEY = 'booking';
const AVAILABILITY_QUERY_KEY = 'availability';

// ============= API FUNCTIONS =============

async function fetchBookings(filters?: BookingFilters): Promise<BookingWithRelations[]> {
  const params = new URLSearchParams();
  
  if (filters?.status) params.append('status', filters.status);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.customerId) params.append('customerId', filters.customerId);

  const queryString = params.toString();
  const url = `/api/bookings${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch bookings');
  }

  const result: ApiResponse<BookingWithRelations[]> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch bookings');
  }

  return result.data;
}

async function fetchBookingById(bookingId: string): Promise<BookingWithRelations> {
  const response = await fetch(`/api/bookings/${bookingId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch booking');
  }

  const result: ApiResponse<BookingWithRelations> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch booking');
  }

  return result.data;
}

async function checkAvailability(params: CheckAvailabilityRequest): Promise<AvailabilityResponse> {
  const queryParams = new URLSearchParams({
    date: params.date,
    guests: params.guests.toString(),
  });

  const response = await fetch(`/api/bookings/availability?${queryParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to check availability');
  }

  const result: ApiResponse<AvailabilityResponse> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to check availability');
  }

  return result.data;
}

async function createBooking(data: CreateBookingRequest): Promise<BookingWithRelations> {
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create booking');
  }

  const result: ApiResponse<BookingWithRelations> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to create booking');
  }

  return result.data;
}

async function updateBooking(
  bookingId: string,
  data: UpdateBookingRequest
): Promise<BookingWithRelations> {
  const response = await fetch(`/api/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update booking');
  }

  const result: ApiResponse<BookingWithRelations> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to update booking');
  }

  return result.data;
}

async function cancelBooking(bookingId: string): Promise<void> {
  const response = await fetch(`/api/bookings/${bookingId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel booking');
  }
}

// ============= HOOK: useBookings =============

export function useBookings(filters?: BookingFilters) {
  const {
    data: bookings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [BOOKINGS_QUERY_KEY, filters],
    queryFn: () => fetchBookings(filters),
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });

  return {
    bookings: bookings || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// ============= HOOK: useBooking (single booking) =============

export function useBooking(bookingId: string | null) {
  const {
    data: booking,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [BOOKING_DETAIL_QUERY_KEY, bookingId],
    queryFn: () => fetchBookingById(bookingId!),
    enabled: !!bookingId,
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });

  return {
    booking: booking || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// ============= HOOK: useAvailability =============

export function useAvailability(params: CheckAvailabilityRequest | null) {
  const {
    data: availability,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [AVAILABILITY_QUERY_KEY, params?.date, params?.guests],
    queryFn: () => checkAvailability(params!),
    enabled: !!params?.date && !!params?.guests,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    availability: availability || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// ============= HOOK: useCreateBooking =============

export function useCreateBooking() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      // Invalidate bookings cache to refetch
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_QUERY_KEY] });
      // Invalidate availability cache
      queryClient.invalidateQueries({ queryKey: [AVAILABILITY_QUERY_KEY] });
    },
  });

  return {
    createBooking: mutation.mutate,
    createBookingAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error as Error | null,
    isSuccess: mutation.isSuccess,
  };
}

// ============= HOOK: useUpdateBooking =============

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: string; data: UpdateBookingRequest }) =>
      updateBooking(bookingId, data),
    onSuccess: (updatedBooking) => {
      // Invalidate bookings list cache
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_QUERY_KEY] });
      // Update specific booking cache
      queryClient.setQueryData(
        [BOOKING_DETAIL_QUERY_KEY, updatedBooking.id],
        updatedBooking
      );
      // Invalidate availability cache
      queryClient.invalidateQueries({ queryKey: [AVAILABILITY_QUERY_KEY] });
    },
  });

  return {
    updateBooking: mutation.mutate,
    updateBookingAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error as Error | null,
    isSuccess: mutation.isSuccess,
  };
}

// ============= HOOK: useCancelBooking =============

export function useCancelBooking() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      // Invalidate bookings cache
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_QUERY_KEY] });
      // Invalidate availability cache
      queryClient.invalidateQueries({ queryKey: [AVAILABILITY_QUERY_KEY] });
    },
  });

  return {
    cancelBooking: mutation.mutate,
    cancelBookingAsync: mutation.mutateAsync,
    isCanceling: mutation.isPending,
    error: mutation.error as Error | null,
    isSuccess: mutation.isSuccess,
  };
}

// ============= HOOK: useMyBookings (for logged-in customer) =============

export function useMyBookings(customerId: string | null) {
  return useBookings(
    customerId
      ? {
          customerId,
        }
      : undefined
  );
}