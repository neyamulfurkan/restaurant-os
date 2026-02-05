// src/components/admin/BookingDetailsDrawer.tsx

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Removed direct import to avoid bundling Prisma in browser
import { BOOKING_STATUS } from '@/lib/constants';
import type { BookingWithRelations, Table } from '@/types';
import { BookingStatus } from '@prisma/client';
import {
  Calendar,
  Clock,
  Users,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

interface BookingDetailsDrawerProps {
  booking: BookingWithRelations | null;
  tables: Table[];
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function BookingDetailsDrawer({
  booking,
  tables,
  open,
  onClose,
  onUpdate,
}: BookingDetailsDrawerProps) {
  const [selectedTableId, setSelectedTableId] = useState<string | undefined>(
    booking?.tableId || undefined
  );
  const [isLoading, setIsLoading] = useState(false);

  // Reset selected table when booking changes
  React.useEffect(() => {
    setSelectedTableId(booking?.tableId || undefined);
  }, [booking]);

  if (!booking) {
    return null;
  }

  const isPending = booking.status === BOOKING_STATUS.PENDING;
  const isConfirmed = booking.status === BOOKING_STATUS.CONFIRMED;
  const isCancelled = booking.status === BOOKING_STATUS.CANCELLED;
  const isCompleted = booking.status === BOOKING_STATUS.COMPLETED;
  const isNoShow = booking.status === BOOKING_STATUS.NO_SHOW;

  // Format date
  const bookingDate = new Date(booking.date);
  const formattedDate = bookingDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get status badge color
  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BOOKING_STATUS.CONFIRMED:
        return 'bg-green-100 text-green-800';
      case BOOKING_STATUS.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case BOOKING_STATUS.CANCELLED:
        return 'bg-red-100 text-red-800';
      case BOOKING_STATUS.COMPLETED:
        return 'bg-blue-100 text-blue-800';
      case BOOKING_STATUS.NO_SHOW:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle confirm booking
  const handleConfirm = async () => {
    if (!selectedTableId) {
      toast.error('Please assign a table before confirming');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED', tableId: selectedTableId }),
      });
      if (!response.ok) throw new Error('Failed to confirm booking');
      toast.success('Booking confirmed successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast.error('Failed to confirm booking');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle decline booking
  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this booking?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to decline booking');
      toast.success('Booking declined');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error declining booking:', error);
      toast.error('Failed to decline booking');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel booking
  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to cancel booking');
      toast.success('Booking cancelled');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle mark as no-show
  const handleNoShow = async () => {
    if (!confirm('Mark this booking as no-show?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: BOOKING_STATUS.NO_SHOW }),
      });
      if (!response.ok) throw new Error('Failed to mark as no-show');
      toast.success('Booking marked as no-show');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error marking no-show:', error);
      toast.error('Failed to mark as no-show');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle mark as completed
  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: BOOKING_STATUS.COMPLETED }),
      });
      if (!response.ok) throw new Error('Failed to complete booking');
      toast.success('Booking marked as completed');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error completing booking:', error);
      toast.error('Failed to complete booking');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle send reminder
  const handleSendReminder = async () => {
    setIsLoading(true);
    try {
      // Call notification API to send reminder
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: booking.customer.email,
          subject: 'Booking Reminder',
          message: `Hi ${booking.customer.name}, this is a reminder for your booking on ${formattedDate} at ${booking.time} for ${booking.guests} guests.`,
          metadata: { bookingId: booking.id },
        }),
      });

      if (!response.ok) throw new Error('Failed to send reminder');

      toast.success('Reminder sent successfully');
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle table assignment change
  const handleTableChange = async (tableId: string) => {
    setSelectedTableId(tableId);

    // If booking is already confirmed, update immediately
    if (isConfirmed) {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/bookings/${booking.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: BOOKING_STATUS.CONFIRMED, tableId }),
        });
        if (!response.ok) throw new Error('Failed to update table');
        toast.success('Table assignment updated');
        onUpdate();
      } catch (error) {
        console.error('Error updating table:', error);
        toast.error('Failed to update table assignment');
        setSelectedTableId(booking.tableId || undefined);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Booking Details</span>
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full ${getStatusColor(
                booking.status
              )}`}
            >
              {booking.status}
            </span>
          </SheetTitle>
          <SheetDescription>#{booking.bookingNumber}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Customer Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Customer Information
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{booking.customer.name}</span>
              </div>
              {booking.customer.email && (
                <div className="flex items-center gap-2 text-sm">
                 <Mail className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={`mailto:${booking.customer.email}`}
                    className="text-primary hover:underline"
                  >
                    {booking.customer.email}
                  </a>
                </div>
              )}
              {booking.customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={`tel:${booking.customer.phone}`}
                    className="text-primary hover:underline"
                  >
                    {booking.customer.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Booking Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Booking Details
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{booking.time}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{booking.guests} guests</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Duration: {booking.duration} minutes</span>
              </div>
            </div>
          </div>

          {/* Table Assignment */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Table Assignment
            </h3>
            <Select
              value={selectedTableId}
              onValueChange={handleTableChange}
              disabled={isCancelled || isCompleted || isNoShow || isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a table" />
              </SelectTrigger>
              <SelectContent>
                {tables
                  .filter((table) => table.isActive)
                  .map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.number} (Capacity: {table.capacity})
                      {table.capacity < booking.guests && ' - Requires combining tables'}
                    </SelectItem>
                  ))}
                {tables.filter((table) => table.isActive).length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No tables available. Add tables in Settings.
                  </div>
                )}
              </SelectContent>
            </Select>
            {selectedTableId && booking.table && (
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>
                  Table {booking.table.number} (Capacity: {booking.table.capacity})
                </span>
              </div>
            )}
          </div>

          {/* Special Requests */}
          {booking.specialRequests && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Special Requests
              </h3>
              <div className="flex gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">{booking.specialRequests}</p>
              </div>
            </div>
          )}

          {/* Deposit Information */}
          {booking.depositAmount > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Deposit Information
              </h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit Amount:</span>
                  <span className="font-medium">
                    ${booking.depositAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium" style={{ 
                    color: booking.depositPaid ? 'hsl(var(--success))' : 'hsl(var(--warning))'
                  }}>
                    {booking.depositPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t">
            {isPending && (
              <>
                <Button
                  onClick={handleConfirm}
                  disabled={isLoading || !selectedTableId}
                  className="w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Booking
                </Button>
                <Button
                  onClick={handleDecline}
                  disabled={isLoading}
                  variant="destructive"
                  className="w-full"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline Booking
                </Button>
              </>
            )}

            {isConfirmed && (
              <>
                <Button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Completed
                </Button>
                <Button
                  onClick={handleNoShow}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark as No-Show
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={isLoading}
                  variant="destructive"
                  className="w-full"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Booking
                </Button>
              </>
            )}

            {(isPending || isConfirmed) && (
              <Button
                onClick={handleSendReminder}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Reminder
              </Button>
            )}
          </div>

          {/* Timestamps */}
          <div className="space-y-1 text-xs text-muted-foreground pt-4 border-t border-border">
            <div className="flex justify-between">
              <span>Created:</span>
              <span>
                {new Date(booking.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span>
                {new Date(booking.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}