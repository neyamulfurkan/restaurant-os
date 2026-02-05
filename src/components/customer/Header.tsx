// src/components/customer/Header.tsx

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

import { usePathname } from 'next/navigation';
import { ShoppingCart, Menu, X, Globe, User, LogOut, Calendar, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCart } from '@/hooks/useCart';
import { useSession, signOut } from 'next-auth/react';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';


const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/booking', label: 'Book Table' },
  { href: '/contact', label: 'Contact' },
  { href: '/account/orders', label: 'Track Order' },
];

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

interface HeaderProps {
  onCartOpen?: () => void;
}

export function Header({ onCartOpen }: HeaderProps = { onCartOpen: () => {} }) {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { data: session, status } = useSession();
  const { restaurantName, logoUrl } = useSettingsStore();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const { branding } = useSettingsStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [headerProfileLoaded, setHeaderProfileLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch - mount on client only
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch profile data from database (overrides session)
  useEffect(() => {
    if (session?.user?.id) {
      setHeaderProfileLoaded(false);
      const fetchProfile = async () => {
        try {
          console.log('Header fetching profile from database...');
          const response = await fetch(`/api/customers/${session.user.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              console.log('Header loaded profile from database:', result.data);
              setProfileImage(result.data.profileImage || null);
              setDisplayName(result.data.name || '');
              setHeaderProfileLoaded(true);
            }
          } else {
            // Fallback to session on error
            setDisplayName(session.user.name || '');
            setHeaderProfileLoaded(true);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          // Fallback to session on error
          setDisplayName(session.user.name || '');
          setHeaderProfileLoaded(true);
        }
      };
      fetchProfile();
    }
  }, [session?.user?.id, session?.user?.name]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      console.log('Header received profile update:', event.detail);
      if (event.detail?.profileImage !== undefined) {
        setProfileImage(event.detail.profileImage);
      }
      if (event.detail?.name) {
        setDisplayName(event.detail.name);
      }
    };

    window.addEventListener('profileUpdated' as any, handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated' as any, handleProfileUpdate);
    };
  }, []);

  // Handle scroll for glassmorphism effect
  useEffect(() => {
    const handleScroll = () => {
      if (branding.headerTransparentOverMedia) {
        // Track scroll to detect if past hero on homepage
        if (pathname === '/') {
          setIsScrolled(window.scrollY > (window.innerHeight - 80));
        } else {
          setIsScrolled(true); // Always "scrolled" on non-home pages
        }
      } else {
        setIsScrolled(window.scrollY > 10);
      }
    };

    handleScroll(); // Check initial state
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [branding.headerTransparentOverMedia, pathname]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.language-selector')) {
        setIsLanguageOpen(false);
      }
    };

    if (isLanguageOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isLanguageOpen]);

  const handleLanguageSelect = (code: string) => {
    setSelectedLanguage(code);
    setIsLanguageOpen(false);
    // TODO: Implement actual language change logic
  };

  const currentLanguage = LANGUAGES.find((lang) => lang.code === selectedLanguage);

  // Determine if header should be fully transparent
  const isHomePage = pathname === '/';
  // Always transparent when setting is enabled
  const shouldBeTransparent = branding.headerTransparentOverMedia;
  // Check if we're past hero section on homepage
  const isPastHero = isHomePage && isScrolled;
  // Text should be white when: transparent is on AND (on homepage AND NOT past hero) OR (not on homepage)
  // In other words: white when over hero image on home, or always white on other pages when transparent
  const useWhiteText = shouldBeTransparent && (isHomePage ? !isPastHero : true);
  const hasMediaBehind = isHomePage && !isPastHero;

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        shouldBeTransparent
          ? 'backdrop-blur-[2px]'
          : isScrolled
            ? 'backdrop-blur-md shadow-md'
            : 'backdrop-blur-md',
        'mb-0'
      )}
      style={{
        backgroundColor: shouldBeTransparent
          ? hasMediaBehind
            ? 'rgba(0, 0, 0, 0.05)'
            : 'rgba(0, 0, 0, 0.35)'
          : `${branding.headerBgColor}cc`,
        color: shouldBeTransparent ? '#ffffff' : branding.headerTextColor,
      }}
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            {logoUrl ? (
              <div className="h-9 w-9 md:h-12 md:w-12 rounded-full overflow-hidden ring-2 ring-primary-100 group-hover:ring-primary-300 transition-all duration-200 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={restaurantName}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-9 w-9 md:h-12 md:w-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200 flex-shrink-0">
                <span className="text-white font-bold text-base md:text-2xl">
                  {restaurantName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span 
              className="text-base md:text-xl font-bold hidden sm:block group-hover:text-primary-600 transition-colors duration-200 max-w-[120px] sm:max-w-none truncate"
              style={{ color: useWhiteText ? '#ffffff' : branding.headerTextColor }}
            >
              {restaurantName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={true}
                className={cn(
                  'text-base font-medium transition-colors duration-200',
                  pathname === link.href
                    ? 'text-primary-600'
                    : 'hover:text-primary-600'
                )}
                style={{ color: useWhiteText ? '#ffffff' : (pathname === link.href ? undefined : branding.headerTextColor) }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Section: Language, Cart, Login */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Language Selector (Desktop) */}
            <div className="hidden md:block relative language-selector">
              <button
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                className="flex items-center space-x-2 hover:text-primary-600 transition-colors duration-200"
                aria-label="Select language"
                style={{ color: useWhiteText ? '#ffffff' : branding.headerTextColor }}
              >
                <Globe className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {currentLanguage?.flag} {currentLanguage?.code.toUpperCase()}
                </span>
              </button>

              {/* Language Dropdown */}
              {isLanguageOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-neutral-100 py-2 min-w-[160px]">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageSelect(lang.code)}
                      className={cn(
                        'w-full px-4 py-2 text-left flex items-center space-x-2 transition-colors duration-200',
                        lang.code === selectedLanguage
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-neutral-700 hover:bg-neutral-50'
                      )}
                    >
                      <span>{lang.flag}</span>
                      <span className="text-sm font-medium">{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Icon with Badge */}
            <button
              onClick={onCartOpen}
              className="relative p-1.5 md:p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
              aria-label="Shopping cart"
              suppressHydrationWarning
            >
              <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" style={{ color: useWhiteText ? '#ffffff' : branding.headerTextColor }} />
              {mounted && itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 bg-accent-500 text-white text-[10px] md:text-xs font-bold rounded-full h-4 w-4 md:h-5 md:w-5 flex items-center justify-center animate-pulse-slow">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>

            {/* Login/User Profile (Desktop) */}
            <div suppressHydrationWarning>
            {!mounted || status === 'loading' ? (
              <div className="hidden md:flex items-center justify-center w-10 h-10">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hidden md:flex items-center gap-2 hover:bg-neutral-100"
                  >
                    {profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profileImage}
                        alt={session.user.name || 'User'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                        {session.user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <span className="font-medium" style={{ color: useWhiteText ? '#ffffff' : branding.headerTextColor }}>
                      {headerProfileLoaded ? (displayName?.split(' ')[0] || 'User') : (session.user.name?.split(' ')[0] || 'User')}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-48"
                  style={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                  }}
                >
                  <DropdownMenuItem asChild>
                    <Link 
                      href="/account" 
                      className="flex items-center gap-2 cursor-pointer"
                      style={{ color: 'hsl(var(--foreground))' }}
                    >
                      <User className="w-4 h-4" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      href="/account/orders" 
                      className="flex items-center gap-2 cursor-pointer"
                      style={{ color: 'hsl(var(--foreground))' }}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      href="/account/bookings" 
                      className="flex items-center gap-2 cursor-pointer"
                      style={{ color: 'hsl(var(--foreground))' }}
                    >
                      <Calendar className="w-4 h-4" />
                      My Bookings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator style={{ backgroundColor: 'hsl(var(--border))' }} />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="cursor-pointer"
                    style={{ color: 'hsl(var(--destructive))' }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                variant="outline"
                className="hidden md:inline-flex border-2 border-primary-500 text-primary-600 hover:bg-primary-50 font-semibold"
              >
                <Link href="/login">
                  <User className="w-4 h-4 mr-2" />
                  Login
                </Link>
              </Button>
            )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-1.5 md:p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 md:w-6 md:h-6" style={{ color: useWhiteText ? '#ffffff' : branding.headerTextColor }} />
              ) : (
                <Menu className="w-5 h-5 md:w-6 md:h-6" style={{ color: useWhiteText ? '#ffffff' : branding.headerTextColor }} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className={cn(
            'lg:hidden py-4 border-t rounded-b-xl shadow-lg backdrop-blur-md',
            'animate-in slide-in-from-top-4 fade-in-0 duration-300',
            shouldBeTransparent ? 'border-white/20' : 'border-neutral-200'
          )} style={{ backgroundColor: shouldBeTransparent ? (hasMediaBehind ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.55)') : branding.headerBgColor }}>
            <nav className="flex flex-col space-y-2">
              {NAV_LINKS.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-4 py-3 rounded-lg text-base font-medium transition-all duration-300',
                    'animate-in slide-in-from-left fade-in-0',
                    'hover:scale-[1.02] hover:shadow-md active:scale-[0.98]',
                    shouldBeTransparent
                      ? pathname === link.href
                        ? 'bg-white/20 text-white'
                        : 'text-white/90 hover:bg-white/10'
                      : pathname === link.href
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-neutral-700 hover:bg-neutral-50'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile Language Selector */}
              <div className="px-4 py-2 animate-in slide-in-from-bottom fade-in-0 duration-300" style={{ animationDelay: '200ms' }}>
                <div className={cn(
                  'text-sm font-medium mb-2',
                  shouldBeTransparent ? 'text-white/70' : 'text-neutral-600'
                )}>
                  Language
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageSelect(lang.code)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all duration-300',
                        'hover:scale-105 active:scale-95',
                        shouldBeTransparent
                          ? lang.code === selectedLanguage
                            ? 'bg-white/20 text-white border-2 border-white/50'
                            : 'bg-white/10 text-white/80 border-2 border-transparent hover:border-white/30'
                          : lang.code === selectedLanguage
                            ? 'bg-primary-50 text-primary-600 border-2 border-primary-500'
                            : 'bg-neutral-50 text-neutral-700 border-2 border-transparent hover:border-neutral-200'
                      )}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Login/User Section */}
              <div className="px-4 pt-2 animate-in slide-in-from-bottom fade-in-0 duration-300" style={{ animationDelay: '300ms' }}>
                {!mounted || status === 'loading' ? (
                  <div className="flex items-center justify-center py-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
                  </div>
                ) : session?.user ? (
                  <div className="space-y-3">
                    <div className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300',
                      'hover:scale-[1.02]',
                      shouldBeTransparent
                        ? 'bg-white/10 border-white/20'
                        : 'bg-primary-50 border-primary-100'
                    )}>
                      {profileImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profileImage}
                          alt={session.user.name || 'User'}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold">
                          {session.user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <div className={cn('font-semibold', shouldBeTransparent ? 'text-white' : 'text-neutral-900')}>{displayName || session.user.name}</div>
                        <div className={cn('text-sm', shouldBeTransparent ? 'text-white/60' : 'text-neutral-600')}>{session.user.email}</div>
                      </div>
                    </div>
                    <Link href="/account">
                      <Button variant="outline" className={cn('w-full justify-start h-12 text-base font-medium transition-all duration-300', 'hover:scale-[1.02] active:scale-[0.98]', shouldBeTransparent && 'border-white/30 text-white hover:bg-white/10')}>
                        <User className="w-5 h-5 mr-3" />
                        My Account
                      </Button>
                    </Link>
                    <Link href="/account/orders">
                      <Button variant="outline" className={cn('w-full justify-start h-12 text-base font-medium transition-all duration-300', 'hover:scale-[1.02] active:scale-[0.98]', shouldBeTransparent && 'border-white/30 text-white hover:bg-white/10')}>
                        <ShoppingBag className="w-5 h-5 mr-3" />
                        My Orders
                      </Button>
                    </Link>
                    <Link href="/account/bookings">
                      <Button variant="outline" className={cn('w-full justify-start h-12 text-base font-medium transition-all duration-300', 'hover:scale-[1.02] active:scale-[0.98]', shouldBeTransparent && 'border-white/30 text-white hover:bg-white/10')}>
                        <Calendar className="w-5 h-5 mr-3" />
                        My Bookings
                      </Button>
                    </Link>
                    <Button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      variant="outline"
                      className={cn('w-full justify-start h-12 text-base font-medium transition-all duration-300', 'hover:scale-[1.02] active:scale-[0.98]', shouldBeTransparent ? 'border-red-400/50 text-red-400 hover:bg-red-500/10' : 'text-error-500 border-error-500 hover:bg-error-50')}
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Button
                    asChild
                    className="w-full h-12 text-base bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg"
                  >
                    <Link href="/login">
                      <User className="w-5 h-5 mr-3" />
                      Login / Sign Up
                    </Link>
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}