// src/components/customer/BookingCalendar.tsx

'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// ============= TYPES =============

interface AvailabilityData {
  date: string; // ISO date string (YYYY-MM-DD)
  hasAvailability: boolean;
  isFullyBooked: boolean;
}

interface BookingCalendarProps {
  onDateSelect: (date: Date) => void;
  selectedDate?: Date;
  className?: string;
}

// ============= COMPONENT =============

export function BookingCalendar({
  onDateSelect,
  selectedDate,
  className,
}: BookingCalendarProps) {
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [month, setMonth] = useState<Date>(new Date());

  // Fetch availability data for the current month
  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoading(true);
      try {
        // Calculate first and last day of the month
        const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
        const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        // Fetch availability for each day in the month
        const availabilityPromises: Promise<AvailabilityData>[] = [];
        
        // Get today's date at midnight for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Batch requests - max 5 concurrent
        const BATCH_SIZE = 5;
        const dates: Date[] = [];
        
        for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
          const currentDate = new Date(d);
          currentDate.setHours(0, 0, 0, 0);
          
          if (currentDate >= today) {
            dates.push(new Date(d));
          }
        }

        // Process in batches
        const results: AvailabilityData[] = [];
        for (let i = 0; i < dates.length; i += BATCH_SIZE) {
          const batch = dates.slice(i, i + BATCH_SIZE);
          const batchPromises = batch.map(d => {
            const dateStr = formatDateToISO(d);
            return fetch(`/api/bookings/availability?date=${dateStr}&guests=1`)
              .then(res => res.json())
              .then(data => {
                const slots = data.slots || [];
                const availableSlots = slots.filter((slot: any) => slot.available === true);
                return {
                  date: dateStr,
                  hasAvailability: data.success && availableSlots.length > 0,
                  isFullyBooked: data.success && slots.length > 0 && availableSlots.length === 0,
                };
              })
              .catch(() => ({
                date: dateStr,
                hasAvailability: false,
                isFullyBooked: false,
              }));
          });
          
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
        }

        setAvailabilityData(results);
      } catch (error) {
        console.error('Error fetching availability:', error);
        setAvailabilityData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [month]);

  // Get availability status for a specific date
  const getAvailabilityForDate = (date: Date): AvailabilityData | undefined => {
    const dateString = formatDateToISO(date);
    return availabilityData.find((item) => item.date === dateString);
  };

  // Format date to ISO string (YYYY-MM-DD) in UTC
  const formatDateToISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if date is in the past
  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Custom modifiers for styling
  const modifiers = {
    available: (date: Date) => {
      const availability = getAvailabilityForDate(date);
      return !!(availability?.hasAvailability && !availability.isFullyBooked && !isPastDate(date));
    },
    fullyBooked: (date: Date) => {
      const availability = getAvailabilityForDate(date);
      return !!(availability?.isFullyBooked === true && !isPastDate(date));
    },
  };

  const modifiersClassNames = {
    available: 'after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-success-500',
    fullyBooked: 'after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-error-500',
  };

  // Helper: Check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    // Don't allow selection of past dates
    if (isPastDate(date)) return;

    onDateSelect(date);
  };

  // Handle month change
  const handleMonthChange = (newMonth: Date) => {
    setMonth(newMonth);
  };

  return (
    <div className={cn('w-full max-w-md mx-auto', className)}>
      {/* Calendar */}
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleDateSelect}
        onMonthChange={handleMonthChange}
        disabled={(date) => isPastDate(date)}
        modifiers={{
          today: new Date(),
          ...modifiers,
        }}
        modifiersClassNames={{
          today: 'font-semibold',
          ...modifiersClassNames,
        }}
        className="rounded-xl border-2 border-primary shadow-lg p-6 bg-card text-foreground"
      />

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success-500" />
          <span className="text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-error-500" />
          <span className="text-muted-foreground">Fully Booked</span>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 backdrop-blur-sm rounded-lg flex items-center justify-center bg-background/10">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-neutral-200 border-t-primary" />
            <span className="text-sm text-muted-foreground">Loading availability...</span>
          </div>
        </div>
      )}
    </div>
  );
}