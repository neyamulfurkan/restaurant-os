// src/store/settingsStore.ts

import { create } from 'zustand';

interface BrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pageBgColor: string;
  bodyColor: string;
  bodyTextColor: string;
  headerBgColor: string;
  headerTextColor: string;
  headerTransparentOverMedia: boolean;
  footerBgColor: string;
  footerTextColor: string;
  fontFamily: string;
  heroImageUrl?: string | null;
  heroMediaType?: string;
  heroVideoUrl?: string | null;
  heroImages?: string[];
  heroSlideshowEnabled?: boolean;
  heroSlideshowInterval?: number;
}

interface RestaurantData {
  id?: string;
  name?: string;
  restaurantName?: string;
  slug?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  heroMediaType?: string;
  heroVideoUrl?: string | null;
  heroImages?: string[];
  heroSlideshowEnabled?: boolean;
  heroSlideshowInterval?: number;
  description?: string | null;
  timezone?: string;
  currency?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  pageBgColor?: string;
  bodyColor?: string;
  bodyTextColor?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  headerTransparentOverMedia?: boolean;
  footerBgColor?: string;
  footerTextColor?: string;
  fontFamily?: string;
  operatingHours?: Record<string, { open: string; close: string; closed?: boolean }> | null;
  taxRate?: number;
  serviceFee?: number;
  minOrderValue?: number;
  enableDineIn?: boolean;
  enablePickup?: boolean;
  enableDelivery?: boolean;
  enableGuestCheckout?: boolean;
  autoConfirmBookings?: boolean;
  bookingDepositAmount?: number;
  groqApiKey?: string | null;
  enableAiFeatures?: boolean;
  galleryImages?: any;
  showGalleryOnHome?: boolean;
  galleryCategories?: string[];
  aboutStory?: string | null;
  aboutMission?: string | null;
  aboutValues?: string | null;
  aboutStoryImage?: string | null;
  aboutMissionImage?: string | null;
  aboutValuesImage?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SettingsState {
  // Restaurant info
  restaurantId: string | null;
  restaurantName: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  description: string | null;
  
  // Branding
  branding: BrandingSettings;
  
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
  
  // AI Settings
  groqApiKey?: string | null;
  enableAiFeatures: boolean;
  
  // Gallery & About
  galleryImages: any;
  showGalleryOnHome: boolean;
  galleryCategories: string[];
  aboutStory: string | null;
  aboutMission: string | null;
  aboutValues: string | null;
  aboutStoryImage: string | null;
  aboutMissionImage: string | null;
  aboutValuesImage: string | null;
  
  // Operating hours
  operatingHours: Record<string, { open: string; close: string; closed?: boolean }> | null;
  
  // Loading state
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  
  // Actions
  setSettings: (settings: Partial<RestaurantData>) => void;
  updateBranding: (branding: Partial<BrandingSettings>) => void;
  loadSettings: () => Promise<void>;
  reset: () => void;
}

const DEFAULT_BRANDING: BrandingSettings = {
  primaryColor: '#0ea5e9',
  secondaryColor: '#f5f5f5',
  accentColor: '#ef4444',
  pageBgColor: '#f5f5f5',
  bodyColor: '#ffffff',
  bodyTextColor: '#171717',
  headerBgColor: '#ffffff',
  headerTextColor: '#171717',
  headerTransparentOverMedia: false,
  footerBgColor: '#171717',
  footerTextColor: '#fafafa',
  fontFamily: 'Inter',
  heroImageUrl: null,
  heroMediaType: 'image',
  heroVideoUrl: null,
  heroImages: [],
  heroSlideshowEnabled: false,
  heroSlideshowInterval: 5000,
};

const initialState = {
  restaurantId: null,
  restaurantName: 'RestaurantOS',
  logoUrl: null,
  heroImageUrl: null,
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  description: null,
  branding: DEFAULT_BRANDING,
  timezone: 'UTC',
  currency: 'USD',
  taxRate: 0,
  serviceFee: 0,
  minOrderValue: 0,
  enableDineIn: true,
  enablePickup: true,
  enableDelivery: true,
  enableGuestCheckout: true,
  autoConfirmBookings: false,
  bookingDepositAmount: 0,
  groqApiKey: null,
  enableAiFeatures: false,
  galleryImages: [],
  showGalleryOnHome: true,
  galleryCategories: ['All', 'Food', 'Ambiance', 'Events'],
  aboutStory: null,
  aboutMission: null,
  aboutValues: null,
  aboutStoryImage: null,
  aboutMissionImage: null,
  aboutValuesImage: null,
  operatingHours: null,
  isLoading: false,
  isLoaded: false,
  error: null,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initialState,
  
  setSettings: (settings: Partial<RestaurantData>) => {
    const restaurantName = settings.restaurantName || settings.name;
    set((state) => ({
      ...state,
      restaurantName,
      restaurantId: settings.id || state.restaurantId,
      email: settings.email || state.email,
      phone: settings.phone || state.phone,
      address: settings.address || state.address,
      city: settings.city || state.city,
      state: settings.state || state.state,
      zipCode: settings.zipCode || state.zipCode,
      country: settings.country || state.country,
      description: settings.description !== undefined ? settings.description : state.description,
      logoUrl: settings.logoUrl !== undefined ? settings.logoUrl : state.logoUrl,
      heroImageUrl: settings.heroImageUrl !== undefined ? settings.heroImageUrl : state.heroImageUrl,
      timezone: settings.timezone || state.timezone,
      currency: settings.currency || state.currency,
      taxRate: settings.taxRate !== undefined ? settings.taxRate : state.taxRate,
      serviceFee: settings.serviceFee !== undefined ? settings.serviceFee : state.serviceFee,
      minOrderValue: settings.minOrderValue !== undefined ? settings.minOrderValue : state.minOrderValue,
      enableDineIn: settings.enableDineIn !== undefined ? settings.enableDineIn : state.enableDineIn,
      enablePickup: settings.enablePickup !== undefined ? settings.enablePickup : state.enablePickup,
      enableDelivery: settings.enableDelivery !== undefined ? settings.enableDelivery : state.enableDelivery,
      enableGuestCheckout: settings.enableGuestCheckout !== undefined ? settings.enableGuestCheckout : state.enableGuestCheckout,
      autoConfirmBookings: settings.autoConfirmBookings !== undefined ? settings.autoConfirmBookings : state.autoConfirmBookings,
      bookingDepositAmount: settings.bookingDepositAmount !== undefined ? settings.bookingDepositAmount : state.bookingDepositAmount,
      groqApiKey: settings.groqApiKey !== undefined ? settings.groqApiKey : state.groqApiKey,
      enableAiFeatures: settings.enableAiFeatures !== undefined ? settings.enableAiFeatures : state.enableAiFeatures,
      galleryImages: settings.galleryImages !== undefined ? settings.galleryImages : state.galleryImages,
      showGalleryOnHome: settings.showGalleryOnHome !== undefined ? settings.showGalleryOnHome : state.showGalleryOnHome,
      galleryCategories: settings.galleryCategories !== undefined ? settings.galleryCategories : state.galleryCategories,
      aboutStory: settings.aboutStory !== undefined ? settings.aboutStory : state.aboutStory,
      aboutMission: settings.aboutMission !== undefined ? settings.aboutMission : state.aboutMission,
      aboutValues: settings.aboutValues !== undefined ? settings.aboutValues : state.aboutValues,
      aboutStoryImage: settings.aboutStoryImage !== undefined ? settings.aboutStoryImage : state.aboutStoryImage,
      aboutMissionImage: settings.aboutMissionImage !== undefined ? settings.aboutMissionImage : state.aboutMissionImage,
      aboutValuesImage: settings.aboutValuesImage !== undefined ? settings.aboutValuesImage : state.aboutValuesImage,
      operatingHours: settings.operatingHours 
        ? (settings.operatingHours as Record<string, { open: string; close: string; closed?: boolean }>) 
        : state.operatingHours,
      branding: {
        primaryColor: settings.primaryColor || state.branding.primaryColor,
        secondaryColor: settings.secondaryColor || state.branding.secondaryColor,
        accentColor: settings.accentColor || state.branding.accentColor,
        pageBgColor: settings.pageBgColor || state.branding.pageBgColor,
        bodyColor: settings.bodyColor || state.branding.bodyColor,
        bodyTextColor: settings.bodyTextColor || state.branding.bodyTextColor,
        headerBgColor: settings.headerBgColor || state.branding.headerBgColor,
        headerTextColor: settings.headerTextColor || state.branding.headerTextColor,
        headerTransparentOverMedia: settings.headerTransparentOverMedia !== undefined ? settings.headerTransparentOverMedia : state.branding.headerTransparentOverMedia,
        footerBgColor: settings.footerBgColor || state.branding.footerBgColor,
        footerTextColor: settings.footerTextColor || state.branding.footerTextColor,
        fontFamily: settings.fontFamily || state.branding.fontFamily,
        heroImageUrl: settings.heroImageUrl !== undefined ? settings.heroImageUrl : state.branding.heroImageUrl,
        heroMediaType: settings.heroMediaType || state.branding.heroMediaType,
        heroVideoUrl: settings.heroVideoUrl !== undefined ? settings.heroVideoUrl : state.branding.heroVideoUrl,
        heroImages: settings.heroImages || state.branding.heroImages,
        heroSlideshowEnabled: settings.heroSlideshowEnabled !== undefined ? settings.heroSlideshowEnabled : state.branding.heroSlideshowEnabled,
        heroSlideshowInterval: settings.heroSlideshowInterval || state.branding.heroSlideshowInterval,
      },
    }));
    
    // Update CSS variables for theming
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      
      // Convert hex to HSL for Tailwind (shadcn/ui format)
      const hexToHsl = (hex: string): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return '0 0% 0%';
        
        const r = parseInt(result[1], 16) / 255;
        const g = parseInt(result[2], 16) / 255;
        const b = parseInt(result[3], 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        
        h = Math.round(h * 360);
        s = Math.round(s * 100);
        l = Math.round(l * 100);
        
        return `${h} ${s}% ${l}%`;
      };
      
      if (settings.primaryColor) {
        root.style.setProperty('--primary', hexToHsl(settings.primaryColor));
      }
      if (settings.secondaryColor) {
        root.style.setProperty('--secondary', hexToHsl(settings.secondaryColor));
      }
      if (settings.accentColor) {
        root.style.setProperty('--accent', hexToHsl(settings.accentColor));
      }
      if (settings.pageBgColor) {
        root.style.setProperty('--page-bg', hexToHsl(settings.pageBgColor));
      }
      if (settings.bodyColor) {
        root.style.setProperty('--background', hexToHsl(settings.bodyColor));
        root.style.setProperty('--card', hexToHsl(settings.bodyColor));
      }
      if (settings.bodyTextColor) {
        root.style.setProperty('--foreground', hexToHsl(settings.bodyTextColor));
        root.style.setProperty('--card-foreground', hexToHsl(settings.bodyTextColor));
        root.style.setProperty('--popover-foreground', hexToHsl(settings.bodyTextColor));
        root.style.setProperty('--muted-foreground', hexToHsl(settings.bodyTextColor));
        // Apply to body element
        document.body.style.color = settings.bodyTextColor;
      }
      if (settings.headerBgColor) {
        root.style.setProperty('--header-bg', hexToHsl(settings.headerBgColor));
      }
      if (settings.headerTextColor) {
        root.style.setProperty('--header-text', hexToHsl(settings.headerTextColor));
      }
      if (settings.footerBgColor) {
        root.style.setProperty('--footer-bg', hexToHsl(settings.footerBgColor));
      }
      if (settings.footerTextColor) {
        root.style.setProperty('--footer-text', hexToHsl(settings.footerTextColor));
      }
      if (settings.fontFamily) {
        root.style.setProperty('--font-body', `'${settings.fontFamily}', sans-serif`);
        root.style.setProperty('--font-heading', `'${settings.fontFamily}', sans-serif`);
      }
      
      // Save to localStorage
      try {
        localStorage.setItem('restaurant-settings', JSON.stringify(get()));
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }
    }
  },
  
