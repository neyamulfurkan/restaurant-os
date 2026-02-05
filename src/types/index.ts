// src/types/index.ts

import {
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  Booking,
  BookingStatus,
  Customer,
  Category,
  CustomizationGroup,
  CustomizationOption,
  Table as PrismaTable,
  Staff,
  StaffRole,
  Restaurant,
  Address,
  PromoCode,
  DeliveryZone,
  DemandForecast,
  Notification,
  NotificationType,
} from '@prisma/client';

// ============= RE-EXPORTS FROM PRISMA =============
export {
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  BookingStatus,
  StaffRole,
  NotificationType,
};

export type {
  MenuItem,
  Order,
  OrderItem,
  Booking,
  Customer,
  Category,
  CustomizationGroup,
  CustomizationOption,
  Staff,
  Restaurant,
  Address,
  PromoCode,
  DeliveryZone,
  DemandForecast,
  Notification,
  PrismaTable,
};

// Extended Table type with shape and size
export interface Table {
  id: string;
  number: string;
  capacity: number;
  isActive: boolean;
  positionX: number | null;
  positionY: number | null;
  shape: string;
  width: number;
  height: number;
  restaurantId: string;
}

// ============= EXTENDED PRISMA TYPES =============

// MenuItem with relations
export interface MenuItemWithRelations extends MenuItem {
  category: Category;
  customizationGroups: (CustomizationGroup & {
    options: CustomizationOption[];
  })[];
}

// Order with relations
export interface OrderWithRelations extends Order {
  customer: Customer;
  orderItems: (OrderItem & {
    menuItem: MenuItem;
  })[];
  deliveryAddress?: Address | null;
  promoCode?: PromoCode | null;
}

// Order response (extends OrderWithRelations with additional fields)
export interface OrderResponse extends OrderWithRelations {
  statusHistory: Array<{
    status: OrderStatus;
    createdAt: Date;
    note?: string;
  }>;
}

// Booking with relations
export interface BookingWithRelations extends Booking {
  customer: Customer;
  table?: Table | null;
}

// Customer with stats
export interface CustomerWithStats {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  isGuest: boolean;
  profileImage: string | null;
  preferredLanguage: string;
  marketingConsent: boolean;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
  orders?: Array<{
    id: string;
    orderNumber: string;
    type: OrderType;
    status: OrderStatus;
    totalAmount: number;
    createdAt: Date;
    orderItems: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      customizations: Record<string, unknown>;
    }>;
  }>;
  bookings?: Array<{
    id: string;
    bookingNumber: string;
    status: BookingStatus;
    date: Date;
    time: string;
    guests: number;
    createdAt: Date;
    table: { number: string } | null;
  }>;
  addresses?: Array<{
    id: string;
    label: string | null;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
    latitude: number | null;
    longitude: number | null;
  }>;
}

// ============= API REQUEST TYPES =============

// Menu
export interface CreateMenuItemRequest {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  categoryId: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  allergens?: string[];
  prepTime?: number;
  calories?: number;
  trackInventory?: boolean;
  stockQuantity?: number;
  minStockLevel?: number;
}

export interface UpdateMenuItemRequest extends Partial<CreateMenuItemRequest> {
  isAvailable?: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
}

// Orders
export interface OrderInput {
  type: OrderType;
  customerId: string;
  restaurantId: string;
  orderItems: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    customizations?: Record<string, unknown>;
    specialInstructions?: string;
  }>;
  tableNumber?: string;
  pickupTime?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  deliveryFee?: number;
  subtotal: number;
  taxAmount: number;
  serviceFee: number;
  tipAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  specialInstructions?: string;
}

export interface CartItem {
  id?: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  customizations?: Array<{
    groupName: string;
    optionName: string;
    price: number;
  }>;
  specialInstructions?: string;
}

