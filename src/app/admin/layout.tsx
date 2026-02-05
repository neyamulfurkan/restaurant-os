// src/app/admin/layout.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/admin/Sidebar';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { Menu, X, Bell, User, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import React from 'react';
import { SettingsLoader } from '@/components/shared/SettingsLoader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [notificationCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check authentication and admin role
  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') return;
    
    if (status === 'loading') return;

    // Redirect to admin login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/admin/login');
      return;
    }

    // Check if user has admin/staff role
    if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'KITCHEN' && session.user.role !== 'WAITER')) {
      router.push('/');
      return;
    }
  }, [status, session, router, pathname]);

  // Fetch active orders count
  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchActiveOrders = async () => {
      try {
        // TODO: Get actual restaurant ID from auth/context
        const restaurantId = 'cml1q2zai0000b3gh1wuau3so';
        const response = await fetch(`/api/orders?restaurantId=${restaurantId}&status=PENDING,ACCEPTED,PREPARING`);
        if (response.ok) {
          const data = await response.json();
          setActiveOrdersCount(data.pagination?.total || data.total || 0);
        }
      } catch (error) {
        console.error('Failed to fetch active orders:', error);
      }
    };

    fetchActiveOrders();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchActiveOrders, 30000);
    return () => clearInterval(interval);
  }, [status]);

  // Close sidebar when route changes (mobile only)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = paths.map((path, index) => {
      const href = '/' + paths.slice(0, index + 1).join('/');
      const label = path.charAt(0).toUpperCase() + path.slice(1);
      
      // Don't make last breadcrumb a link
      return {
        label,
        href: index === paths.length - 1 ? undefined : href,
      };
    });

    return breadcrumbs;
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNotificationClick = () => {
    // TODO: Implement notifications panel or page
    console.log('Notifications feature coming soon');
  };

  const handleProfileClick = () => {
    // TODO: Implement profile page
    console.log('Profile page coming soon');
  };

  const handleSettingsClick = () => {
    router.push('/admin/settings');
  };

  // Show loading spinner while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-50">
        <LoadingSpinner />
      </div>
    );
  }

  // Render login page without sidebar/topbar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Don't render layout if not authenticated or not staff
  if (status === 'unauthenticated' || !session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'KITCHEN' && session.user.role !== 'WAITER')) {
    return null;
  }

  const breadcrumbs = generateBreadcrumbs();

  return (
    <>
      <SettingsLoader />
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'hsl(var(--page-bg))' }}>
      {/* Mobile Overlay - Only visible when sidebar is open on mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Always visible on desktop, slide-in on mobile */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
          w-64 h-full
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          activeOrdersCount={activeOrdersCount}
          userName={session.user.name || 'Admin User'}
          userEmail={session.user.email || ''}
          userAvatar={session.user.image || null}
          userRole={session.user.role as 'ADMIN' | 'KITCHEN' | 'WAITER'}
          onLogout={handleLogout}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 h-full">
        {/* Topbar - Sticky at top with integrated hamburger */}
        <header className="sticky top-0 z-40 border-b bg-card px-4 py-3 lg:px-6" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center justify-between">
            {/* Left side: Hamburger (mobile) + Breadcrumbs */}
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <Button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                size="icon"
                variant="ghost"
                className="lg:hidden h-9 w-9"
                aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
              >
                {isSidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>

              {/* Breadcrumbs - Desktop */}
              <div className="hidden items-center gap-2 md:flex">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && (
                      <span className="text-neutral-400">/</span>
                    )}
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="text-sm font-medium text-neutral-600 hover:text-primary-600"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="text-sm font-semibold text-foreground">
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Mobile: Current page title */}
              <div className="md:hidden">
                {breadcrumbs.length > 0 && (
                  <h1 className="text-lg font-semibold text-foreground">
                    {breadcrumbs[breadcrumbs.length - 1].label}
                  </h1>
                )}
              </div>
            </div>

            {/* Right side: Notifications and User Menu */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNotificationClick}
                aria-label="Notifications"
                className="relative"
              >
                <Bell className="h-5 w-5 text-foreground" />
                {notificationCount > 0 && (
                  <Badge
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
                    style={{
                      backgroundColor: 'hsl(var(--destructive))',
                      color: 'white'
                    }}
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Badge>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{
                      backgroundColor: 'hsl(var(--primary) / 0.1)',
                      color: 'hsl(var(--primary))'
                    }}>
                      {session.user.image ? (
                        <img
                          src={session.user.image}
                          alt={session.user.name || 'User'}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    <div className="hidden flex-col items-start lg:flex">
                      <span className="text-sm font-semibold text-foreground">
                        {session.user.name || 'Admin User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {session.user.email || ''}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{session.user.name}</p>
                      <p className="text-xs text-muted-foreground">{session.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer"
                    style={{ color: 'hsl(var(--destructive))' }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
    </>
  );
}