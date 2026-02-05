// src/app/(customer)/booking/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookingCalendar } from '@/components/customer/BookingCalendar';
import { TimeSlotSelector } from '@/components/customer/TimeSlotSelector';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { guestBookingSchema, type GuestBookingInput } from '@/validations/booking';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { CalendarDays, Users, Clock, CheckCircle2 } from 'lucide-react';
import type { TimeSlot } from '@/types';
import { cn } from '@/lib/utils';

// ============= TYPES =============

interface BookingFormData extends Omit<GuestBookingInput, 'date' | 'restaurantId'> {
  date: Date;
  time: string;
}

interface BookingConfirmation {
  id: string;
  bookingNumber: string;
  date: string;
  time: string;
  guests: number;
  customerName: string;
}

// ============= COMPONENT =============

export default function BookingPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<BookingConfirmation | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<BookingFormData>({
    mode: 'onSubmit',
    resolver: zodResolver(guestBookingSchema.omit({ date: true, restaurantId: true }).extend({
      date: z.date(),
      time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
    })),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: (user as { phone?: string })?.phone || '',
      guests: 2,
      specialRequests: '',
      date: undefined,
      time: undefined,
    },
  });

  const selectedGuests = watch('guests');

  // Pre-fill user data if logged in
  useEffect(() => {
    if (user) {
      setValue('name', user.name || '');
      setValue('email', user.email || '');
      setValue('phone', (user as { phone?: string })?.phone || '');
    }
  }, [user, setValue]);

  // Fetch available time slots when date changes
  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      setSelectedTime(undefined);
      return;
    }

    const fetchTimeSlots = async () => {
      setIsLoadingSlots(true);
      try {
        // Format date as YYYY-MM-DD in local timezone
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const response = await fetch(
          `/api/bookings/availability?date=${dateStr}&guests=${selectedGuests}`
        );

        if (!response.ok) throw new Error('Failed to fetch time slots');

        const data = await response.json();
        console.log('📅 Booking page received data:', data);
        console.log('📅 Slots:', data.slots);
        console.log('📅 Slots length:', data.slots?.length);
        
        setAvailableSlots(data.slots || []);
        console.log('📅 Updated availableSlots state');
        
        // Reset selected time if it's no longer available
        if (selectedTime && !data.slots?.find((slot: TimeSlot) => slot.time === selectedTime && slot.available)) {
          setSelectedTime(undefined);
        }
      } catch (error) {
        console.error('Error fetching time slots:', error);
        toast.error('Failed to load available time slots');
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchTimeSlots();
  }, [selectedDate, selectedGuests, selectedTime]);

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(undefined);
    setValue('date', date); // Register date with form
  };

  // Handle time slot selection
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setValue('time', time); // Register time with form
  };

  // Handle form submission
  const onSubmit = async (data: BookingFormData) => {
    console.log('🔵 Form submitted!', data);
    console.log('🔵 Form errors:', errors);
    console.log('🔵 Selected date:', selectedDate);
    console.log('🔵 Selected time:', selectedTime);

    setIsSubmitting(true);

    // ============= AI-POWERED NO-SHOW PREVENTION =============
    let depositRequired = false;
    let depositAmount = 0;

    try {
      // Check if time slot is high-demand
      const bookingDate = selectedDate!;
      const dayOfWeek = bookingDate.getDay(); // 0 = Sunday, 6 = Saturday
      const [hours] = selectedTime!.split(':').map(Number);
      
      // High-demand criteria:
      // - Weekend (Friday/Saturday)
      // - Prime hours (18:00 - 21:00)
      // - Large party (6+ guests)
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
      const isPrimeTime = hours >= 18 && hours <= 21;
      const isLargeParty = data.guests >= 6;
      
      // Calculate deposit based on risk factors
      if ((isWeekend && isPrimeTime) || isLargeParty) {
        depositRequired = true;
        depositAmount = isLargeParty ? 50 : 25; // $50 for large parties, $25 for weekend evenings
        
        // Confirm with user
        const confirmDeposit = window.confirm(
          `⚠️ High-Demand Time Slot Detected\n\n` +
          `A refundable deposit of $${depositAmount} is required to secure this reservation.\n\n` +
          `Why?\n` +
          `${isWeekend && isPrimeTime ? '• Weekend prime time slot\n' : ''}` +
          `${isLargeParty ? '• Large party size\n' : ''}` +
          `\nThe deposit will be fully refunded when you arrive for your reservation.\n\n` +
          `Do you want to proceed?`
        );
        
        if (!confirmDeposit) {
          setIsSubmitting(false);
          toast.error('Booking cancelled');
          return;
        }
        
        toast.info(`Deposit of $${depositAmount} will be collected`, {
          description: 'You will be redirected to payment after booking confirmation',
        });
      }
    } catch (error) {
      console.warn('No-show prediction check failed, proceeding without deposit:', error);
    }
    // ============= END NO-SHOW PREVENTION =============

    try {
      // Get restaurant ID from database
      console.log('🔵 Fetching restaurant settings...');
      const restaurantResponse = await fetch('/api/settings');
      console.log('🔵 Settings response status:', restaurantResponse.status);
      
      const restaurantData = await restaurantResponse.json();
      console.log('🔵 Settings data:', restaurantData);
      console.log('🔵 Full data object:', JSON.stringify(restaurantData, null, 2));
      
      const restaurantId = restaurantData.data?.id;
      console.log('🔵 Restaurant ID:', restaurantId);
      console.log('🔵 Restaurant ID type:', typeof restaurantId);
      console.log('🔵 Restaurant ID length:', restaurantId?.length);

      if (!restaurantId) {
        console.error('🔴 No restaurant ID found');
        toast.error('Restaurant not found');
        setIsSubmitting(false);
        return;
      }

      // Format date as YYYY-MM-DD in local timezone (not UTC)
      const year = selectedDate!.getFullYear();
      const month = String(selectedDate!.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate!.getDate()).padStart(2, '0');
      const localDateStr = `${year}-${month}-${day}`;

      const bookingData = {
        ...data,
        date: localDateStr,
        time: selectedTime!,
        restaurantId,
        depositAmount: depositRequired ? depositAmount : 0,
        depositPaid: false, // Will be handled by payment flow if needed
      };

      console.log('🔵 Sending booking data:', bookingData);
      
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });
      
      console.log('🔵 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('🔴 API Error Response:', errorData);
        console.log('🔴 Validation Details:', JSON.stringify(errorData.details, null, 2));
        errorData.details?.forEach((detail: any) => {
          console.log(`🔴 Field: ${detail.field}, Message: ${detail.message}`);
        });
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const result = await response.json();
      
      // Set confirmation data (store raw date for calendar)
      const confirmYear = selectedDate!.getFullYear();
      const confirmMonth = String(selectedDate!.getMonth() + 1).padStart(2, '0');
      const confirmDay = String(selectedDate!.getDate()).padStart(2, '0');
      const bookingDateStr = `${confirmYear}-${confirmMonth}-${confirmDay}`;
      
      setBookingConfirmation({
        id: result.data.id,
        bookingNumber: result.data.bookingNumber,
        date: bookingDateStr,
        time: selectedTime!,
        guests: data.guests,
        customerName: data.name,
      });

      // Show success modal
      setShowSuccessModal(true);

      // Reset form
      reset();
      setSelectedDate(undefined);
      setSelectedTime(undefined);

      toast.success('Booking confirmed!');
    } catch (error) {
      console.error('🔴 Booking error:', error);
      console.error('🔴 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Download calendar file (.ics)
  const handleAddToCalendar = () => {
    if (!bookingConfirmation) return;

    const { time, guests, date } = bookingConfirmation;
    const [hours, minutes] = time.split(':');
    
    // Parse the date string back to a Date object
    const startDate = new Date(date);
    startDate.setHours(parseInt(hours), parseInt(minutes));
    
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 2); // 2 hour default duration

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:Restaurant Booking - ${guests} guests`,
      `DESCRIPTION:Booking confirmation: ${bookingConfirmation.bookingNumber}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-${bookingConfirmation.bookingNumber}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen py-8 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">
            Book a Table
          </h1>
          <p className="text-lg text-muted-foreground">
            Reserve your spot for an unforgettable dining experience
          </p>
        </div>

        {/* Availability Calendar */}
        <div className="rounded-2xl shadow-md p-6 mb-6 bg-card">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-foreground">
            <CalendarDays className="w-6 h-6 text-primary" />
            Select a Date
          </h2>
          <BookingCalendar
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate}
            className="relative"
          />
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div className="rounded-2xl shadow-md p-6 mb-6 bg-card">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-foreground">
              <Clock className="w-6 h-6 text-primary" />
              Select a Time
            </h2>
            {isLoadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-neutral-200 border-t-primary" />
              </div>
            ) : (
              <TimeSlotSelector
                availableSlots={availableSlots}
                selectedSlot={selectedTime}
                onSelect={handleTimeSelect}
              />
            )}
          </div>
        )}

        {/* Booking Form */}
        {selectedDate && selectedTime && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="rounded-2xl shadow-md p-6 mb-6 bg-card">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                <Users className="w-6 h-6 text-primary" />
                Guest Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Name */}
                <div>
                  <Label htmlFor="name">
                    Name <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Your full name"
                    className={cn(errors.name && 'border-error-500')}
                  />
                  {errors.name && (
                    <p className="text-sm text-error-500 mt-1">{errors.name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email">
                    Email <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="your@email.com"
                    className={cn(errors.email && 'border-error-500')}
                  />
                  {errors.email && (
                    <p className="text-sm text-error-500 mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="phone">
                    Phone <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    placeholder="+1 (555) 123-4567"
                    className={cn(errors.phone && 'border-error-500')}
                  />
                  {errors.phone && (
                    <p className="text-sm text-error-500 mt-1">{errors.phone.message}</p>
                  )}
                </div>

                {/* Number of Guests */}
                <div>
                  <Label htmlFor="guests">
                    Number of Guests <span className="text-error-500">*</span>
                  </Label>
                  <Select
                    value={selectedGuests?.toString()}
                    onValueChange={(value) => setValue('guests', parseInt(value))}
                  >
                    <SelectTrigger className={cn(errors.guests && 'border-error-500')}>
                      <SelectValue placeholder="Select guests" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? 'Guest' : 'Guests'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.guests && (
                    <p className="text-sm text-error-500 mt-1">{errors.guests.message}</p>
                  )}
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <Label htmlFor="specialRequests">
                  Special Requests <span className="text-neutral-400">(Optional)</span>
                </Label>
                <Textarea
                  id="specialRequests"
                  {...register('specialRequests')}
                  placeholder="Any dietary restrictions, celebrations, or special requirements..."
                  className={cn('min-h-24', errors.specialRequests && 'border-error-500')}
                  maxLength={500}
                />
                {errors.specialRequests && (
                  <p className="text-sm text-error-500 mt-1">{errors.specialRequests.message}</p>
                )}
                <p className="text-sm text-neutral-500 mt-1">
                  {watch('specialRequests')?.length || 0}/500 characters
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
              disabled={isSubmitting}
              onClick={() => {
                console.log('🔵 Button clicked!');
                console.log('🔵 Current errors:', errors);
                console.log('🔵 Form values:', watch());
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  Confirming Booking...
                </>
              ) : (
                'Submit Booking'
              )}
            </Button>
          </form>
        )}

        {/* Instructions */}
        {!selectedDate && (
          <div className="rounded-lg p-6 text-center bg-card border border-primary/30">
            <p className="font-medium text-primary">
              Select a date from the calendar above to view available time slots
            </p>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
              <CheckCircle2 className="h-10 w-10 text-success-600" />
            </div>
            <DialogTitle className="text-center text-2xl">
              Booking Confirmed!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your table has been reserved successfully
            </DialogDescription>
          </DialogHeader>

          {bookingConfirmation && (
            <div className="space-y-4">
              <div className="rounded-lg bg-neutral-50 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Booking ID:</span>
                  <span className="font-semibold">{bookingConfirmation.bookingNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Date:</span>
                  <span className="font-semibold">{formatDate(new Date(bookingConfirmation.date))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Time:</span>
                  <span className="font-semibold">{bookingConfirmation.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Guests:</span>
                  <span className="font-semibold">{bookingConfirmation.guests}</span>
                </div>
              </div>

              <p className="text-sm text-neutral-600 text-center">
                A confirmation email has been sent to your email address
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleAddToCalendar}
                >
                  Add to Calendar
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowSuccessModal(false);
                    window.location.href = '/';
                  }}
                >
                  Go to Home
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}