export interface CreateOrderRequest {
  type: OrderType;
  customerId: string;
  restaurantId: string;
  items: CartItem[];
  tableNumber?: string;
  pickupTime?: string;
  deliveryAddressId?: string;
  specialInstructions?: string;
  paymentMethod: PaymentMethod;
  tipAmount?: number;
  promoCodeId?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  note?: string;
  updatedBy?: string;
}

// Bookings
export interface CreateBookingRequest {
  customerId: string;
  restaurantId?: string;
  date: string; // ISO date string
  time: string; // "HH:mm" format
  guests: number;
  specialRequests?: string;
}

export interface UpdateBookingRequest {
  status?: BookingStatus;
  tableId?: string;
  specialRequests?: string;
}

export interface CheckAvailabilityRequest {
  date: string;
  guests: number;
  restaurantId?: string;
}

// Authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

// Customer
export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  profileImage?: string;
  preferredLanguage?: string;
  marketingConsent?: boolean;
}

export interface CreateAddressRequest {
  label?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

// Staff
export interface CreateStaffRequest {
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
}

export interface UpdateStaffRequest {
  name?: string;
  phone?: string;
  role?: StaffRole;
  isActive?: boolean;
}

// Inventory
export interface UpdateInventoryRequest {
  menuItemId: string;
  adjustment: 'add' | 'remove' | 'set';
  quantity: number;
  reason?: string;
}

// Settings
export interface UpdateRestaurantSettingsRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  heroMediaType?: string;
  heroVideoUrl?: string;
  heroImages?: string[];
  heroSlideshowEnabled?: boolean;
  heroSlideshowInterval?: number;
  description?: string;
  timezone?: string;
  currency?: string;
  operatingHours?: Record<string, { open: string; close: string }>;
  taxRate?: number;
  serviceFee?: number;
  minOrderValue?: number;
  enableDineIn?: boolean;
  enablePickup?: boolean;
  enableDelivery?: boolean;
  enableGuestCheckout?: boolean;
  autoConfirmBookings?: boolean;
  bookingDepositAmount?: number;
}

export interface UpdateBrandingRequest {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
}

// Payments
export interface CreatePaymentIntentRequest {
  amount: number;
  currency?: string;
  orderId?: string;
}

export interface CapturePayPalOrderRequest {
  orderId: string;
  paypalOrderId: string;
}

// AI
export interface ForecastRequest {
  date: string;
  includeRecommendations?: boolean;
}

export interface UpsellRequest {
  cartItems: CartItem[];
  customerId?: string;
}

export interface OptimizeTablesRequest {
  date: string;
  bookings: Array<{
    id: string;
    guests: number;
    time: string;
  }>;
}

export interface ChatbotMessageRequest {
  sessionId: string;
  message: string;
  customerId?: string;
}

// Reports
export interface GenerateReportRequest {
  type: 'sales' | 'items' | 'customers' | 'tax' | 'waste';
  startDate: string;
  endDate: string;
  filters?: Record<string, unknown>;
}

// Notifications
export interface SendSMSRequest {
  to: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  message: string;
  html?: string;
  metadata?: Record<string, unknown>;
}

// ============= API RESPONSE TYPES =============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}



export interface AvailabilityResponse {
  date: string;
  availableSlots: Array<{
    time: string;
    available: boolean;
    remainingCapacity?: number;
  }>;
}

export interface ForecastResponse {
  date: string;
  predictedOrders: number;
  predictedRevenue: number;
  peakHourStart: string;
  peakHourEnd: string;
  recommendations: Array<{
    itemId: string;
    itemName: string;
    suggestedQuantity: number;
  }>;
  confidence: number;
}

export interface UpsellResponse {
  suggestions: Array<{
    menuItem: MenuItem;
    reason: string;
    confidence: number;
  }>;
}

export interface TableOptimizationResponse {
  assignments: Array<{
    bookingId: string;
    tableId: string;
    tableName: string;
    reason: string;
  }>;
  utilizationRate: number;
}

