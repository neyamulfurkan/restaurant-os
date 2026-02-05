// src/app/(customer)/account/layout.tsx

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { User, ShoppingBag, Calendar, MapPin, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';


interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id?: string;
}

interface AccountLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    name: 'Profile',
    href: '/account',
    icon: User,
  },
  {
    name: 'Orders',
    href: '/account/orders',
    icon: ShoppingBag,
  },
  {
    name: 'Bookings',
    href: '/account/bookings',
    icon: Calendar,
  },
  {
    name: 'Addresses',
    href: '/account/addresses',
    icon: MapPin,
  },
];

export default function AccountLayout({ children }: AccountLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [displayEmail, setDisplayEmail] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Fetch profile data (image, name, email) from database
  useEffect(() => {
    if (user?.id) {
      setProfileLoaded(false);
      fetch(`/api/customers/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            console.log('Sidebar loaded profile from database:', data.data);
            setProfileImage(data.data.profileImage || null);
            setDisplayName(data.data.name || '');
            setDisplayEmail(data.data.email || '');
            setProfileLoaded(true);
          }
        })
        .catch(err => {
          console.error('Failed to load profile:', err);
          // Fallback to session data on error
          setDisplayName(user?.name || '');
          setDisplayEmail(user?.email || '');
          setProfileLoaded(true);
        });
    }
  }, [user?.id, user?.name, user?.email]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      console.log('Sidebar received profile update:', event.detail);
      if (event.detail?.name) {
        console.log('Updating sidebar name to:', event.detail.name);
        setDisplayName(event.detail.name);
      }
      if (event.detail?.email) {
        console.log('Updating sidebar email to:', event.detail.email);
        setDisplayEmail(event.detail.email);
      }
      if (event.detail?.profileImage !== undefined) {
        console.log('Updating sidebar profile image to:', event.detail.profileImage);
        setProfileImage(event.detail.profileImage);
      }
    };

    window.addEventListener('profileUpdated' as any, handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated' as any, handleProfileUpdate);
    };
  }, []);

  

  // Protect route - redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--page-bg))' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-neutral-200" style={{ borderTopColor: 'hsl(var(--primary))' }} />
      </div>
    );
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: 'hsl(var(--page-bg))' }}>
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <div className="rounded-2xl shadow-md p-6 sticky top-24" style={{ backgroundColor: 'hsl(var(--card))' }}>
              {/* User Profile Info */}
              <div className="flex flex-col items-center mb-6 pb-6 border-b border-neutral-200">
                {!profileLoaded ? (
                  <>
                    <div className="w-20 h-20 rounded-full bg-neutral-200 animate-pulse mb-3" />
                    <div className="h-6 w-32 bg-neutral-200 animate-pulse rounded mb-2" />
                    <div className="h-4 w-40 bg-neutral-200 animate-pulse rounded" />
                  </>
                ) : (
                  <>
                    {profileImage || (user as SessionUser)?.image ? (
                      <div className="relative mb-3">
                        <Image
                          src={profileImage || (user as SessionUser).image || '/placeholder-avatar.png'}
                          alt={displayName || 'User'}
                          width={80}
                          height={80}
                          className="w-20 h-20 rounded-full object-cover"
                        />
                        <div 
                          className="absolute inset-0 rounded-full pointer-events-none"
                          style={{ 
                            boxShadow: `0 0 0 4px hsl(var(--primary) / 0.1)`
                          }}
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-3 relative"
                        style={{ 
                          backgroundColor: 'hsl(var(--primary) / 0.1)',
                          boxShadow: `0 0 0 4px hsl(var(--primary) / 0.1)`
                        }}
                      >
                        <span className="text-2xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
                          {displayName?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    <h3 className="font-semibold text-lg text-center" style={{ color: 'hsl(var(--foreground))' }}>
                      {displayName}
                    </h3>
                    <p className="text-sm text-center break-all" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                      {displayEmail}
                    </p>
                  </>
                )}
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                        isActive
                          ? 'font-semibold shadow-sm'
                          : 'hover:bg-neutral-50'
                      )}
                      style={isActive ? {
                        backgroundColor: 'hsl(var(--primary) / 0.1)',
                        color: 'hsl(var(--primary))'
                      } : {
                        color: 'hsl(var(--foreground) / 0.7)'
                      }}
                    >
                      <Icon 
                        className="w-5 h-5" 
                        style={isActive ? { color: 'hsl(var(--primary))' } : {}}
                      />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Logout Button */}
              <div className="mt-6 pt-6 border-t border-neutral-200">
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-red-50"
                  style={{ color: 'hsl(var(--destructive))' }}
                  onClick={() => {
                    import('next-auth/react').then((mod) => mod.signOut({ callbackUrl: '/' }));
                  }}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-3">
            <div className="rounded-2xl shadow-md p-6 lg:p-8" style={{ backgroundColor: 'hsl(var(--card))' }}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}