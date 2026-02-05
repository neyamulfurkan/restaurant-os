// src/validations/order.ts
import { z } from 'zod';
import { ORDER_TYPE, ORDER_STATUS, PAYMENT_METHOD } from '@/lib/constants';

// Customization schema for order items
const customizationSchema = z.object({
  groupName: z.string().min(1, 'Customization group name is required'),
  optionName: z.string().min(1, 'Customization option name is required'),
  price: z.number(),
});

// Order item schema
export const orderItemSchema = z.object({
  menuItemId: z.string().min(1, 'Menu item ID is required'),
  name: z.string().min(1, 'Item name is required'),
  price: z.number().positive('Price must be greater than 0'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  customizations: z.array(customizationSchema).optional(),
  specialInstructions: z.string().max(500, 'Special instructions must be under 500 characters').optional(),
});

// Address schema for delivery orders
export const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  country: z.string().min(1, 'Country is required'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// Main order schema
export const orderSchema = z.object({
  type: z.enum([ORDER_TYPE.DINE_IN, ORDER_TYPE.PICKUP, ORDER_TYPE.DELIVERY], {
    errorMap: () => ({ message: 'Invalid order type' }),
  }),
  customerId: z.string().min(1, 'Customer ID is required'),
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  
  // Type-specific fields
  tableNumber: z.string().optional(),
  pickupTime: z.string().optional(),
  deliveryAddressId: z.string().min(1).optional(),
  deliveryAddress: addressSchema.optional(),
  
  // Order items (will be transformed to orderItems in API)
  items: z.array(orderItemSchema).min(1, 'Order must contain at least one item').optional(),
  orderItems: z.array(orderItemSchema).min(1, 'Order must contain at least one item').optional(),
  
  // Pricing
  subtotal: z.number().nonnegative('Subtotal cannot be negative'),
  taxAmount: z.number().nonnegative('Tax amount cannot be negative'),
  serviceFee: z.number().nonnegative('Service fee cannot be negative').default(0),
  tipAmount: z.number().nonnegative('Tip amount cannot be negative').default(0),
  discountAmount: z.number().nonnegative('Discount amount cannot be negative').default(0),
  totalAmount: z.number().positive('Total amount must be greater than 0'),
  deliveryFee: z.number().nonnegative('Delivery fee cannot be negative').default(0),
  
  // Payment
  paymentMethod: z.enum([
    PAYMENT_METHOD.STRIPE,
    PAYMENT_METHOD.PAYPAL,
    PAYMENT_METHOD.SQUARE,
    PAYMENT_METHOD.CASH,
    PAYMENT_METHOD.APPLE_PAY,
    PAYMENT_METHOD.GOOGLE_PAY,
  ], {
    errorMap: () => ({ message: 'Invalid payment method' }),
  }),
  
  // Optional fields
  promoCodeId: z.string().min(1).optional(),
  specialInstructions: z.string().max(1000, 'Special instructions must be under 1000 characters').optional(),
})
.refine(
  (data) => {
    // Validate dine-in orders have table number
    if (data.type === ORDER_TYPE.DINE_IN && !data.tableNumber) {
      return false;
    }
    return true;
  },
  {
    message: 'Dine-in orders require a table number',
    path: ['tableNumber'],
  }
)
.refine(
  (data) => {
    // Validate pickup orders have pickup time
    if (data.type === ORDER_TYPE.PICKUP && !data.pickupTime) {
      return false;
    }
    return true;
  },
  {
    message: 'Pickup orders require a pickup time',
    path: ['pickupTime'],
  }
)
.refine(
  (data) => {
    // Validate delivery orders have address
    if (data.type === ORDER_TYPE.DELIVERY) {
      // Must have either deliveryAddressId OR complete deliveryAddress
      const hasAddressId = !!data.deliveryAddressId;
      const hasCompleteAddress = !!(
        data.deliveryAddress?.street &&
        data.deliveryAddress?.city &&
        data.deliveryAddress?.state &&
        data.deliveryAddress?.zipCode
      );
      return hasAddressId || hasCompleteAddress;
    }
    return true;
  },
  {
    message: 'Delivery orders require a complete delivery address',
    path: ['deliveryAddress'],
  }
)
.refine(
  (data) => {
    // Make items or orderItems required
    if (!data.items && !data.orderItems) {
      return false;
    }
    return true;
  },
  {
    message: 'Order must contain at least one item',
    path: ['items'],
  }
);

// Order status update schema
export const orderStatusUpdateSchema = z.object({
  status: z.enum([
    ORDER_STATUS.PENDING,
    ORDER_STATUS.ACCEPTED,
    ORDER_STATUS.PREPARING,
    ORDER_STATUS.READY,
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.REJECTED,
  ], {
    errorMap: () => ({ message: 'Invalid order status' }),
  }),
  note: z.string().max(500, 'Note must be under 500 characters').optional(),
});

// Order query params schema
export const orderQuerySchema = z.object({
  restaurantId: z.string().min(1),
  customerId: z.string().optional(),
  status: z.string().optional(), // Allow comma-separated status values
  type: z.enum([ORDER_TYPE.DINE_IN, ORDER_TYPE.PICKUP, ORDER_TYPE.DELIVERY]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Type exports
export type OrderInput = z.infer<typeof orderSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type OrderStatusUpdate = z.infer<typeof orderStatusUpdateSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;