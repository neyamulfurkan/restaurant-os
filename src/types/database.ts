// Database Types (from Prisma)
import type { Prisma } from '@prisma/client';

// Re-export Prisma types for convenience
export type {
  Restaurant,
  Category,
  MenuItem,
  Customer,
  Order,
  OrderItem,
  Booking,
  Staff,
  Table,
  Address,
  DeliveryZone,
  PromoCode,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  BookingStatus,
  StaffRole,
} from '@prisma/client';

// Extended types with relations
export type MenuItemWithCategory = Prisma.MenuItemGetPayload<{
  include: { category: true };
}>;

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    customer: true;
    orderItems: {
      include: {
        menuItem: true;
      };
    };
    deliveryAddress: true;
    promoCode: true;
  };
}>;

export type BookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    customer: true;
    table: true;
  };
}>;