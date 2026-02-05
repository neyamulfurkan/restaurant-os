// API Request/Response Types

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Restaurant Settings
export interface UpdateRestaurantSettingsRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  description?: string;
  timezone?: string;
  currency?: string;
  taxRate?: number;
  serviceFee?: number;
  minOrderValue?: number;
  enableDineIn?: boolean;
  enablePickup?: boolean;
  enableDelivery?: boolean;
  enableGuestCheckout?: boolean;
  autoConfirmBookings?: boolean;
  bookingDepositAmount?: number;
  operatingHours?: Record<string, { open: string; close: string; closed?: boolean }>;
}

export interface UpdateBrandingRequest {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  heroImageUrl?: string;
}