  updateBranding: (branding: Partial<BrandingSettings>) => {
    set((state) => ({
      branding: {
        ...state.branding,
        ...branding,
      },
    }));
    
    // Update CSS variables
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      
      const hexToHsl = (hex: string): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return '0 0% 0%';
        
        const r = parseInt(result[1], 16) / 255;
        const g = parseInt(result[2], 16) / 255;
        const b = parseInt(result[3], 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        
        h = Math.round(h * 360);
        s = Math.round(s * 100);
        l = Math.round(l * 100);
        
        return `${h} ${s}% ${l}%`;
      };
      
      if (branding.primaryColor) {
        root.style.setProperty('--primary', hexToHsl(branding.primaryColor));
      }
      if (branding.secondaryColor) {
        root.style.setProperty('--secondary', hexToHsl(branding.secondaryColor));
      }
      if (branding.accentColor) {
        root.style.setProperty('--accent', hexToHsl(branding.accentColor));
      }
      if (branding.pageBgColor) {
        root.style.setProperty('--page-bg', hexToHsl(branding.pageBgColor));
      }
      if (branding.bodyColor) {
        root.style.setProperty('--background', hexToHsl(branding.bodyColor));
        root.style.setProperty('--card', hexToHsl(branding.bodyColor));
      }
      if (branding.bodyTextColor) {
        root.style.setProperty('--foreground', hexToHsl(branding.bodyTextColor));
        root.style.setProperty('--card-foreground', hexToHsl(branding.bodyTextColor));
        root.style.setProperty('--popover-foreground', hexToHsl(branding.bodyTextColor));
        root.style.setProperty('--muted-foreground', hexToHsl(branding.bodyTextColor));
        // Apply to body element
        document.body.style.color = branding.bodyTextColor;
      }
      if (branding.footerBgColor) {
        root.style.setProperty('--footer-bg', hexToHsl(branding.footerBgColor));
      }
      if (branding.footerTextColor) {
        root.style.setProperty('--footer-text', hexToHsl(branding.footerTextColor));
      }
      if (branding.fontFamily) {
        root.style.setProperty('--font-body', `'${branding.fontFamily}', sans-serif`);
        root.style.setProperty('--font-heading', `'${branding.fontFamily}', sans-serif`);
      }
    }
  },
  
  loadSettings: async () => {
    // Prevent multiple simultaneous loads
    if (get().isLoading) {
      return;
    }
    
    // INSTANT: Try loading from localStorage first (no API wait)
    try {
      const cached = localStorage.getItem('restaurant-settings');
      if (cached) {
        const cachedData = JSON.parse(cached);
        if (cachedData.branding) {
          get().setSettings(cachedData);
          set({ isLoaded: true });
          // Continue loading from API in background to get fresh data
        }
      }
    } catch (e) {
      console.log('No cached settings available');
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/settings', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Settings API error:', response.status, errorText);
        throw new Error(`Failed to load settings: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        get().setSettings(data.data);
        set({ isLoaded: true, isLoading: false });
        
        // Force apply CSS variables immediately after loading
        if (typeof window !== 'undefined') {
          const root = document.documentElement;
          const hexToHsl = (hex: string): string => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (!result) return '0 0% 0%';
            
            const r = parseInt(result[1], 16) / 255;
            const g = parseInt(result[2], 16) / 255;
            const b = parseInt(result[3], 16) / 255;
            
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h = 0, s = 0, l = (max + min) / 2;
            
            if (max !== min) {
              const d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              
              switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
              }
            }
            
            h = Math.round(h * 360);
            s = Math.round(s * 100);
            l = Math.round(l * 100);
            
            return `${h} ${s}% ${l}%`;
          };
          
          const settings = data.data;
          if (settings.primaryColor) {
            root.style.setProperty('--primary', hexToHsl(settings.primaryColor));
          }
          if (settings.secondaryColor) {
            root.style.setProperty('--secondary', hexToHsl(settings.secondaryColor));
          }
          if (settings.accentColor) {
            root.style.setProperty('--accent', hexToHsl(settings.accentColor));
          }
          if (settings.pageBgColor) {
            root.style.setProperty('--page-bg', hexToHsl(settings.pageBgColor));
          }
          if (settings.bodyColor) {
            root.style.setProperty('--background', hexToHsl(settings.bodyColor));
            root.style.setProperty('--card', hexToHsl(settings.bodyColor));
          }
          if (settings.bodyTextColor) {
            root.style.setProperty('--foreground', hexToHsl(settings.bodyTextColor));
            root.style.setProperty('--card-foreground', hexToHsl(settings.bodyTextColor));
            root.style.setProperty('--popover-foreground', hexToHsl(settings.bodyTextColor));
            root.style.setProperty('--muted-foreground', hexToHsl(settings.bodyTextColor));
            // Apply to body element
            document.body.style.color = settings.bodyTextColor;
          }
          if (settings.footerBgColor) {
            root.style.setProperty('--footer-bg', hexToHsl(settings.footerBgColor));
          }
          if (settings.footerTextColor) {
            root.style.setProperty('--footer-text', hexToHsl(settings.footerTextColor));
          }
          if (settings.fontFamily) {
            root.style.setProperty('--font-body', `'${settings.fontFamily}', sans-serif`);
            root.style.setProperty('--font-heading', `'${settings.fontFamily}', sans-serif`);
          }
          
          // Save to localStorage
          try {
            localStorage.setItem('restaurant-settings', JSON.stringify(get()));
          } catch (e) {
            console.error('Failed to save to localStorage:', e);
          }
        }
      } else {
        throw new Error(data.error || 'Failed to load settings');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load settings';
      set({ 
        error: errorMessage, 
        isLoading: false,
        isLoaded: false,
      });
      console.error('Error loading settings:', error);
    }
  },
  
  reset: () => {
    set(initialState);
    
    // Reset CSS variables to defaults
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--primary', '199 89% 48%'); // Default blue
      root.style.setProperty('--secondary', '0 0% 96.1%'); // Default gray
      root.style.setProperty('--accent', '0 84% 60%'); // Default red
      root.style.setProperty('--font-body', "'Inter', sans-serif");
      root.style.setProperty('--font-heading', "'Inter', sans-serif");
    }
  },
}));