// src/hooks/useMenu.ts

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  MenuItemWithRelations,
  Category,
  MenuItemFilters,
  ApiResponse,
} from '@/types';

// ============= TYPES =============

interface MenuData {
  menuItems: MenuItemWithRelations[];
  categories: Category[];
}

interface UseMenuOptions {
  filters?: MenuItemFilters;
  enabled?: boolean;
}

interface UseMenuReturn {
  menuItems: MenuItemWithRelations[];
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============= API FUNCTIONS =============

async function fetchMenu(filters?: MenuItemFilters): Promise<MenuData> {
  const params = new URLSearchParams();
  
  if (filters?.categoryId) {
    params.append('categoryId', filters.categoryId);
  }
  if (filters?.isAvailable !== undefined) {
    params.append('isAvailable', filters.isAvailable.toString());
  }
  if (filters?.isVegetarian !== undefined) {
    params.append('isVegetarian', filters.isVegetarian.toString());
  }
  if (filters?.isVegan !== undefined) {
    params.append('isVegan', filters.isVegan.toString());
  }
  if (filters?.isGlutenFree !== undefined) {
    params.append('isGlutenFree', filters.isGlutenFree.toString());
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }

  const queryString = params.toString();
  const menuUrl = `/api/menu${queryString ? `?${queryString}` : ''}`;
  const categoriesUrl = '/api/menu?type=categories';

  // Fetch both menu items and categories in parallel
  const [menuResponse, categoriesResponse] = await Promise.all([
    fetch(menuUrl),
    fetch(categoriesUrl),
  ]);

  if (!menuResponse.ok) {
    throw new Error('Failed to fetch menu items');
  }

  if (!categoriesResponse.ok) {
    throw new Error('Failed to fetch categories');
  }

  const menuItems = await menuResponse.json();
  const categories = await categoriesResponse.json();

  return {
    menuItems: Array.isArray(menuItems) ? menuItems : [],
    categories: Array.isArray(categories) ? categories : [],
  };
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/menu?type=categories');

  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }

  const categories = await response.json();

  return Array.isArray(categories) ? categories : [];
}

// ============= HOOKS =============

/**
 * Hook for fetching menu items with optional filtering
 * Caches results for 5 minutes
 */
export function useMenu(options?: UseMenuOptions): UseMenuReturn {
  const { filters, enabled = true } = options || {};

  const {
    data,
    isLoading,
    error,
    refetch,
  }: UseQueryResult<MenuData, Error> = useQuery({
    queryKey: ['menu', filters],
    queryFn: () => fetchMenu(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    enabled,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  return {
    menuItems: data?.menuItems || [],
    categories: data?.categories || [],
    isLoading,
    error: error || null,
    refetch: () => {
      refetch();
    },
  };
}

/**
 * Hook for fetching only categories (lighter query)
 * Caches results for 5 minutes
 */
export function useCategories(): {
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const {
    data,
    isLoading,
    error,
    refetch,
  }: UseQueryResult<Category[], Error> = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });

  return {
    categories: data || [],
    isLoading,
    error: error || null,
    refetch: () => {
      refetch();
    },
  };
}

/**
 * Hook for fetching a single menu item by ID
 * Caches results for 5 minutes
 */
export function useMenuItem(menuItemId: string | null): {
  menuItem: MenuItemWithRelations | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const {
    data,
    isLoading,
    error,
    refetch,
  }: UseQueryResult<MenuItemWithRelations, Error> = useQuery({
    queryKey: ['menuItem', menuItemId],
    queryFn: async () => {
      if (!menuItemId) {
        throw new Error('Menu item ID is required');
      }

      const response = await fetch(`/api/menu/${menuItemId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch menu item');
      }

      const result: ApiResponse<MenuItemWithRelations> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch menu item');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!menuItemId,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  return {
    menuItem: data || null,
    isLoading,
    error: error || null,
    refetch: () => {
      refetch();
    },
  };
}

/**
 * Hook for filtering menu items client-side (when data is already fetched)
 * Useful for search/filter UI without additional API calls
 */
export function useFilteredMenuItems(
  menuItems: MenuItemWithRelations[],
  filters: MenuItemFilters
): MenuItemWithRelations[] {
  return menuItems.filter((item) => {
    // Category filter
    if (filters.categoryId && item.categoryId !== filters.categoryId) {
      return false;
    }

    // Availability filter
    if (filters.isAvailable !== undefined && item.isAvailable !== filters.isAvailable) {
      return false;
    }

    // Dietary filters
    if (filters.isVegetarian && !item.isVegetarian) {
      return false;
    }
    if (filters.isVegan && !item.isVegan) {
      return false;
    }
    if (filters.isGlutenFree && !item.isGlutenFree) {
      return false;
    }

    // Search filter (name or description)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const nameMatch = item.name.toLowerCase().includes(searchLower);
      const descriptionMatch = item.description?.toLowerCase().includes(searchLower);
      
      if (!nameMatch && !descriptionMatch) {
        return false;
      }
    }

    return true;
  });
}