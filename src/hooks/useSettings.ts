// src/hooks/useSettings.ts

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import type { UpdateRestaurantSettingsRequest, UpdateBrandingRequest } from '@/types';

interface UseSettingsReturn {
  // Restaurant info
  restaurantId: string | null;
  restaurantName: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  heroMediaType: string;
  heroVideoUrl: string | null;
  heroImages: string[];
  heroSlideshowSpeed: number;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  description: string | null;
  
  // Branding
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
  
  // Additional color settings
  pageBgColor: string;
  bodyColor: string;
  bodyTextColor: string;
  footerBgColor: string;
  footerTextColor: string;
  
  // Configuration
  timezone: string;
  currency: string;
  taxRate: number;
  serviceFee: number;
  minOrderValue: number;
  
  // Feature flags
  enableDineIn: boolean;
  enablePickup: boolean;
  enableDelivery: boolean;
  enableGuestCheckout: boolean;
  autoConfirmBookings: boolean;
  bookingDepositAmount: number;
  
  // Operating hours
  operatingHours: Record<string, { open: string; close: string; closed?: boolean }> | null;
  
  // State
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  
  // Actions
  updateSettings: (settings: UpdateRestaurantSettingsRequest) => Promise<void>;
  updateBranding: (branding: UpdateBrandingRequest) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

export function useSettings(autoLoad = true): UseSettingsReturn {
  const store = useSettingsStore();
  
  // Auto-load settings on mount if not already loaded
  useEffect(() => {
    if (autoLoad && !store.isLoaded && !store.isLoading) {
      store.loadSettings();
    }
  }, [autoLoad, store.isLoaded, store.isLoading, store]);
  
  /**
   * Update restaurant settings
   */
  const updateSettings = async (settings: UpdateRestaurantSettingsRequest): Promise<void> => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settings');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Update store with new settings
        store.setSettings(data.data);
      } else {
        throw new Error(data.error || 'Failed to update settings');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
      console.error('Error updating settings:', error);
      throw new Error(errorMessage);
    }
  };
  
  /**
   * Update branding settings
   */
  const updateBranding = async (branding: UpdateBrandingRequest): Promise<void> => {
    try {
      const response = await fetch('/api/settings/branding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(branding),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update branding');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Update store with new branding
        store.setSettings(data.data);
      } else {
        throw new Error(data.error || 'Failed to update branding');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update branding';
      console.error('Error updating branding:', error);
      throw new Error(errorMessage);
    }
  };
  
  /**
   * Refresh settings from server
   */
  const refreshSettings = async (): Promise<void> => {
    await store.loadSettings();
  };
  
  return {
    // Restaurant info
    restaurantId: store.restaurantId,
    restaurantName: store.restaurantName,
    logoUrl: store.logoUrl,
    heroImageUrl: store.heroImageUrl,
    heroMediaType: store.branding.heroMediaType || 'image',
    heroVideoUrl: store.branding.heroVideoUrl || null,
    heroImages: store.branding.heroImages || [],
    heroSlideshowSpeed: store.branding.heroSlideshowInterval || 5000,
    email: store.email,
    phone: store.phone,
    address: store.address,
    city: store.city,
    state: store.state,
    zipCode: store.zipCode,
    country: store.country,
    description: store.description,
    
    // Branding
    branding: store.branding,
    
    // Additional color settings (use defaults if not in store)
    pageBgColor: 'hsl(0, 0%, 98%)',
    bodyColor: 'hsl(0, 0%, 100%)',
    bodyTextColor: 'hsl(0, 0%, 0%)',
    footerBgColor: 'hsl(0, 0%, 13%)',
    footerTextColor: 'hsl(0, 0%, 100%)',
    
    // Configuration
    timezone: store.timezone,
    currency: store.currency,
    taxRate: store.taxRate,
    serviceFee: store.serviceFee,
    minOrderValue: store.minOrderValue,
    
    // Feature flags
    enableDineIn: store.enableDineIn,
    enablePickup: store.enablePickup,
    enableDelivery: store.enableDelivery,
    enableGuestCheckout: store.enableGuestCheckout,
    autoConfirmBookings: store.autoConfirmBookings,
    bookingDepositAmount: store.bookingDepositAmount,
    
    // Operating hours
    operatingHours: store.operatingHours,
    
    // State
    isLoading: store.isLoading,
    isLoaded: store.isLoaded,
    error: store.error,
    
    // Actions
    updateSettings,
    updateBranding,
    refreshSettings,
  };
}