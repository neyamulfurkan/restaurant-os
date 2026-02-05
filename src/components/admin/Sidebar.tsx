// src/components/admin/Sidebar.tsx

'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Calendar,
  BookOpen,
  Package,
  Users,
  UserCircle,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';


interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface SidebarProps {
  activeOrdersCount?: number;
  userName?: string;
  userEmail?: string;
  userAvatar?: string | null;
  userRole?: 'ADMIN' | 'KITCHEN' | 'WAITER';
  onLogout?: () => void;
}

export default function Sidebar({
  activeOrdersCount = 0,
  userName = 'Admin User',
  userEmail = 'admin@restaurant.com',
  userAvatar = null,
  userRole = 'ADMIN',
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const { restaurantName, logoUrl } = useSettingsStore();

  // Define all navigation items
  const allNavItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Orders',
      href: '/admin/orders',
      icon: ShoppingBag,
      badge: activeOrdersCount,
    },
    {
      name: 'Bookings',
      href: '/admin/bookings',
      icon: Calendar,
    },
    {
      name: 'Menu',
      href: '/admin/menu',
      icon: BookOpen,
    },
    {
      name: 'Inventory',
      href: '/admin/inventory',
      icon: Package,
    },
    {
      name: 'Customers',
      href: '/admin/customers',
      icon: Users,
    },
    {
      name: 'Staff',
      href: '/admin/staff',
      icon: UserCircle,
    },
    {
      name: 'Reports',
      href: '/admin/reports',
      icon: FileText,
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
    },
  ];

  // Filter navigation items based on role
  const navItems = React.useMemo(() => {
    if (userRole === 'KITCHEN') {
      // Kitchen: Only Orders and Inventory
      return allNavItems.filter(item => 
        item.href === '/admin/orders' || item.href === '/admin/inventory'
      );
    } else if (userRole === 'WAITER') {
      // Waiter: Only Orders and Bookings
      return allNavItems.filter(item => 
        item.href === '/admin/orders' || item.href === '/admin/bookings'
      );
    }
    // Admin: All items
    return allNavItems;
  }, [userRole, activeOrdersCount]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  // Generate initials from name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-50 border-r" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--border))' }}>
      {/* Logo and Restaurant Name */}
      <div className="p-6 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          {logoUrl ? (
            <div className="relative w-12 h-12 flex-shrink-0">
              <Image
                src={logoUrl}
                alt={restaurantName}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'hsl(var(--primary))' }}>
              <span className="text-xl font-bold" style={{ color: 'hsl(var(--primary-foreground))' }}>
                {getInitials(restaurantName)}
              </span>
            </div>
          )}
          <span className="text-lg font-semibold truncate">
            {restaurantName}
          </span>
        </Link>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 group relative'
                  )}
                  style={isActive ? {
                    backgroundColor: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                    boxShadow: '0 4px 12px -2px hsl(var(--primary) / 0.3)'
                  } : {
                    color: 'hsl(var(--muted-foreground))'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'hsl(var(--muted))';
                      e.currentTarget.style.color = 'hsl(var(--foreground))';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '';
                      e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
                    }
                  }}
                >
                  <Icon
                    className="w-5 h-5 flex-shrink-0"
                  />
                  <span className="font-medium flex-1">{item.name}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="border-t p-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="flex items-center gap-3 mb-3">
          {userAvatar ? (
            <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={userAvatar}
                alt={userName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'hsl(var(--muted))' }}>
              <span className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                {getInitials(userName)}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>
              {userName}
            </p>
            <p className="text-xs truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{userEmail}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          style={{ color: 'hsl(var(--muted-foreground))' }}
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  );
}