import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { I18nProvider } from '@/i18n/i18nContext';
import dynamic from 'next/dynamic';
import { PageTransition } from '@/components/shared/PageTransition';

const Toaster = dynamic(() => import('@/components/ui/toaster').then(mod => ({ default: mod.Toaster })), {
  ssr: false,
});
import { SettingsLoader } from '@/components/shared/SettingsLoader';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: {
    default: 'RestaurantOS - Modern Restaurant Management Platform',
    template: '%s | RestaurantOS',
  },
  description:
    'A comprehensive, self-hosted restaurant management platform with QR ordering, table booking, admin dashboard, and AI-powered features.',
  keywords: [
    'restaurant management',
    'QR ordering',
    'table booking',
    'online ordering',
    'restaurant POS',
    'food delivery',
  ],
  authors: [{ name: 'RestaurantOS' }],
  creator: 'RestaurantOS',
  publisher: 'RestaurantOS',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'RestaurantOS - Modern Restaurant Management Platform',
    description:
      'A comprehensive, self-hosted restaurant management platform with QR ordering, table booking, admin dashboard, and AI-powered features.',
    siteName: 'RestaurantOS',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RestaurantOS - Modern Restaurant Management Platform',
    description:
      'A comprehensive, self-hosted restaurant management platform with QR ordering, table booking, admin dashboard, and AI-powered features.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('restaurant-settings');
                  if (stored) {
                    const settings = JSON.parse(stored);
                    const hexToHsl = (hex) => {
                      const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
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
                      return h + ' ' + s + '% ' + l + '%';
                    };
                    if (settings.branding) {
                      const b = settings.branding;
                      const root = document.documentElement;
                      if (b.primaryColor) root.style.setProperty('--primary', hexToHsl(b.primaryColor));
                      if (b.secondaryColor) root.style.setProperty('--secondary', hexToHsl(b.secondaryColor));
                      if (b.accentColor) root.style.setProperty('--accent', hexToHsl(b.accentColor));
                      if (b.pageBgColor) root.style.setProperty('--page-bg', hexToHsl(b.pageBgColor));
                      if (b.bodyColor) {
                        root.style.setProperty('--background', hexToHsl(b.bodyColor));
                        root.style.setProperty('--card', hexToHsl(b.bodyColor));
                      }
                      if (b.bodyTextColor) {
                        root.style.setProperty('--foreground', hexToHsl(b.bodyTextColor));
                        root.style.setProperty('--card-foreground', hexToHsl(b.bodyTextColor));
                        root.style.setProperty('--popover-foreground', hexToHsl(b.bodyTextColor));
                        root.style.setProperty('--muted-foreground', hexToHsl(b.bodyTextColor));
                      }
                      if (b.headerBgColor) root.style.setProperty('--header-bg', hexToHsl(b.headerBgColor));
                      if (b.headerTextColor) root.style.setProperty('--header-text', hexToHsl(b.headerTextColor));
                      if (b.footerBgColor) root.style.setProperty('--footer-bg', hexToHsl(b.footerBgColor));
                      if (b.footerTextColor) root.style.setProperty('--footer-text', hexToHsl(b.footerTextColor));
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <I18nProvider>
            <SettingsLoader />
            <PageTransition>
              {children}
            </PageTransition>
          </I18nProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}