export interface ChatbotResponse {
  message: string;
  intent?: 'booking' | 'menu_inquiry' | 'order_status' | 'general';
  type?: 'text' | 'menu_items' | 'booking_success' | 'quick_replies';
  requiresInput?: boolean;
  bookingCreated?: boolean;
  bookingId?: string;
  data?: {
    menuItems?: MenuItemWithRelations[];
    bookingDetails?: {
      id: string;
      date: string;
      time: string;
      guests: number;
      bookingNumber: string;
    };
    quickReplies?: string[];
  };
}

export interface SalesReportData {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  salesByType: Array<{
    type: OrderType;
    amount: number;
    percentage: number;
  }>;
  salesTrend: Array<{
    date: string;
    sales: number;
    amount: number;
    orders: number;
  }>;
  topSellingItems: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface ItemPerformanceReportData {
  bestSellers: Array<{
    itemId: string;
    itemName: string;
    quantitySold: number;
    revenue: number;
    profitMargin?: number;
  }>;
  worstSellers: Array<{
    itemId: string;
    itemName: string;
    quantitySold: number;
    revenue: number;
  }>;
}

export interface CustomerInsightsReportData {
  totalCustomers: number;
  newCustomers: number;
  newCustomersPercentage: number;
  returningCustomers: number;
  returningCustomersPercentage: number;
  averageLifetimeValue: number;
  averageOrdersPerCustomer: number;
  peakOrderingHours: Array<{
    hour: number;
    orders: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalOrders: number;
    totalSpent: number;
  }>;
}

// ============= CONTACT MESSAGE TYPES =============

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface CreateContactMessageRequest {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  remainingCapacity?: number;
}

export interface OperatingHours {
  [day: string]: {
    open: string;
    close: string;
    closed?: boolean;
  };
}

export interface CartSummary {
  subtotal: number;
  taxAmount: number;
  serviceFee: number;
  deliveryFee: number;
  tipAmount: number;
  discountAmount: number;
  total: number;
}

export interface DashboardStats {
  todaySales: number;
  salesChange: number;
  activeOrders: number;
  todayBookings: number;
  popularItem: {
    name: string;
    imageUrl?: string;
    ordersCount: number;
  };
}

export interface NotificationTemplate {
  type: NotificationType;
  subject?: string;
  body: string;
  variables: string[];
}

export interface DeliveryZoneCheck {
  inZone: boolean;
  zoneName?: string;
  deliveryFee?: number;
  estimatedTime?: number;
  minOrderValue?: number;
}

// ============= FILTER TYPES =============

export interface OrderFilters {
  status?: OrderStatus;
  type?: OrderType;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  search?: string;
}

export interface BookingFilters {
  status?: BookingStatus;
  startDate?: string;
  endDate?: string;
  customerId?: string;
}

export interface MenuItemFilters {
  categoryId?: string;
  isAvailable?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  search?: string;
}

export interface CustomerFilters {
  search?: string;
  minTotalSpent?: number;
  maxTotalSpent?: number;
  minTotalOrders?: number;
  startDate?: string;
  endDate?: string;
}

// ============= SORT TYPES =============

export type SortOrder = 'asc' | 'desc';

export interface SortOptions {
  field: string;
  order: SortOrder;
}

// ============= VALIDATION ERROR TYPES =============

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationErrorResponse {
  success: false;
  error: string;
  details: ValidationError[];
}

// ============= GALLERY & ABOUT TYPES =============

export interface GalleryItem {
  url: string;
  caption?: string;
  category?: string;
  order?: number;
  isFeatured?: boolean; // NEW: Controls if image shows on homepage
}

export interface AboutContent {
  story?: string;
  mission?: string;
  values?: string;
  storyImage?: string;
  missionImage?: string;
  valuesImage?: string;
}

// ============= CHAT TYPES =============

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'menu_items' | 'booking_success' | 'quick_replies';
  data?: {
    menuItems?: MenuItemWithRelations[];
    bookingDetails?: {
      id: string;
      date: string;
      time: string;
      guests: number;
      bookingNumber: string;
    };
    quickReplies?: string[];
  };
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivityAt: Date;
}