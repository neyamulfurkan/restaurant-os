'use client';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import React, { useState, useEffect } from 'react';
import { Save, Loader2, X, Heart, Target, Award } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';

import { useState as useTablesState, useEffect as useTablesEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// QR Codes Management Component
function QRCodesManagement() {
  const [qrCodes, setQrCodes] = useState<{menu: string; table: Record<string, string>}>({ menu: '', table: {} });
  const [selectedTable, setSelectedTable] = useState('');
  const [tables, setTables] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      try {
        // Fetch tables
        const res = await fetch('/api/tables');
        const data = await res.json();
        if (isMounted) setTables(data.tables || []);

        // Generate menu QR
        const baseUrl = window.location.origin;
        const menuResponse = await fetch(`/api/qr/generate?url=${baseUrl}/menu`);
        const menuData = await menuResponse.json();
        
        if (isMounted) {
          setQrCodes({ menu: menuData.qrCode, table: {} });
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize QR codes:', error);
        if (isMounted) setIsLoading(false);
      }
    };

    init();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const generateTableQR = async (tableNumber: string) => {
    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`/api/qr/generate?url=${baseUrl}/menu&table=${tableNumber}`);
      const data = await response.json();
      
      setQrCodes(prev => ({
        ...prev,
        table: { ...prev.table, [tableNumber]: data.qrCode }
      }));
      setSelectedTable(tableNumber);
    } catch (error) {
      console.error('Failed to generate table QR:', error);
    }
  };

  const downloadQR = (qrCode: string, name: string) => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `${name}-qr-code.png`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Menu QR */}
      <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
        <h2 className="text-xl font-semibold mb-4">General Menu QR Code</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This QR code directs customers to your menu page
        </p>
        
        {qrCodes.menu && (
          <div className="flex flex-col items-center gap-4">
            <img src={qrCodes.menu} alt="Menu QR Code" className="w-64 h-64 border rounded-lg" />
            <Button onClick={() => downloadQR(qrCodes.menu, 'menu')}>
              Download QR Code
            </Button>
          </div>
        )}
      </div>

      {/* Table-Specific QR */}
      <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
        <h2 className="text-xl font-semibold mb-4">Table-Specific QR Codes</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Generate QR codes that pre-fill the table number for dine-in orders
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {tables.map(table => (
            <Button
              key={table.id}
              variant={selectedTable === table.number ? 'default' : 'outline'}
              onClick={() => generateTableQR(table.number)}
            >
              Table {table.number}
            </Button>
          ))}
        </div>

        {selectedTable && qrCodes.table[selectedTable] && (
          <div className="flex flex-col items-center gap-4 pt-4 border-t">
            <h3 className="font-semibold">Table {selectedTable} QR Code</h3>
            <img 
              src={qrCodes.table[selectedTable]} 
              alt={`Table ${selectedTable} QR`} 
              className="w-64 h-64 border rounded-lg" 
            />
            <Button onClick={() => downloadQR(qrCodes.table[selectedTable], `table-${selectedTable}`)}>
              Download QR Code
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Tables Management Component
function TablesManagement() {
  const [tables, setTables] = useTablesState<any[]>([]);
  const [isLoading, setIsLoading] = useTablesState(true);
  const [showDialog, setShowDialog] = useTablesState(false);
  const [editingTable, setEditingTable] = useTablesState<any>(null);
  const [formData, setFormData] = useTablesState({ 
    number: '', 
    capacity: 2, 
    isActive: true,
    shape: 'circle',
    width: 80,
    height: 80
  });
  const { toast } = useToast();

  useTablesEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/tables');
      const data = await res.json();
      setTables(data.tables || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load tables', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editingTable ? `/api/tables/${editingTable.id}` : '/api/tables';
      const method = editingTable ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error();
      
      toast({ title: 'Success', description: `Table ${editingTable ? 'updated' : 'created'} successfully` });
      setShowDialog(false);
      setEditingTable(null);
      setFormData({ number: '', capacity: 2, isActive: true, shape: 'circle', width: 80, height: 80 });
      fetchTables();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save table', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this table?')) return;
    
    try {
      await fetch(`/api/tables/${id}`, { method: 'DELETE' });
      toast({ title: 'Success', description: 'Table deleted' });
      fetchTables();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete table', variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Restaurant Tables</h2>
        <Button onClick={() => { setShowDialog(true); setEditingTable(null); setFormData({ number: '', capacity: 2, isActive: true, shape: 'circle', width: 80, height: 80 }); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Table
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No tables configured. Add your first table to enable bookings.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <div key={table.id} className="border rounded-lg p-4" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg">Table {table.number}</h3>
                  <p className="text-sm text-muted-foreground">Capacity: {table.capacity} guests</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs ${table.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {table.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => { setEditingTable(table); setFormData({ number: table.number, capacity: table.capacity, isActive: table.isActive, shape: table.shape || 'circle', width: table.width || 80, height: table.height || 80 }); setShowDialog(true); }}>
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(table.id)}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Edit Table' : 'Add New Table'}</DialogTitle>
            <DialogDescription>Configure restaurant table details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Table Number</label>
              <Input value={formData.number} onChange={(e) => setFormData({...formData, number: e.target.value})} placeholder="T1, A1, etc." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Capacity (guests)</label>
              <Input type="number" min="1" max="50" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Shape</label>
              <Select value={formData.shape} onValueChange={(value) => setFormData({...formData, shape: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="circle">Circle</SelectItem>
                  <SelectItem value="rectangle">Rectangle</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="oval">Oval</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Width (px)</label>
                <Input type="number" min="40" max="200" value={formData.width} onChange={(e) => setFormData({...formData, width: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Height (px)</label>
                <Input type="number" min="40" max="200" value={formData.height} onChange={(e) => setFormData({...formData, height: parseInt(e.target.value)})} />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="h-4 w-4" />
              <span className="text-sm font-medium">Active</span>
            </label>
            <Button onClick={handleSubmit} className="w-full">
              {editingTable ? 'Update Table' : 'Create Table'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
interface SettingsData {
  // General
  restaurantName: string;
  logoUrl: string | null;
  address: string;
  phone: string;
  email: string;
  operatingHours: {
    [key: string]: { open: string; close: string; closed: boolean };
  };
  timezone: string;
  currency: string;

  // Payment
  stripePublishableKey: string;
  stripeSecretKey: string;
  paypalClientId: string;
  paypalClientSecret: string;
  squareAccessToken: string;
  cashOnDeliveryEnabled: boolean;
  taxRate: number;
  serviceFee: number;

  // Ordering
  minOrderValue: number;
  enableDineIn: boolean;
  enablePickup: boolean;
  enableDelivery: boolean;
  enableGuestCheckout: boolean;

  // Booking
  autoConfirmBookings: boolean;
  maxGuestsPerBooking: number;
  bookingTimeSlotInterval: number;
  bookingBufferTime: number;
  noShowDepositEnabled: boolean;
  noShowDepositAmount: number;
  reminderTiming: number;

  // AI Settings
  groqApiKey?: string | null;
  enableAiFeatures: boolean;

  // Notifications
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  sendgridApiKey: string;
  sendgridFromEmail: string;

  /// Gallery & About
  galleryImages?: any[];
  showGalleryOnHome?: boolean;
  galleryCategories?: string[];
  aboutStory?: string | null;
  aboutMission?: string | null;
  aboutValues?: string | null;
  aboutStoryImage?: string | null;
  aboutMissionImage?: string | null;
  aboutValuesImage?: string | null;

  // Branding
  floorPlanImageUrl?: string | null;
  heroMediaType: string;
  heroImageUrl?: string | null;
  heroVideoUrl?: string | null;
  heroImages: string[];
  heroSlideshowEnabled: boolean;
  heroSlideshowInterval: number;
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

  // Integrations
  kitchenPrinterIp: string;
  facebookUrl: string;
  instagramUrl: string;
  googleMapsApiKey: string;
  googleAnalyticsId: string;
}

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Australia/Sydney',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AED', 'AUD', 'CAD', 'INR'];

const FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Playfair Display',
  'Merriweather',
  'Nunito',
  'Ubuntu',
  'PT Sans',
  'Noto Sans',
  'Mukta',
  'Rubik',
  'Work Sans',
  'Karla',
  'Source Sans Pro',
  'Oswald',
  'Quicksand',
  'Bebas Neue',
  'Barlow',
  'Oxygen',
  'Libre Franklin',
  'Architects Daughter',
  'Crimson Text',
  'Dosis',
  'Josefin Sans',
  'Abril Fatface',
  'Comfortaa',
  'Dancing Script',
  'Pacifico',
  'Lobster',
  'Righteous',
  'Satisfy',
  'Caveat',
  'Indie Flower',
  'Shadows Into Light',
  'Permanent Marker',
  'Amatic SC',
  'Courgette',
  'Great Vibes',
  'Kaushan Script',
  'Cabin',
  'Exo 2',
  'Fjalla One',
  'Manrope',
  'Space Grotesk',
  'DM Sans',
  'Plus Jakarta Sans',
  'Outfit',
  'Sora',
  'Lexend',
  'Red Hat Display',
  'Epilogue',
  'Inter Tight',
  'Bricolage Grotesque',
  'Onest',
];

const COLOR_THEMES = [
  {
    id: 'default',
    name: 'Default Blue',
    description: 'Clean and professional blue theme',
    colors: {
      primaryColor: '#0ea5e9',
      secondaryColor: '#f5f5f5',
      accentColor: '#ef4444',
      pageBgColor: '#f5f5f5',
      bodyColor: '#ffffff',
      bodyTextColor: '#171717',
      headerBgColor: '#ffffff',
      headerTextColor: '#171717',
      footerBgColor: '#171717',
      footerTextColor: '#fafafa',
    },
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    description: 'Elegant dark theme for modern look',
    colors: {
      primaryColor: '#3b82f6',
      secondaryColor: '#1f2937',
      accentColor: '#f59e0b',
      pageBgColor: '#111827',
      bodyColor: '#1f2937',
      bodyTextColor: '#f3f4f6',
      headerBgColor: '#111827',
      headerTextColor: '#f3f4f6',
      footerBgColor: '#000000',
      footerTextColor: '#e5e7eb',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    description: 'Calming ocean-inspired colors',
    colors: {
      primaryColor: '#06b6d4',
      secondaryColor: '#ecfeff',
      accentColor: '#0891b2',
      pageBgColor: '#f0fdfa',
      bodyColor: '#ffffff',
      bodyTextColor: '#134e4a',
      headerBgColor: '#ffffff',
      headerTextColor: '#0f766e',
      footerBgColor: '#0f766e',
      footerTextColor: '#f0fdfa',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    description: 'Warm and inviting sunset colors',
    colors: {
      primaryColor: '#f97316',
      secondaryColor: '#fff7ed',
      accentColor: '#dc2626',
      pageBgColor: '#fff7ed',
      bodyColor: '#ffffff',
      bodyTextColor: '#7c2d12',
      headerBgColor: '#ffffff',
      headerTextColor: '#9a3412',
      footerBgColor: '#7c2d12',
      footerTextColor: '#fff7ed',
    },
  },
  {
    id: 'forest',
    name: 'Forest Green',
    description: 'Natural and earthy green tones',
    colors: {
      primaryColor: '#22c55e',
      secondaryColor: '#f0fdf4',
      accentColor: '#84cc16',
      pageBgColor: '#f0fdf4',
      bodyColor: '#ffffff',
      bodyTextColor: '#14532d',
      headerBgColor: '#ffffff',
      headerTextColor: '#166534',
      footerBgColor: '#14532d',
      footerTextColor: '#f0fdf4',
    },
  },
  {
    id: 'royal',
    name: 'Royal Purple',
    description: 'Luxurious purple and gold',
    colors: {
      primaryColor: '#9333ea',
      secondaryColor: '#faf5ff',
      accentColor: '#eab308',
      pageBgColor: '#faf5ff',
      bodyColor: '#ffffff',
      bodyTextColor: '#581c87',
      headerBgColor: '#ffffff',
      headerTextColor: '#6b21a8',
      footerBgColor: '#581c87',
      footerTextColor: '#faf5ff',
    },
  },
  {
    id: 'rose',
    name: 'Rose Garden',
    description: 'Soft and romantic rose theme',
    colors: {
      primaryColor: '#f43f5e',
      secondaryColor: '#fff1f2',
      accentColor: '#fb7185',
      pageBgColor: '#fff1f2',
      bodyColor: '#ffffff',
      bodyTextColor: '#881337',
      headerBgColor: '#ffffff',
      headerTextColor: '#9f1239',
      footerBgColor: '#881337',
      footerTextColor: '#fff1f2',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Deep blue night sky theme',
    colors: {
      primaryColor: '#3b82f6',
      secondaryColor: '#eff6ff',
      accentColor: '#60a5fa',
      pageBgColor: '#1e3a8a',
      bodyColor: '#1e40af',
      bodyTextColor: '#dbeafe',
      headerBgColor: '#1e3a8a',
      headerTextColor: '#e0e7ff',
      footerBgColor: '#1e293b',
      footerTextColor: '#f1f5f9',
    },
  },
  {
    id: 'coffee',
    name: 'Coffee House',
    description: 'Warm coffee and cream colors',
    colors: {
      primaryColor: '#92400e',
      secondaryColor: '#fef3c7',
      accentColor: '#d97706',
      pageBgColor: '#fef3c7',
      bodyColor: '#fffbeb',
      bodyTextColor: '#451a03',
      headerBgColor: '#fffbeb',
      headerTextColor: '#78350f',
      footerBgColor: '#451a03',
      footerTextColor: '#fef3c7',
    },
  },
  {
    id: 'coral',
    name: 'Coral Reef',
    description: 'Vibrant coral and turquoise',
    colors: {
      primaryColor: '#14b8a6',
      secondaryColor: '#f0fdfa',
      accentColor: '#f97316',
      pageBgColor: '#ecfeff',
      bodyColor: '#ffffff',
      bodyTextColor: '#134e4a',
      headerBgColor: '#ffffff',
      headerTextColor: '#115e59',
      footerBgColor: '#134e4a',
      footerTextColor: '#f0fdfa',
    },
  },
  {
    id: 'lavender',
    name: 'Lavender Dreams',
    description: 'Soft lavender and cream',
    colors: {
      primaryColor: '#8b5cf6',
      secondaryColor: '#f5f3ff',
      accentColor: '#a78bfa',
      pageBgColor: '#f5f3ff',
      bodyColor: '#ffffff',
      bodyTextColor: '#5b21b6',
      headerBgColor: '#ffffff',
      headerTextColor: '#6d28d9',
      footerBgColor: '#5b21b6',
      footerTextColor: '#f5f3ff',
    },
  },
  {
    id: 'slate',
    name: 'Modern Slate',
    description: 'Sophisticated gray tones',
    colors: {
      primaryColor: '#64748b',
      secondaryColor: '#f8fafc',
      accentColor: '#0ea5e9',
      pageBgColor: '#f1f5f9',
      bodyColor: '#ffffff',
      bodyTextColor: '#1e293b',
      headerBgColor: '#ffffff',
      headerTextColor: '#334155',
      footerBgColor: '#1e293b',
      footerTextColor: '#f1f5f9',
    },
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    description: 'Bold neon colors on dark',
    colors: {
      primaryColor: '#a855f7',
      secondaryColor: '#18181b',
      accentColor: '#22d3ee',
      pageBgColor: '#09090b',
      bodyColor: '#18181b',
      bodyTextColor: '#fafafa',
      headerBgColor: '#18181b',
      headerTextColor: '#d946ef',
      footerBgColor: '#09090b',
      footerTextColor: '#fafafa',
    },
  },
  {
    id: 'autumn',
    name: 'Autumn Harvest',
    description: 'Warm autumn leaf colors',
    colors: {
      primaryColor: '#ea580c',
      secondaryColor: '#fff7ed',
      accentColor: '#f59e0b',
      pageBgColor: '#fff7ed',
      bodyColor: '#ffffff',
      bodyTextColor: '#7c2d12',
      headerBgColor: '#ffffff',
      headerTextColor: '#9a3412',
      footerBgColor: '#7c2d12',
      footerTextColor: '#fed7aa',
    },
  },
  {
    id: 'mint',
    name: 'Fresh Mint',
    description: 'Cool and refreshing mint green',
    colors: {
      primaryColor: '#10b981',
      secondaryColor: '#ecfdf5',
      accentColor: '#14b8a6',
      pageBgColor: '#f0fdf4',
      bodyColor: '#ffffff',
      bodyTextColor: '#064e3b',
      headerBgColor: '#ffffff',
      headerTextColor: '#047857',
      footerBgColor: '#064e3b',
      footerTextColor: '#d1fae5',
    },
  },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  // Redirect non-admin users
  React.useEffect(() => {
    if (session?.user?.role && session.user.role !== 'ADMIN') {
      router.push('/admin/orders');
    }
  }, [session, router]);
  const settingsStore = useSettingsStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [, setDataLoaded] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    // General
    restaurantName: '',
    logoUrl: null,
    address: '',
    phone: '',
    email: '',
    operatingHours: DAYS_OF_WEEK.reduce((acc, day) => {
      acc[day] = { open: '09:00', close: '22:00', closed: false };
      return acc;
    }, {} as SettingsData['operatingHours']),
    timezone: 'UTC',
    currency: 'USD',

    // Payment
    stripePublishableKey: '',
    stripeSecretKey: '',
    paypalClientId: '',
    paypalClientSecret: '',
    squareAccessToken: '',
    cashOnDeliveryEnabled: true,
    taxRate: 0,
    serviceFee: 0,

    // Ordering
    minOrderValue: 0,
    enableDineIn: true,
    enablePickup: true,
    enableDelivery: true,
    enableGuestCheckout: true,

    // Booking
    autoConfirmBookings: false,
    maxGuestsPerBooking: 20,
    bookingTimeSlotInterval: 30,
    bookingBufferTime: 15,
    noShowDepositEnabled: false,
    noShowDepositAmount: 0,
    reminderTiming: 24,

    // AI Settings
    groqApiKey: '',
    enableAiFeatures: false,

    // Notifications
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    sendgridApiKey: '',
    sendgridFromEmail: '',

      // Gallery & About
    galleryImages: [],
    showGalleryOnHome: true,
    galleryCategories: ['All', 'Food', 'Ambiance', 'Events'],
    aboutStory: null,
    aboutMission: null,
    aboutValues: null,
    aboutStoryImage: null,
    aboutMissionImage: null,
    aboutValuesImage: null,

    // Branding
    floorPlanImageUrl: null,
    heroMediaType: 'image',
    heroImageUrl: null,
    heroVideoUrl: null,
    heroImages: [],
    heroSlideshowEnabled: false,
    heroSlideshowInterval: 5000,
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

    // Integrations
    kitchenPrinterIp: '',
    facebookUrl: '',
    instagramUrl: '',
    googleMapsApiKey: '',
    googleAnalyticsId: '',
  });

  const hasFetchedRef = React.useRef(false);
  
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchSettings();
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();

      console.log('🔵 fetchSettings - Raw API data:', data.data);

      // Map API response to settings format - DON'T use defaults, use actual values
      const mappedData = {
        ...data.data,
        restaurantName: data.data.restaurantName || data.data.name,
        // Use actual values from database, no defaults
        heroMediaType: data.data.heroMediaType,
        heroVideoUrl: data.data.heroVideoUrl,
        heroImages: data.data.heroImages || [],
        heroSlideshowEnabled: data.data.heroSlideshowEnabled,
        heroSlideshowInterval: data.data.heroSlideshowInterval,
      };

      console.log('🔵 fetchSettings - Mapped data:', {
        heroMediaType: mappedData.heroMediaType,
        heroVideoUrl: mappedData.heroVideoUrl,
        heroImages: mappedData.heroImages,
        heroSlideshowEnabled: mappedData.heroSlideshowEnabled,
        heroSlideshowInterval: mappedData.heroSlideshowInterval,
      });

      // Initialize operating hours if not set
      if (!mappedData.operatingHours || Object.keys(mappedData.operatingHours).length === 0) {
        mappedData.operatingHours = DAYS_OF_WEEK.reduce((acc, day) => {
          acc[day] = { open: '09:00', close: '22:00', closed: false };
          return acc;
        }, {} as SettingsData['operatingHours']);
      }

      setSettings(mappedData);
      setDataLoaded(true);
      // Also update the global settings store to apply CSS variables
      settingsStore.setSettings(mappedData);
      
      console.log('🔵 fetchSettings - State updated');
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    console.log('🔵 SAVING SETTINGS:', {
      heroMediaType: settings.heroMediaType,
      heroVideoUrl: settings.heroVideoUrl,
      heroImages: settings.heroImages,
      heroSlideshowInterval: settings.heroSlideshowInterval,
    });
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Save settings error:', errorData);
        if (errorData.details) {
          console.error('Validation details:', errorData.details);
        }
        throw new Error(errorData.error || 'Failed to save settings');
      }

      await response.json();

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
      setHasChanges(false);
      
      // Just refetch settings, don't reload page
      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof SettingsData>(
    key: K,
    value: SettingsData[K]
  ) => {
    console.log('updateSetting called:', key, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    console.log('hasChanges set to true');
    
    // Immediately apply color changes to CSS variables
    if (key.includes('Color') || key === 'fontFamily') {
      settingsStore.setSettings({ [key]: value } as Partial<SettingsData>);
    }
  };

  const updateOperatingHours = (
    day: string,
    field: 'open' | 'close' | 'closed',
    value: string | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const testIntegration = async (type: string) => {
    try {
      let endpoint = '';
      let body = {};

      switch (type) {
        case 'sms':
          endpoint = '/api/notifications/sms';
          body = {
            to: settings.phone,
            message: 'Test SMS from RestaurantOS',
          };
          break;
        case 'email':
          endpoint = '/api/notifications/email';
          body = {
            to: settings.email,
            subject: 'Test Email',
            html: '<p>Test email from RestaurantOS</p>',
            text: 'Test email from RestaurantOS',
          };
          break;
        case 'printer':
          toast({
            title: 'Test Print',
            description: 'Sending test print to kitchen printer...',
          });
          return;
        default:
          return;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Test failed');
      }

      toast({
        title: 'Success',
        description: result.message || `Test ${type} sent successfully`,
      });
    } catch (error) {
      console.error(`Test ${type} error:`, error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to send test ${type}`,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Settings</h1>
        <p className="mt-2" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
          Manage your restaurant configuration and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="ordering">Ordering</TabsTrigger>
          <TabsTrigger value="booking">Booking</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="ai-settings">AI Settings</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="qr-codes">QR Codes</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Restaurant Information</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Restaurant Name
                </label>
                <Input
                  type="text"
                  value={settings.restaurantName}
                  onChange={(e) => updateSetting('restaurantName', e.target.value)}
                  placeholder="Enter restaurant name"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Logo
                </label>
                <ImageUpload
                  currentImage={settings.logoUrl}
                  onUpload={(url) => updateSetting('logoUrl', url)}
                  onRemove={() => updateSetting('logoUrl', null)}
                  folder="logos"
                  maxSizeMB={2}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Address
                </label>
                <Input
                  value={settings.address || ''}
                  onChange={(e) => updateSetting('address', e.target.value)}
                  placeholder="Enter full address"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Phone
                  </label>
                  <Input
                    type="tel"
                    value={settings.phone || ''}
                    onChange={(e) => updateSetting('phone', e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Email
                  </label>
                  <Input
                    type="email"
                    value={settings.email || ''}
                    onChange={(e) => updateSetting('email', e.target.value)}
                    placeholder="contact@restaurant.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Timezone
                  </label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) => updateSetting('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Currency
                  </label>
                  <Select
                    value={settings.currency}
                    onValueChange={(value) => updateSetting('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((curr) => (
                        <SelectItem key={curr} value={curr}>
                          {curr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Operating Hours</h2>
            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-28">
                    <span className="text-sm font-medium capitalize" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                      {day}
                    </span>
                  </div>
                  <div className="flex flex-1 items-center gap-4">
                    <Input
                      type="time"
                      value={settings.operatingHours?.[day]?.open ?? '09:00'}
                      onChange={(e) =>
                        updateOperatingHours(day, 'open', e.target.value)
                      }
                      disabled={settings.operatingHours?.[day]?.closed ?? false}
                      className="w-32"
                    />
                    <span style={{ color: 'hsl(var(--foreground) / 0.6)' }}>to</span>
                    <Input
                      type="time"
                      value={settings.operatingHours?.[day]?.close ?? '22:00'}
                      onChange={(e) =>
                        updateOperatingHours(day, 'close', e.target.value)
                      }
                      disabled={settings.operatingHours?.[day]?.closed ?? false}
                      className="w-32"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.operatingHours?.[day]?.closed || false}
                        onChange={(e) =>
                          updateOperatingHours(day, 'closed', e.target.checked)
                        }
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                      <span className="text-sm" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>Closed</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Payment Settings Tab */}
        <TabsContent value="payment" className="space-y-6">
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Payment Gateways</h2>

            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Stripe</h3>
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Publishable Key
                  </label>
                  <Input
                    type="password"
                    value={settings.stripeSecretKey || ''}
                    onChange={(e) =>
                      updateSetting('stripePublishableKey', e.target.value)
                    }
                    placeholder="pk_test_..."
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Secret Key
                  </label>
                  <Input
                    type="password"
                    value={settings.stripeSecretKey || ''}
                    onChange={(e) =>
                      updateSetting('stripeSecretKey', e.target.value)
                    }
                    placeholder="sk_test_..."
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-6 mt-6" style={{ borderColor: 'hsl(var(--border))' }}>
                <h3 className="text-lg font-medium">PayPal</h3>
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Client ID
                  </label>
                  <Input
                    value={settings.paypalClientId || ''}
                    onChange={(e) =>
                      updateSetting('paypalClientId', e.target.value)
                    }
                    placeholder="PayPal Client ID"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Client Secret
                  </label>
                  <Input
                    type="password"
                    value={settings.paypalClientSecret || ''}
                    onChange={(e) =>
                      updateSetting('paypalClientSecret', e.target.value)
                    }
                    placeholder="PayPal Client Secret"
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-6 mt-6" style={{ borderColor: 'hsl(var(--border))' }}>
                <h3 className="text-lg font-medium">Square</h3>
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Access Token
                  </label>
                  <Input
                    type="password"
                    value={settings.squareAccessToken || ''}
                    onChange={(e) =>
                      updateSetting('squareAccessToken', e.target.value)
                    }
                    placeholder="Square Access Token"
                  />
                </div>
              </div>

              <div className="border-t pt-6" style={{ borderColor: 'hsl(var(--border))' }}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.cashOnDeliveryEnabled}
                    onChange={(e) =>
                      updateSetting('cashOnDeliveryEnabled', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Enable Cash on Delivery/Pickup
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Fees & Taxes</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Tax Rate (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={settings.taxRate ?? 0}
                  onChange={(e) =>
                    updateSetting('taxRate', parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Service Fee (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={settings.serviceFee ?? 0}
                  onChange={(e) =>
                    updateSetting('serviceFee', parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Ordering Settings Tab */}
        <TabsContent value="ordering" className="space-y-6">
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Ordering Options</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Minimum Order Value
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.minOrderValue ?? 0}
                  onChange={(e) =>
                    updateSetting('minOrderValue', parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-3 border-t pt-4" style={{ borderColor: 'hsl(var(--border))' }}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.enableDineIn}
                    onChange={(e) =>
                      updateSetting('enableDineIn', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Enable Dine-In Orders
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.enablePickup}
                    onChange={(e) =>
                      updateSetting('enablePickup', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Enable Pickup Orders
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.enableDelivery}
                    onChange={(e) =>
                      updateSetting('enableDelivery', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Enable Delivery Orders
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.enableGuestCheckout}
                    onChange={(e) =>
                      updateSetting('enableGuestCheckout', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Allow Guest Checkout
                  </span>
                </label>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Booking Settings Tab */}
        <TabsContent value="booking" className="space-y-6">
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Booking Configuration</h2>

            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.autoConfirmBookings}
                  onChange={(e) =>
                    updateSetting('autoConfirmBookings', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-neutral-300"
                />
                <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Auto-Confirm Bookings
                </span>
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Maximum Guests per Booking
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.maxGuestsPerBooking ?? 20}
                  onChange={(e) =>
                    updateSetting('maxGuestsPerBooking', parseInt(e.target.value) || 20)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Time Slot Interval (minutes)
                </label>
                                <Select
                  value={settings.bookingTimeSlotInterval ? settings.bookingTimeSlotInterval.toString() : '30'}
                  onValueChange={(value) =>
                    updateSetting('bookingTimeSlotInterval', parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Buffer Time Between Bookings (minutes)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={settings.bookingBufferTime ?? 15}
                  onChange={(e) =>
                    updateSetting('bookingBufferTime', parseInt(e.target.value) || 15)
                  }
                />
              </div>

              <div className="space-y-4 border-t pt-4" style={{ borderColor: 'hsl(var(--border))' }}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.noShowDepositEnabled}
                    onChange={(e) =>
                      updateSetting('noShowDepositEnabled', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Require No-Show Deposit
                  </span>
                </label>

                {settings.noShowDepositEnabled && (
                  <div>
                    <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                      Deposit Amount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.noShowDepositAmount ?? 0}
                      onChange={(e) =>
                        updateSetting(
                          'noShowDepositAmount',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="10.00"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Send Reminder (hours before booking)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="72"
                  value={settings.reminderTiming ?? 24}
                  onChange={(e) =>
                    updateSetting('reminderTiming', parseInt(e.target.value) || 24)
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>SMS Provider (Twilio)</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Account SID
                </label>
                <Input
                  value={settings.twilioAccountSid || ''}
                  onChange={(e) =>
                    updateSetting('twilioAccountSid', e.target.value)
                  }
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Auth Token
                </label>
                <Input
                  type="password"
                  value={settings.twilioAuthToken || ''}
                  onChange={(e) =>
                    updateSetting('twilioAuthToken', e.target.value)
                  }
                  placeholder="Your auth token"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Phone Number
                </label>
                <Input
                  value={settings.twilioPhoneNumber || ''}
                  onChange={(e) =>
                    updateSetting('twilioPhoneNumber', e.target.value)
                  }
                  placeholder="+1234567890"
                />
              </div>

              <Button
                variant="outline"
                onClick={() => testIntegration('sms')}
                className="w-full"
              >
                Send Test SMS
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Email Provider (SendGrid)</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  API Key
                </label>
                <Input
                  type="password"
                  value={settings.sendgridApiKey || ''}
                  onChange={(e) =>
                    updateSetting('sendgridApiKey', e.target.value)
                  }
                  placeholder="SG.xxxxxxxxxxxxxxxx"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  From Email
                </label>
                <Input
                  type="email"
                  value={settings.sendgridFromEmail || ''}
                  onChange={(e) =>
                    updateSetting('sendgridFromEmail', e.target.value)
                  }
                  placeholder="noreply@restaurant.com"
                />
              </div>

              <Button
                variant="outline"
                onClick={() => testIntegration('email')}
                className="w-full"
              >
                Send Test Email
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          {/* Hero Section Configuration */}
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Hero Section</h2>
            <p className="mb-6 text-sm" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
              Configure the hero section on your homepage with image, video, or slideshow.
            </p>

            <div className="space-y-6">
              {/* Media Type Selector */}
              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Media Type
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={settings.heroMediaType === 'image' ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('🔵 Switching to IMAGE');
                      updateSetting('heroMediaType', 'image');
                    }}
                    className="flex-1"
                  >
                    Single Image
                  </Button>
                  <Button
                    type="button"
                    variant={settings.heroMediaType === 'slideshow' ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('🔵 Switching to SLIDESHOW');
                      updateSetting('heroMediaType', 'slideshow');
                    }}
                    className="flex-1"
                  >
                    Slideshow
                  </Button>
                  <Button
                    type="button"
                    variant={settings.heroMediaType === 'video' ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('🔵 Switching to VIDEO');
                      updateSetting('heroMediaType', 'video');
                    }}
                    className="flex-1"
                  >
                    Video
                  </Button>
                </div>
              </div>

              {/* Single Image Upload */}
              {settings.heroMediaType === 'image' && (
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Hero Image
                  </label>
                  <div className="text-sm mb-2" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                    Upload a background image for your homepage hero section
                  </div>
                  <ImageUpload
                    currentImage={settings.heroImageUrl}
                    onUpload={(url) => updateSetting('heroImageUrl', url)}
                    onRemove={() => updateSetting('heroImageUrl', null)}
                    folder="hero"
                    maxSizeMB={5}
                  />
                </div>
              )}

              {/* Slideshow Images */}
              {settings.heroMediaType === 'slideshow' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                      Slideshow Images
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;

                          const formData = new FormData();
                          formData.append('file', file);
                          formData.append('folder', 'hero-slideshow');

                          try {
                            const response = await fetch('/api/upload', {
                              method: 'POST',
                              body: formData,
                            });
                            const data = await response.json();
                            if (data.success) {
                              updateSetting('heroImages', [...(settings.heroImages || []), data.data.url]);
                            }
                          } catch (error) {
                            console.error('Upload error:', error);
                            toast({
                              title: 'Upload Failed',
                              description: 'Failed to upload image',
                              variant: 'destructive',
                            });
                          }
                        };
                        input.click();
                      }}
                    >
                      Add Image
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(settings.heroImages || []).map((img, index) => (
                      <div key={index} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`Slide ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                        <button
                          onClick={() => {
                            const newImages = settings.heroImages.filter((_, i) => i !== index);
                            updateSetting('heroImages', newImages);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {(settings.heroImages || []).length === 0 && (
                    <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--foreground) / 0.5)' }}>
                      No images added yet. Click "Add Image" to get started.
                    </p>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                      Slide Interval (milliseconds)
                    </label>
                    <Input
                      type="number"
                      min="2000"
                      max="10000"
                      step="500"
                      value={settings.heroSlideshowInterval || 5000}
                      onChange={(e) => {
                        console.log('🔵 Slideshow interval changed to:', e.target.value);
                        updateSetting('heroSlideshowInterval', parseInt(e.target.value) || 5000);
                      }}
                    />
                    <p className="mt-1 text-xs" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                      Time between slides (default: 5000ms = 5 seconds)
                    </p>
                  </div>
                </div>
              )}

              {/* Video URL */}
              {settings.heroMediaType === 'video' && (
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                    Video URL
                  </label>
                  <Input
                    type="url"
                    value={settings.heroVideoUrl || ''}
                    onChange={(e) => {
                      console.log('🔵 Video URL changed to:', e.target.value);
                      updateSetting('heroVideoUrl', e.target.value);
                    }}
                    placeholder="https://youtube.com/watch?v=... or https://vimeo.com/... or direct video URL"
                  />
                  <p className="mt-2 text-xs" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                    Supported: YouTube, Vimeo, or direct video file URLs (.mp4, .webm)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Theme Presets Section */}
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Quick Theme Presets</h2>
            <p className="mb-6 text-sm" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
              Choose from our beautiful pre-designed themes or customize your own colors below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={async () => {
                    // Apply all colors from the theme
                    const themeSettings: any = {};
                    Object.entries(theme.colors).forEach(([key, value]) => {
                      themeSettings[key] = value;
                      updateSetting(key as keyof SettingsData, value);
                    });
                    
                    // Auto-save the theme
                    try {
                      setIsSaving(true);
                      const response = await fetch('/api/settings', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ ...settings, ...themeSettings }),
                      });

                      if (!response.ok) throw new Error('Failed to save theme');

                      toast({
                        title: 'Theme Applied',
                        description: `${theme.name} theme has been applied and saved successfully`,
                      });
                      setHasChanges(false);
                      
                      // Reload to apply everywhere
                      setTimeout(() => {
                        window.location.reload();
                      }, 500);
                    } catch (error) {
                      console.error('Error saving theme:', error);
                      toast({
                        title: 'Theme Applied',
                        description: `${theme.name} theme applied locally. Click "Save Changes" to persist.`,
                      });
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="group relative overflow-hidden rounded-xl border-2 border-neutral-200 transition-all duration-300 hover:shadow-lg hover:border-[hsl(var(--primary))]"
                >
                  {/* Color Preview Bars */}
                  <div className="h-24 flex">
                    <div 
                      className="flex-1" 
                      style={{ backgroundColor: theme.colors.primaryColor }}
                    />
                    <div 
                      className="flex-1" 
                      style={{ backgroundColor: theme.colors.bodyColor }}
                    />
                    <div 
                      className="flex-1" 
                      style={{ backgroundColor: theme.colors.accentColor }}
                    />
                    <div 
                      className="flex-1" 
                      style={{ backgroundColor: theme.colors.footerBgColor }}
                    />
                  </div>

                  {/* Theme Info */}
                  <div className="p-4" style={{ backgroundColor: 'hsl(var(--card))' }}>
                    <h3 className="font-semibold mb-1 transition-colors" style={{ 
                      color: 'rgb(var(--foreground))', 
                      '--hover-color': 'hsl(var(--primary))'
                    } as React.CSSProperties}>
                      {theme.name}
                    </h3>
                    <p className="text-xs" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                      {theme.description}
                    </p>
                  </div>

                  {/* Active Indicator */}
                  {settings.primaryColor === theme.colors.primaryColor &&
                   settings.accentColor === theme.colors.accentColor &&
                   settings.footerBgColor === theme.colors.footerBgColor && (
                    <div className="absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: 'hsl(var(--primary))' }}>
                      Active
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Color Customization */}
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Custom Brand Colors</h2>
            <p className="mb-6 text-sm" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
              Fine-tune individual colors to match your brand perfectly.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Primary Color
                  <span className="ml-2 text-xs" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>(Buttons, Links)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) =>
                      updateSetting('primaryColor', e.target.value)
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={settings.primaryColor}
                    onChange={(e) =>
                      updateSetting('primaryColor', e.target.value)
                    }
                    placeholder="#0ea5e9"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Secondary Color
                  <span className="ml-2 text-xs text-neutral-500">(Secondary Buttons)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) =>
                      updateSetting('secondaryColor', e.target.value)
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={settings.secondaryColor}
                    onChange={(e) =>
                      updateSetting('secondaryColor', e.target.value)
                    }
                    placeholder="#f5f5f5"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Accent Color
                  <span className="ml-2 text-xs text-neutral-500">(Highlights, Alerts)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) =>
                      updateSetting('accentColor', e.target.value)
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={settings.accentColor}
                    onChange={(e) =>
                      updateSetting('accentColor', e.target.value)
                    }
                    placeholder="#ef4444"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Page Background
                  <span className="ml-2 text-xs text-neutral-500">(Overall Page)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.pageBgColor}
                    onChange={(e) =>
                      updateSetting('pageBgColor', e.target.value)
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={settings.pageBgColor}
                    onChange={(e) =>
                      updateSetting('pageBgColor', e.target.value)
                    }
                    placeholder="#f5f5f5"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Content Background
                  <span className="ml-2 text-xs text-neutral-500">(Page Background)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.bodyColor}
                    onChange={(e) =>
                      updateSetting('bodyColor', e.target.value)
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={settings.bodyColor}
                    onChange={(e) =>
                      updateSetting('bodyColor', e.target.value)
                    }
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Text Color
                  <span className="ml-2 text-xs text-neutral-500">(Body Text)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.bodyTextColor}
                    onChange={(e) =>
                      updateSetting('bodyTextColor', e.target.value)
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={settings.bodyTextColor}
                    onChange={(e) =>
                      updateSetting('bodyTextColor', e.target.value)
                    }
                    placeholder="#171717"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Header Background
                  <span className="ml-2 text-xs text-neutral-500">(Header BG)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.headerBgColor}
                    onChange={(e) =>
                      updateSetting('headerBgColor', e.target.value)
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={settings.headerBgColor}
                    onChange={(e) =>
                      updateSetting('headerBgColor', e.target.value)
                    }
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.headerTransparentOverMedia}
                      onChange={(e) =>
                        updateSetting('headerTransparentOverMedia', e.target.checked)
                      }
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'w-11 h-6 rounded-full transition-colors duration-200',
                        settings.headerTransparentOverMedia ? 'bg-primary' : 'bg-neutral-300'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                          settings.headerTransparentOverMedia ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      Transparent Header on Homepage
                    </span>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                      When enabled, the header becomes fully transparent over the hero image or video on the homepage. On scroll or other pages, it switches back to the normal header background.
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Header Text Color
                  <span className="ml-2 text-xs text-neutral-500">(Header Text)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.headerTextColor}
                    onChange={(e) =>
                      updateSetting('headerTextColor', e.target.value)
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={settings.headerTextColor}
                    onChange={(e) =>
                      updateSetting('headerTextColor', e.target.value)
                    }
                    placeholder="#171717"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Footer Background
                  <span className="ml-2 text-xs text-neutral-500">(Footer BG)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.footerBgColor}
                    onChange={(e) =>
                      updateSetting('footerBgColor', e.target.value)
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={settings.footerBgColor}
                    onChange={(e) =>
                      updateSetting('footerBgColor', e.target.value)
                    }
                    placeholder="#171717"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Footer Text Color
                  <span className="ml-2 text-xs text-neutral-500">(Footer Text)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.footerTextColor}
                    onChange={(e) =>
                      updateSetting('footerTextColor', e.target.value)
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={settings.footerTextColor}
                    onChange={(e) =>
                      updateSetting('footerTextColor', e.target.value)
                    }
                    placeholder="#fafafa"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Typography</h2>

            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                Font Family
              </label>
              <Select
                value={settings.fontFamily}
                onValueChange={(value) => updateSetting('fontFamily', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((font) => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Theme Preview</h2>

            <div
              className="space-y-4 rounded-lg border-2 p-6"
              style={{
                borderColor: settings.primaryColor,
                fontFamily: settings.fontFamily,
              }}
            >
              <h3
                className="text-2xl font-bold"
                style={{ color: settings.primaryColor }}
              >
                Sample Heading
              </h3>
              <p className="text-neutral-700">
                This is how your text will appear with the selected font family.
              </p>
              <div className="flex gap-2">
                <button
                  className="rounded-lg px-4 py-2 font-semibold text-white transition-colors"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  Primary Button
                </button>
                <button
                  className="rounded-lg px-4 py-2 font-semibold text-white transition-colors"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  Accent Button
                </button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Kitchen Printer</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Printer IP Address
                </label>
                <Input
                  value={settings.kitchenPrinterIp || ''}
                  onChange={(e) =>
                    updateSetting('kitchenPrinterIp', e.target.value)
                  }
                  placeholder="192.168.1.100"
                />
              </div>

              <Button
                variant="outline"
                onClick={() => testIntegration('printer')}
                className="w-full"
              >
                Test Print
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Social Media</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Facebook URL
                </label>
                <Input
                  value={settings.facebookUrl || ''}
                  onChange={(e) =>
                    updateSetting('facebookUrl', e.target.value)
                  }
                  placeholder="https://facebook.com/yourpage"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Instagram URL
                </label>
                <Input
                  value={settings.instagramUrl || ''}
                  onChange={(e) =>
                    updateSetting('instagramUrl', e.target.value)
                  }
                  placeholder="https://instagram.com/yourprofile"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>External Services</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Google Maps API Key
                </label>
                <Input
                  type="password"
                  value={settings.googleMapsApiKey || ''}
                  onChange={(e) =>
                    updateSetting('googleMapsApiKey', e.target.value)
                  }
                  placeholder="AIza..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Google Analytics ID
                </label>
                <Input
                  value={settings.googleAnalyticsId || ''}
                  onChange={(e) =>
                    updateSetting('googleAnalyticsId', e.target.value)
                  }
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* AI Settings Tab */}
        <TabsContent value="ai-settings" className="space-y-6">
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>AI Features Configuration</h2>
            <p className="mb-6 text-sm" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
              Enable AI-powered features like recommendations, demand forecasting, and chatbot using Groq API
            </p>

            <div className="space-y-6">
              {/* Enable AI Features Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }}>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Enable AI Features</h3>
                  <p className="text-sm" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                    Turn on AI-powered recommendations, forecasting, and chatbot
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableAiFeatures || false}
                    onChange={(e) => updateSetting('enableAiFeatures', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Groq API Key */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Groq API Key</label>
                  <p className="text-sm mb-3" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                    Get your free API key from{' '}
                    
                       <a 
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      console.groq.com/keys
                    </a>
                  </p>
                  <Input
                    type="password"
                    placeholder="gsk_..."
                    value={settings.groqApiKey || ''}
                    onChange={(e) => updateSetting('groqApiKey', e.target.value)}
                    disabled={!settings.enableAiFeatures}
                    className="font-mono"
                  />
                </div>

                {settings.groqApiKey && settings.enableAiFeatures && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const toastId = toast({ 
                        title: 'Testing...', 
                        description: 'Validating your API key with Groq...' 
                      });
                      
                      try {
                        const response = await fetch('/api/ai/test-key', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ apiKey: settings.groqApiKey }),
                        });
                        
                        const data = await response.json();
                        console.log('Test API Key Response:', data);
                        
                        if (data.success) {
                          toast({ 
                            title: 'Success ✅', 
                            description: 'API key is valid and working!' 
                          });
                        } else {
                          toast({ 
                            title: 'Invalid API Key ❌', 
                            description: data.error || 'API key is invalid', 
                            variant: 'destructive' 
                          });
                        }
                      } catch (error) {
                        console.error('Test API Key Error:', error);
                        toast({ 
                          title: 'Error ❌', 
                          description: 'Failed to test API key. Check console for details.', 
                          variant: 'destructive' 
                        });
                      }
                    }}
                  >
                    Test API Key
                  </Button>
                )}
              </div>

              {/* Info Box */}
              {settings.enableAiFeatures && settings.groqApiKey && (
                <div className="p-4 rounded-lg border-l-4 border-blue-500" style={{ backgroundColor: 'hsl(var(--blue) / 0.1)' }}>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-blue-900 mb-1">Usage Information</p>
                      <ul className="text-blue-800 space-y-1 list-disc list-inside">
                        <li>Groq free tier: 30 requests/minute, 14,400/day</li>
                        <li>Recommendations cached for 30 minutes</li>
                        <li>Falls back gracefully if API fails</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Features List */}
              {settings.enableAiFeatures && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Enabled AI Features:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-sm">Smart Recommendations</p>
                          <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>Personalized menu suggestions</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-sm">Demand Forecasting</p>
                          <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>Predict busy hours & prep needs</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Gallery */}
            <div className="space-y-6">
              {/* Gallery Categories */}
              <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Gallery Categories</h2>
                <p className="text-sm mb-4" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                  Organize your gallery images by categories
                </p>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter category name"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          const value = input.value.trim();
                          if (value && !(settings.galleryCategories || []).includes(value)) {
                            updateSetting('galleryCategories', [
                              ...(settings.galleryCategories || ['All']),
                              value
                            ]);
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={(e) => {
                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                        const value = input.value.trim();
                        if (value && !(settings.galleryCategories || []).includes(value)) {
                          updateSetting('galleryCategories', [
                            ...(settings.galleryCategories || ['All']),
                            value
                          ]);
                          input.value = '';
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(settings.galleryCategories || ['All']).map((cat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm"
                        style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                      >
                        <span>{cat}</span>
                        {cat !== 'All' && (
                          <button
                            onClick={() => {
                              updateSetting(
                                'galleryCategories',
                                (settings.galleryCategories || []).filter((c) => c !== cat)
                              );
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gallery Management */}
              <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Gallery Images</h2>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                      {settings.galleryImages?.length || 0} images uploaded
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;

                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('folder', 'gallery');

                        try {
                          const response = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                          });
                          const data = await response.json();
                          if (data.success) {
                            const currentGallery = settings.galleryImages || [];
                            updateSetting('galleryImages', [
                              ...currentGallery,
                              { url: data.data.url, caption: '', order: currentGallery.length },
                            ]);
                            toast({ title: 'Success', description: 'Image uploaded successfully' });
                          }
                        } catch (error) {
                          console.error('Upload error:', error);
                          toast({
                            title: 'Upload Failed',
                            description: 'Failed to upload image',
                            variant: 'destructive',
                          });
                        }
                      };
                      input.click();
                    }}
                  >
                    + Add Image
                  </Button>
                </div>

                {/* Gallery Images List */}
                {settings.galleryImages && settings.galleryImages.length > 0 ? (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {(settings.galleryImages ?? []).map((item: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3" style={{ borderColor: 'hsl(var(--border))' }}>
                        <div className="flex gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt={`Gallery ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                                Image {index + 1}
                              </span>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.isFeatured || false}
                                  onChange={(e) => {
                                    const newGallery = [...(settings.galleryImages ?? [])];
                                    newGallery[index] = { ...newGallery[index], isFeatured: e.target.checked };
                                    updateSetting('galleryImages', newGallery);
                                  }}
                                  className="w-3.5 h-3.5"
                                />
                                <span className="text-xs" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>Featured</span>
                              </label>
                            </div>
                            
                            <Select
                              value={item.category || 'All'}
                              onValueChange={(value) => {
                                const newGallery = [...(settings.galleryImages ?? [])];
                                newGallery[index] = { ...newGallery[index], category: value };
                                updateSetting('galleryImages', newGallery);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(settings.galleryCategories || ['All']).map((cat) => (
                                  <SelectItem key={cat} value={cat} className="text-xs">
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Input
                              value={item.caption || ''}
                              onChange={(e) => {
                                const newGallery = [...(settings.galleryImages ?? [])];
                                newGallery[index] = { ...newGallery[index], caption: e.target.value };
                                updateSetting('galleryImages', newGallery);
                              }}
                              placeholder="Caption (optional)"
                              className="h-8 text-xs"
                            />

                            <div className="flex gap-1.5">
                              {index > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2"
                                  onClick={() => {
                                    const newGallery = [...(settings.galleryImages ?? [])];
                                    [newGallery[index - 1], newGallery[index]] = [newGallery[index], newGallery[index - 1]];
                                    updateSetting('galleryImages', newGallery);
                                  }}
                                >
                                  ↑
                                </Button>
                              )}
                              {index < (settings.galleryImages?.length ?? 0) - 1 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2"
                                  onClick={() => {
                                    const newGallery = [...(settings.galleryImages ?? [])];
                                    [newGallery[index], newGallery[index + 1]] = [newGallery[index + 1], newGallery[index]];
                                    updateSetting('galleryImages', newGallery);
                                  }}
                                >
                                  ↓
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs px-2 ml-auto"
                                onClick={() => {
                                  if (confirm('Delete this image?')) {
                                    const newGallery = (settings.galleryImages ?? []).filter((_: any, i: number) => i !== index);
                                    updateSetting('galleryImages', newGallery);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-sm" style={{ color: 'hsl(var(--foreground) / 0.5)' }}>
                    No gallery images. Click "+ Add Image" to upload.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - About Section */}
            <div className="space-y-6">
              <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>About Section</h2>
                <p className="text-sm mb-6" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                  Add images and text for your About Us section
                </p>

                <div className="space-y-6">
                  {/* Our Story */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                      <Heart className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
                      Our Story
                    </h3>
                    <ImageUpload
                      currentImage={settings.aboutStoryImage}
                      onUpload={(url) => updateSetting('aboutStoryImage', url)}
                      onRemove={() => updateSetting('aboutStoryImage', null)}
                      folder="about"
                      maxSizeMB={3}
                    />
                    <textarea
                      value={settings.aboutStory || ''}
                      onChange={(e) => updateSetting('aboutStory', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border resize-none text-sm"
                      style={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                      }}
                      placeholder="Tell your restaurant's story..."
                    />
                  </div>

                  <div className="border-t pt-6" style={{ borderColor: 'hsl(var(--border))' }}></div>

                  {/* Our Mission */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                      <Target className="w-4 h-4 text-green-600" />
                      Our Mission
                    </h3>
                    <ImageUpload
                      currentImage={settings.aboutMissionImage}
                      onUpload={(url) => updateSetting('aboutMissionImage', url)}
                      onRemove={() => updateSetting('aboutMissionImage', null)}
                      folder="about"
                      maxSizeMB={3}
                    />
                    <textarea
                      value={settings.aboutMission || ''}
                      onChange={(e) => updateSetting('aboutMission', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border resize-none text-sm"
                      style={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                      }}
                      placeholder="Describe your mission..."
                    />
                  </div>

                  <div className="border-t pt-6" style={{ borderColor: 'hsl(var(--border))' }}></div>

                  {/* Our Values */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                      <Award className="w-4 h-4" style={{ color: 'hsl(var(--accent))' }} />
                      Our Values
                    </h3>
                    <ImageUpload
                      currentImage={settings.aboutValuesImage}
                      onUpload={(url) => updateSetting('aboutValuesImage', url)}
                      onRemove={() => updateSetting('aboutValuesImage', null)}
                      folder="about"
                      maxSizeMB={3}
                    />
                    <textarea
                      value={settings.aboutValues || ''}
                      onChange={(e) => updateSetting('aboutValues', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border resize-none text-sm"
                      style={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                      }}
                      placeholder="Share your core values..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        {/* QR Codes Tab */}
        <TabsContent value="qr-codes" className="space-y-6">
          <QRCodesManagement />
        </TabsContent>

        {/* Tables Tab */}
        <TabsContent value="tables" className="space-y-6">
          {/* Floor Plan Image */}
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Restaurant Floor Plan</h2>
            <p className="text-sm mb-4" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
              Upload your restaurant floor plan image to display as background in the table map
            </p>
            <ImageUpload
              currentImage={settings.floorPlanImageUrl}
              onUpload={(url) => updateSetting('floorPlanImageUrl', url)}
              onRemove={() => updateSetting('floorPlanImageUrl', null)}
              folder="floor-plans"
              maxSizeMB={5}
            />
          </div>

          <TablesManagement />
        </TabsContent>
      </Tabs>

      {/* Save Button (Sticky Bottom) */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 border-t p-4 shadow-lg md:left-64" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <p className="text-sm" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
              You have unsaved changes
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  fetchSettings();
                  setHasChanges(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="min-w-32"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}