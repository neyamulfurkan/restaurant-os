'use client';

import { useState } from 'react';
import format from 'date-fns/format';
import { Calendar, Clock, Users, MapPin, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBookings } from '@/hooks/useBookings';
import { BookingStatus, BookingWithRelations } from '@/types';
import { toast } from 'sonner';

export default function BookingHistoryPage() {
  const { bookings, isLoading } = useBookings();
  
  const cancelBooking = async (bookingId: string): Promise<void> => {
    const response = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    if (!response.ok) throw new Error('Failed to cancel booking');
  };

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Separate bookings into upcoming and past
  const now = new Date();
  
  // Handle API response that might be wrapped in { data: [] } or be array directly
  let bookingsArray: BookingWithRelations[] = [];
  if (Array.isArray(bookings)) {
    bookingsArray = bookings;
  } else if (bookings && typeof bookings === 'object' && 'data' in bookings) {
    bookingsArray = (bookings as { data: BookingWithRelations[] }).data || [];
  }

  const upcomingBookings = bookingsArray.filter((booking: BookingWithRelations) => {
    const bookingDate = new Date(booking.date);
    return bookingDate >= now && booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED';
  });

  const pastBookings = bookingsArray.filter((booking: BookingWithRelations) => {
    const bookingDate = new Date(booking.date);
    return bookingDate < now || booking.status === 'CANCELLED' || booking.status === 'COMPLETED';
  });

  const handleCancelClick = (bookingId: string): void => {
    setSelectedBookingId(bookingId);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async (): Promise<void> => {
    if (!selectedBookingId) return;

    setIsCancelling(true);
    try {
      await cancelBooking(selectedBookingId);
      toast.success('Booking cancelled successfully');
      setCancelModalOpen(false);
      setSelectedBookingId(null);
    } catch {
      toast.error('Failed to cancel booking. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusVariant = (status: BookingStatus): 'default' | 'success' | 'warning' | 'error' | 'secondary' => {
    switch (status) {
      case 'CONFIRMED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      case 'COMPLETED':
        return 'secondary';
      case 'NO_SHOW':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: BookingStatus): string => {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmed';
      case 'PENDING':
        return 'Pending';
      case 'CANCELLED':
        return 'Cancelled';
      case 'COMPLETED':
        return 'Completed';
      case 'NO_SHOW':
        return 'No Show';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6" style={{ backgroundColor: 'hsl(var(--background))' }}>
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-neutral-200 rounded w-1/4 mb-4" />
                <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2" />
                <div className="h-4 bg-neutral-200 rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div>
        <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
        <p className="text-neutral-600">
          View and manage your table reservations
        </p>
      </div>

      {/* Upcoming Bookings */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Upcoming Bookings</h2>
        {upcomingBookings.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
              <p className="text-neutral-600">No upcoming bookings</p>
              <Button className="mt-4" asChild>
                <a href="/booking">Book a Table</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {upcomingBookings.map((booking: BookingWithRelations) => (
              <Card key={booking.id} className="hover:shadow-md transition-shadow" style={{ backgroundColor: 'hsl(var(--card))' }}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusVariant(booking.status)}>
                          {getStatusLabel(booking.status)}
                        </Badge>
                        <span className="text-sm font-semibold text-neutral-500">
                          {booking.bookingNumber}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-neutral-700">
                          <Calendar className="w-4 h-4 text-neutral-500" />
                          <span className="font-medium">
                            {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-neutral-700">
                          <Clock className="w-4 h-4 text-neutral-500" />
                          <span className="font-medium">{booking.time}</span>
                        </div>

                        <div className="flex items-center gap-2 text-neutral-700">
                          <Users className="w-4 h-4 text-neutral-500" />
                          <span className="font-medium">
                            {booking.guests} {booking.guests === 1 ? 'Guest' : 'Guests'}
                          </span>
                        </div>

                        {booking.table && (
                          <div className="flex items-center gap-2 text-neutral-700">
                            <MapPin className="w-4 h-4 text-neutral-500" />
                            <span className="font-medium">Table {booking.table.number}</span>
                          </div>
                        )}
                      </div>

                      {booking.specialRequests && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-neutral-600">
                            <span className="font-medium">Special Requests:</span>{' '}
                            {booking.specialRequests}
                          </p>
                        </div>
                      )}
                    </div>

                    {booking.status === 'CONFIRMED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelClick(booking.id)}
                        className="ml-4 text-error hover:text-error hover:bg-error/10"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Past Bookings</h2>
          <div className="grid gap-4">
            {pastBookings.map((booking: BookingWithRelations) => (
              <Card key={booking.id} className="opacity-75" style={{ backgroundColor: 'hsl(var(--card))' }}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                      <span className="text-sm font-semibold text-neutral-500">
                        {booking.bookingNumber}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-neutral-700">
                        <Calendar className="w-4 h-4 text-neutral-500" />
                        <span className="font-medium">
                          {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-neutral-700">
                        <Clock className="w-4 h-4 text-neutral-500" />
                        <span className="font-medium">{booking.time}</span>
                      </div>

                      <div className="flex items-center gap-2 text-neutral-700">
                        <Users className="w-4 h-4 text-neutral-500" />
                        <span className="font-medium">
                          {booking.guests} {booking.guests === 1 ? 'Guest' : 'Guests'}
                        </span>
                      </div>

                      {booking.table && (
                        <div className="flex items-center gap-2 text-neutral-700">
                          <MapPin className="w-4 h-4 text-neutral-500" />
                          <span className="font-medium">Table {booking.table.number}</span>
                        </div>
                      )}
                    </div>

                    {booking.specialRequests && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-neutral-600">
                          <span className="font-medium">Special Requests:</span>{' '}
                          {booking.specialRequests}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelModalOpen(false)}
              disabled={isCancelling}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}