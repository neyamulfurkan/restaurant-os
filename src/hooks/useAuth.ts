// src/hooks/useAuth.ts

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { StaffRole } from '@/types';

interface User {
  id: string;
  name: string;
  email: string;
  role?: StaffRole;
  restaurantId?: string;
  isAdmin?: boolean;
  profileImage?: string | null;
  phone?: string | null;
}

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requireAuth: () => void;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profileData, setProfileData] = useState<{ profileImage?: string | null; phone?: string | null } | null>(null);

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  const fetchUserProfile = async (userId: string, role?: StaffRole) => {
    try {
      // Check if user is staff or customer based on role
      const endpoint = role ? `/api/staff/${userId}` : `/api/customers/${userId}`;
      const response = await fetch(endpoint);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setProfileData({
            profileImage: result.data.profileImage || null,
            phone: result.data.phone || null,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile(session.user.id, session.user.role as StaffRole | undefined);
    }
  }, [session?.user?.id, session?.user?.role]);

  const user = session?.user
    ? {
        id: session.user.id as string,
        name: session.user.name || '',
        email: session.user.email || '',
        role: session.user.role as StaffRole | undefined,
        restaurantId: session.user.restaurantId as string | undefined,
        isAdmin: session.user.isAdmin as boolean | undefined,
        profileImage: profileData?.profileImage || null,
        phone: profileData?.phone || null,
      }
    : null;

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn('customer-login', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.ok) {
        router.push('/menu');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const requireAuth = () => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    if (session?.user?.id) {
      await fetchUserProfile(session.user.id, session.user.role as StaffRole | undefined);
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    requireAuth,
    refreshUser,
  };
}