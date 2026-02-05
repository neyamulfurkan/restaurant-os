// src/validations/settings.ts

import { z } from 'zod';

export const galleryItemSchema = z.object({
  url: z.string(),
  caption: z.string().optional(),
  order: z.number().optional(),
}).passthrough();

export const aboutContentSchema = z.object({
  story: z.string().optional(),
  mission: z.string().optional(),
  values: z.string().optional(),
});

export const settingsSchema = z.object({
  // Gallery & About
  galleryImages: z.union([z.array(galleryItemSchema), z.string()]).optional().nullable().transform((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    }
    return val;
  }),
  aboutStory: z.string().optional().nullable(),
  aboutMission: z.string().optional().nullable(),
  aboutValues: z.string().optional().nullable(),
  
  // Existing fields
  restaurantName: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  heroImageUrl: z.string().nullable().optional(),
  heroMediaType: z.enum(['image', 'video', 'slideshow']).optional(),
  heroVideoUrl: z.string().nullable().optional(),
  heroImages: z.union([z.array(z.string()), z.string()]).optional().transform((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    }
    return val || [];
  }),
  heroSlideshowEnabled: z.boolean().optional(),
  heroSlideshowInterval: z.union([z.number(), z.string()]).optional().nullable().transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseInt(val);
      return isNaN(parsed) ? 5000 : parsed;
    }
    return val || 5000;
  }),
  floorPlanImageUrl: z.string().nullable().optional(),
  description: z.string().optional().nullable(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  operatingHours: z.union([
    z.record(
      z.object({
        open: z.string(),
        close: z.string(),
        closed: z.boolean().optional(),
      })
    ),
    z.string()
  ]).optional().transform((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return {};
      }
    }
    return val;
  }),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  pageBgColor: z.string().optional(),
  bodyColor: z.string().optional(),
  bodyTextColor: z.string().optional(),
  footerBgColor: z.string().optional(),
  footerTextColor: z.string().optional(),
  fontFamily: z.string().optional(),
  headerBgColor: z.string().optional(),
  headerTextColor: z.string().optional(),
  headerTransparentOverMedia: z.boolean().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  serviceFee: z.number().min(0).optional(),
  minOrderValue: z.number().min(0).optional(),
  enableDineIn: z.boolean().optional(),
  enablePickup: z.boolean().optional(),
  enableDelivery: z.boolean().optional(),
  enableGuestCheckout: z.boolean().optional(),
  autoConfirmBookings: z.boolean().optional(),
  maxGuestsPerBooking: z.number().optional(),
  bookingTimeSlotInterval: z.number().optional(),
  bookingBufferTime: z.number().optional(),
  noShowDepositEnabled: z.boolean().optional(),
  noShowDepositAmount: z.number().min(0).optional(),
  reminderTiming: z.number().optional(),
  bookingDepositAmount: z.number().min(0).optional(),
  stripePublishableKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  paypalClientId: z.string().optional(),
  paypalClientSecret: z.string().optional(),
  squareAccessToken: z.string().optional(),
  cashOnDeliveryEnabled: z.boolean().optional(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioPhoneNumber: z.string().optional(),
  sendgridApiKey: z.string().optional(),
  sendgridFromEmail: z.string().optional(),
  kitchenPrinterIp: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  googleMapsApiKey: z.string().optional(),
  googleAnalyticsId: z.string().optional(),
  groqApiKey: z.string().optional().nullable(),
  enableAiFeatures: z.boolean().optional(),
}).passthrough();