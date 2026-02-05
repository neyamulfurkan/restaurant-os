// src/components/admin/Topbar.tsx

import React from 'react';
import { Bell, ChevronRight, User, Settings, LogOut } from 'lucide-react';
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

interface TopbarProps {
  breadcrumbs?: Array<{ label: string; href?: string }>;
  notificationCount?: number;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLogoutClick?: () => void;
}

export default function Topbar({
  breadcrumbs = [],
  notificationCount = 0,
  userName = 'Admin User',
  userEmail = 'admin@restaurant.com',
  userAvatar,
  onNotificationClick,
  onProfileClick,
  onSettingsClick,
  onLogoutClick,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-white px-4 py-3 lg:px-6">
      <div className="flex items-center justify-between">
        {/* Breadcrumbs - Hidden on mobile */}
        <div className="hidden items-center gap-2 md:flex">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              )}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="text-sm font-medium text-neutral-600 transition-colors hover:text-primary-600"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-sm font-semibold text-neutral-900">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Mobile: Show current page only */}
        <div className="flex items-center md:hidden">
          {breadcrumbs.length > 0 && (
            <h1 className="text-lg font-semibold text-neutral-900">
              {breadcrumbs[breadcrumbs.length - 1].label}
            </h1>
          )}
        </div>

        {/* Right side: Notifications and User Menu */}
        <div className="flex items-center gap-2">
          {/* Notification Button */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={onNotificationClick}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-neutral-600" />
            {notificationCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </Badge>
            )}
          </Button>

          {/* User Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2"
                aria-label="User menu"
              >
                {/* User Avatar */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  {userAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>

                {/* User Name - Hidden on mobile */}
                <div className="hidden flex-col items-start lg:flex">
                  <span className="text-sm font-semibold text-neutral-900">
                    {userName}
                  </span>
                  <span className="text-xs text-neutral-500">{userEmail}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  <p className="text-xs leading-none text-neutral-500">
                    {userEmail}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={onProfileClick}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={onSettingsClick}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={onLogoutClick}
                className="cursor-pointer text-error focus:bg-error/10 focus:text-error"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}