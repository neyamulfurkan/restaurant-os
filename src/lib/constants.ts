// src/lib/constants.ts
// App-wide constants matching Prisma enums

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
} as const;

export const ORDER_TYPE = {
  DINE_IN: 'DINE_IN',
  PICKUP: 'PICKUP',
  DELIVERY: 'DELIVERY',
} as const;

export const PAYMENT_METHOD = {
  STRIPE: 'STRIPE',
  PAYPAL: 'PAYPAL',
  SQUARE: 'SQUARE',
  CASH: 'CASH',
  APPLE_PAY: 'APPLE_PAY',
  GOOGLE_PAY: 'GOOGLE_PAY',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
} as const;

export const STAFF_ROLE = {
  ADMIN: 'ADMIN',
  KITCHEN: 'KITCHEN',
  WAITER: 'WAITER',
} as const;

// Type exports for TypeScript
export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
export type OrderType = typeof ORDER_TYPE[keyof typeof ORDER_TYPE];
export type PaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];
export type StaffRole = typeof STAFF_ROLE[keyof typeof STAFF_ROLE];