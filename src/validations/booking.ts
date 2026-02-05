// src/validations/booking.ts

import { z } from 'zod';

/**
 * Validates time string format (HH:MM in 24-hour format)
 */
const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Schema for creating a new booking
 */
export const createBookingSchema = z.object({
  customerId: z.string().cuid('Invalid customer ID format'),
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  tableId: z.string().optional(),
  
  date: z.string()
    .refine(
      (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      },
      { message: 'Booking date must be today or in the future' }
    ),
  
  time: z
    .string()
    .regex(timeRegex, 'Time must be in HH:MM format (24-hour)')
    .refine(
      (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
      },
      { message: 'Invalid time value' }
    ),
  
  guests: z
    .number()
    .int('Number of guests must be a whole number')
    .min(1, 'At least 1 guest is required')
    .max(20, 'Maximum 20 guests allowed per booking'),
  
  duration: z
    .number()
    .int('Duration must be a whole number')
    .min(30, 'Minimum booking duration is 30 minutes')
    .max(480, 'Maximum booking duration is 8 hours')
    .default(120)
    .optional(),
  
  specialRequests: z
    .string()
    .max(500, 'Special requests must be 500 characters or less')
    .optional(),
  
  depositAmount: z
    .number()
    .min(0, 'Deposit amount cannot be negative')
    .default(0)
    .optional(),
});

/**
 * Schema for updating an existing booking
 */
export const updateBookingSchema = z.object({
  tableId: z.string().cuid('Invalid table ID format').optional(),
  
  date: z.coerce
    .date()
    .refine(
      (date) => date >= new Date(new Date().setHours(0, 0, 0, 0)),
      { message: 'Booking date must be today or in the future' }
    )
    .optional(),
  
  time: z
    .string()
    .regex(timeRegex, 'Time must be in HH:MM format (24-hour)')
    .optional(),
  
  guests: z
    .number()
    .int('Number of guests must be a whole number')
    .min(1, 'At least 1 guest is required')
    .max(20, 'Maximum 20 guests allowed per booking')
    .optional(),
  
  duration: z
    .number()
    .int('Duration must be a whole number')
    .min(30, 'Minimum booking duration is 30 minutes')
    .max(480, 'Maximum booking duration is 8 hours')
    .optional(),
  
  specialRequests: z
    .string()
    .max(500, 'Special requests must be 500 characters or less')
    .optional(),
  
  status: z
    .enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'] as const)
    .optional(),
  
  depositAmount: z
    .number()
    .min(0, 'Deposit amount cannot be negative')
    .optional(),
  
  depositPaid: z.boolean().optional(),
  
  depositIntentId: z.string().optional(),
});

/**
 * Schema for checking booking availability
 */
export const checkAvailabilitySchema = z.object({
  restaurantId: z.string().cuid('Invalid restaurant ID format').optional(),
  
  date: z.coerce
    .date()
    .refine(
      (date) => date >= new Date(new Date().setHours(0, 0, 0, 0)),
      { message: 'Date must be today or in the future' }
    ),
  
  guests: z
    .number()
    .int('Number of guests must be a whole number')
    .min(1, 'At least 1 guest is required')
    .max(20, 'Maximum 20 guests allowed per booking')
    .optional(),
  
  duration: z
    .number()
    .int('Duration must be a whole number')
    .min(30, 'Minimum booking duration is 30 minutes')
    .max(480, 'Maximum booking duration is 8 hours')
    .default(120)
    .optional(),
});

/**
 * Schema for guest checkout booking (customer info included)
 */
export const guestBookingSchema = z.object({
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  tableId: z.string().optional(),
  
  date: z.string()
    .refine(
      (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      },
      { message: 'Booking date must be today or in the future' }
    ),
  
  time: z
    .string()
    .regex(timeRegex, 'Time must be in HH:MM format (24-hour)')
    .refine(
      (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
      },
      { message: 'Invalid time value' }
    ),
  
  guests: z
    .number()
    .int('Number of guests must be a whole number')
    .min(1, 'At least 1 guest is required')
    .max(20, 'Maximum 20 guests allowed per booking'),
  
  duration: z
    .number()
    .int('Duration must be a whole number')
    .min(30, 'Minimum booking duration is 30 minutes')
    .max(480, 'Maximum booking duration is 8 hours')
    .default(120)
    .optional(),
  
  specialRequests: z
    .string()
    .max(500, 'Special requests must be 500 characters or less')
    .optional(),
  
  depositAmount: z
    .number()
    .min(0, 'Deposit amount cannot be negative')
    .default(0)
    .optional(),
    
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be 100 characters or less'),
  
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase(),
  
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 characters')
    .max(20, 'Phone number must be 20 characters or less')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Phone number can only contain numbers, spaces, and +-() characters'),
});

/**
 * Schema for canceling a booking
 */
export const cancelBookingSchema = z.object({
  reason: z
    .string()
    .min(10, 'Cancellation reason must be at least 10 characters')
    .max(500, 'Cancellation reason must be 500 characters or less')
    .optional(),
});

/**
 * Schema for confirming a booking (admin)
 */
export const confirmBookingSchema = z.object({
  tableId: z.string().cuid('Invalid table ID format').optional(),
  note: z
    .string()
    .max(500, 'Note must be 500 characters or less')
    .optional(),
});

/**
 * Schema for marking booking as no-show (admin)
 */
export const noShowBookingSchema = z.object({
  note: z
    .string()
    .max(500, 'Note must be 500 characters or less')
    .optional(),
});

// Type exports for TypeScript
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;
export type GuestBookingInput = z.infer<typeof guestBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>;
export type NoShowBookingInput = z.infer<typeof noShowBookingSchema>;