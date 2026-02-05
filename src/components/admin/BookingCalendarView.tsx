// src/components/admin/BookingCalendarView.tsx

import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { BookingWithRelations } from '@/types';
import { BOOKING_STATUS } from '@/lib/constants';
import format from 'date-fns/format';

interface BookingCalendarViewProps {
  bookings: BookingWithRelations[];
  onBookingClick: (booking: BookingWithRelations) => void;
  view?: 'month' | 'week' | 'day';
  onViewChange?: (view: 'month' | 'week' | 'day') => void;
}

export function BookingCalendarView({
  bookings,
  onBookingClick,
  view: controlledView,
  onViewChange,
}: BookingCalendarViewProps) {
  const [internalView, setInternalView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const view = controlledView || internalView;
  
  const handleViewChange = (newView: 'month' | 'week' | 'day') => {
    if (onViewChange) {
      onViewChange(newView);
    } else {
      setInternalView(newView);
    }
  };

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.date);
      return bookingDate.toDateString() === date.toDateString();
    });
  };

  // Get booking status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case BOOKING_STATUS.CONFIRMED:
        return 'bg-green-500';
      case BOOKING_STATUS.PENDING:
        return 'bg-yellow-500';
      case BOOKING_STATUS.CANCELLED:
        return 'bg-red-500';
      case BOOKING_STATUS.COMPLETED:
        return 'bg-blue-500';
      case BOOKING_STATUS.NO_SHOW:
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Get booking status badge variant
  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case BOOKING_STATUS.CONFIRMED:
        return 'default';
      case BOOKING_STATUS.PENDING:
        return 'secondary';
      case BOOKING_STATUS.CANCELLED:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Custom day content for calendar with colored dots
  const modifiers = useMemo(() => {
    const confirmedDates = bookings
      .filter((b) => b.status === BOOKING_STATUS.CONFIRMED)
      .map((b) => new Date(b.date));
    
    const pendingDates = bookings
      .filter((b) => b.status === BOOKING_STATUS.PENDING)
      .map((b) => new Date(b.date));
    
    const cancelledDates = bookings
      .filter((b) => b.status === BOOKING_STATUS.CANCELLED)
      .map((b) => new Date(b.date));

    return {
      confirmed: confirmedDates,
      pending: pendingDates,
      cancelled: cancelledDates,
    };
  }, [bookings]);

  const modifiersClassNames = {
    confirmed: 'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-green-500',
    pending: 'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-yellow-500',
    cancelled: 'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-red-500',
  };

  // Week view dates
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const curr = new Date(selectedDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day;
    const sunday = new Date(curr.setDate(diff));
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [selectedDate]);

  // Render month view
  const renderMonthView = () => {
    const dayBookings = getBookingsForDate(selectedDate);
    
    return (
      <div className="p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              setSelectedDate(date);
            }
          }}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          className="rounded-md border"
        />
      {/* Bookings for selected date */}
        {selectedDate && dayBookings.length > 0 && (
          <div className="mt-6 space-y-2">
            <h4 className="font-semibold text-sm">
              Bookings for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </h4>
            {dayBookings.map((booking) => (
              <Card
                key={booking.id}
                className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onBookingClick(booking)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{booking.time}</span>
                    <span className="text-sm">{booking.customer.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {booking.guests} guests
                    </span>
                  </div>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    booking.status === 'CONFIRMED' && "bg-green-500",
                    booking.status === 'PENDING' && "bg-yellow-500",
                    booking.status === 'CANCELLED' && "bg-red-500"
                  )} />
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-neutral-600">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-neutral-600">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-neutral-600">Cancelled</span>
          </div>
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {format(weekDates[0], 'MMM d')} - {format(weekDates[6], 'MMM d, yyyy')}
        </h3>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date) => {
          const dayBookings = getBookingsForDate(date);
          const isToday = date.toDateString() === new Date().toDateString();
          
          return (
            <Card
              key={date.toISOString()}
              className={cn(
                'p-3 min-h-[120px]',
                isToday && 'ring-2 ring-primary'
              )}
            >
              <div className="font-semibold text-sm mb-2">
                {format(date, 'EEE d')}
              </div>
              <div className="space-y-1">
                {dayBookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => onBookingClick(booking)}
                    className={cn(
                      'w-full text-left px-2 py-1 rounded text-xs transition-colors',
                      getStatusColor(booking.status),
                      'text-white hover:opacity-80'
                    )}
                  >
                    <div className="font-medium">{booking.time}</div>
                    <div className="truncate">{booking.customer.name}</div>
                    <div>{booking.guests} guests</div>
                  </button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  // Render day view
  const renderDayView = () => {
    const dayBookings = getBookingsForDate(selectedDate);
    const sortedBookings = [...dayBookings].sort((a, b) => 
      a.time.localeCompare(b.time)
    );

    return (
      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <p className="text-sm text-neutral-600 mt-1">
            {sortedBookings.length} booking{sortedBookings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="space-y-2">
          {sortedBookings.length === 0 ? (
            <Card className="p-8 text-center bg-card">
              <p className="text-muted-foreground">No bookings for this day</p>
            </Card>
          ) : (
            sortedBookings.map((booking) => (
              <Card
                key={booking.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onBookingClick(booking)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-semibold">{booking.time}</span>
                      <Badge variant={getStatusBadgeVariant(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="font-medium">{booking.customer.name}</div>
                      <div className="text-muted-foreground">
                        {booking.customer.email}
                      </div>
                      <div className="text-muted-foreground">
                        {booking.customer.phone}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
                      {booking.guests}
                    </div>
                    <div className="text-xs text-muted-foreground">guests</div>
                    {booking.table && (
                      <div className="mt-2 text-sm font-medium">
                        Table {booking.table.number}
                      </div>
                    )}
                  </div>
                </div>
                {booking.specialRequests && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Special Requests
                    </div>
                    <div className="text-sm">{booking.specialRequests}</div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <Tabs value={view} onValueChange={(v) => handleViewChange(v as 'month' | 'week' | 'day')}>
        <TabsList className="grid w-full max-w-[300px] grid-cols-3">
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="day">Day</TabsTrigger>
        </TabsList>

        <TabsContent value="month" className="mt-4">
          {renderMonthView()}
        </TabsContent>

        <TabsContent value="week" className="mt-4">
          {renderWeekView()}
        </TabsContent>

        <TabsContent value="day" className="mt-4">
          {renderDayView()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
