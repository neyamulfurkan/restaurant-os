// src/app/api/menu/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createMenuItemSchema,
  menuItemQuerySchema,
} from '@/validations/menu';
import { z } from 'zod';
import type { ApiResponse, MenuItemWithRelations } from '@/types';

// ============= GET HANDLER (Fetch all menu items with filters) =============

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Check if requesting only categories
    if (searchParams.get('type') === 'categories') {
      const categories = await prisma.category.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          sortOrder: true,
          isActive: true,
          restaurantId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return NextResponse.json(categories, { status: 200 });
    }

    // Parse and validate query parameters
    const queryParams = {
      categoryId: searchParams.get('categoryId') || undefined,
      isAvailable: searchParams.get('isAvailable')
        ? searchParams.get('isAvailable') === 'true'
        : undefined,
      isVegetarian: searchParams.get('isVegetarian')
        ? searchParams.get('isVegetarian') === 'true'
        : undefined,
      isVegan: searchParams.get('isVegan')
        ? searchParams.get('isVegan') === 'true'
        : undefined,
      isGlutenFree: searchParams.get('isGlutenFree')
        ? searchParams.get('isGlutenFree') === 'true'
        : undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'sortOrder',
      sortOrder: searchParams.get('sortOrder') || 'asc',
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    // Validate query parameters
    const validatedParams = menuItemQuerySchema.parse(queryParams);

    // Build where clause
    const where: any = {
      restaurantId: searchParams.get('restaurantId') || undefined, // Optional restaurant filter
    };

    if (validatedParams.categoryId) {
      where.categoryId = validatedParams.categoryId;
    }

    if (validatedParams.isAvailable !== undefined) {
      where.isAvailable = validatedParams.isAvailable;
    }

    if (validatedParams.isVegetarian !== undefined) {
      where.isVegetarian = validatedParams.isVegetarian;
    }

    if (validatedParams.isVegan !== undefined) {
      where.isVegan = validatedParams.isVegan;
    }

    if (validatedParams.isGlutenFree !== undefined) {
      where.isGlutenFree = validatedParams.isGlutenFree;
    }

    if (validatedParams.search) {
      where.OR = [
        { name: { contains: validatedParams.search, mode: 'insensitive' } },
        { description: { contains: validatedParams.search, mode: 'insensitive' } },
      ];
    }

    // Calculate pagination
    const skip = (validatedParams.page - 1) * validatedParams.limit;

    // Fetch total count
    const total = await prisma.menuItem.count({ where });

    // Fetch menu items with relations
    const menuItems = await prisma.menuItem.findMany({
      where,
      include: {
        category: true,
        customizationGroups: {
          include: {
            options: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        [validatedParams.sortBy]: validatedParams.sortOrder,
      },
      skip,
      take: validatedParams.limit,
    });

    const cacheControl = validatedParams.isAvailable !== undefined && validatedParams.isAvailable
      ? 'public, s-maxage=60, stale-while-revalidate=120'
      : 'public, s-maxage=300, stale-while-revalidate=600';

    // Build response - return just the data array for simple requests
    // If pagination params are provided, return full paginated response
    if (validatedParams.page === 1 && validatedParams.limit === 20 && !searchParams.get('page')) {
      // Simple request - return just data array
      return NextResponse.json(menuItems as MenuItemWithRelations[], { 
        status: 200,
        headers: {
          'Cache-Control': cacheControl,
        },
      });
    }

    // Paginated request - return full response
    return NextResponse.json(
      {
        data: menuItems as MenuItemWithRelations[],
        pagination: {
          total,
          page: validatedParams.page,
          pageSize: validatedParams.limit,
          totalPages: Math.ceil(total / validatedParams.limit),
        },
      },
      {
        headers: {
          'Cache-Control': cacheControl,
        },
      }
    );
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Handle other errors
    console.error('GET /api/menu error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch menu items',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// ============= POST HANDLER (Create new menu item) =============

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/menu route hit');
    console.log('Request URL:', request.url);
    
    const { searchParams } = new URL(request.url);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const typeParam = searchParams.get('type');
    console.log('Type parameter:', typeParam);

    // Handle category creation
    if (typeParam === 'category') {
      console.log('=== CATEGORY CREATION ===');
      console.log('Category creation branch triggered');
      const body = await request.json();
      console.log('Category request body:', body);
      
      // Validate category data
      const { name, description } = body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Category name is required',
          },
          { status: 400 }
        );
      }

      // Get the first restaurant (since we're in single-restaurant mode for now)
      const restaurant = await prisma.restaurant.findFirst();
      console.log('Found restaurant:', restaurant ? restaurant.id : 'NONE');
      
      if (!restaurant) {
        console.error('No restaurant found in database');
        return NextResponse.json(
          {
            success: false,
            error: 'No restaurant found. Please create a restaurant first.',
          },
          { status: 404 }
        );
      }

      // Check if category with same name already exists
      const existingCategory = await prisma.category.findFirst({
        where: {
          restaurantId: restaurant.id,
          name: name.trim(),
        },
      });

      if (existingCategory) {
        return NextResponse.json(
          {
            success: false,
            error: 'A category with this name already exists',
          },
          { status: 409 }
        );
      }

      // Get the highest sortOrder to append new category at the end
      const lastCategory = await prisma.category.findFirst({
        where: { restaurantId: restaurant.id },
        orderBy: { sortOrder: 'desc' },
      });

      const sortOrder = lastCategory ? lastCategory.sortOrder + 1 : 0;

      // Create the category
      console.log('Creating category with data:', {
        name: name.trim(),
        description: description?.trim() || null,
        restaurantId: restaurant.id,
        sortOrder,
        isActive: true,
      });
      
      const category = await prisma.category.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          restaurantId: restaurant.id,
          sortOrder,
          isActive: true,
        },
      });
      
      console.log('Category created successfully:', category);

      console.log('Returning success response');
      return NextResponse.json(
        {
          success: true,
          data: category,
          message: 'Category created successfully',
        },
        { status: 201 }
      );
    }

    // Handle menu item creation (existing code)
    // Parse request body
    const body = await request.json();

    // Log the incoming request body
    console.log('POST /api/menu - Request body:', JSON.stringify(body, null, 2));

    // Validate request body
    const validatedData = createMenuItemSchema.parse(body);
    
    console.log('POST /api/menu - Validated data:', JSON.stringify(validatedData, null, 2));

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: validatedData.categoryId },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category not found',
        } as ApiResponse,
        { status: 404 }
      );
    }

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: validatedData.restaurantId },
    });

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Restaurant not found',
        } as ApiResponse,
        { status: 404 }
      );
    }

    // Create menu item with customization groups (if provided)
    const menuItem = await prisma.menuItem.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        price: validatedData.price,
        imageUrl: validatedData.imageUrl,
        isAvailable: validatedData.isAvailable ?? true,
        isVegetarian: validatedData.isVegetarian ?? false,
        isVegan: validatedData.isVegan ?? false,
        isGlutenFree: validatedData.isGlutenFree ?? false,
        allergens: validatedData.allergens ?? [],
        prepTime: validatedData.prepTime ?? 15,
        calories: validatedData.calories,
        sortOrder: validatedData.sortOrder ?? 0,
        categoryId: validatedData.categoryId,
        restaurantId: validatedData.restaurantId,
        trackInventory: validatedData.trackInventory ?? false,
        stockQuantity: validatedData.stockQuantity,
        minStockLevel: validatedData.minStockLevel,
        customizationGroups: validatedData.customizationGroups
          ? {
              create: validatedData.customizationGroups.map((group) => ({
                name: group.name,
                type: group.type,
                isRequired: group.isRequired ?? false,
                maxSelections: group.maxSelections ?? 1,
                sortOrder: group.sortOrder ?? 0,
                options: group.options
                  ? {
                      create: group.options.map((option) => ({
                        name: option.name,
                        priceModifier: option.priceModifier,
                        isAvailable: option.isAvailable ?? true,
                        sortOrder: option.sortOrder ?? 0,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        customizationGroups: {
          include: {
            options: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: menuItem,
        message: 'Menu item created successfully',
      } as ApiResponse<MenuItemWithRelations>,
      { status: 201 }
    );
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        {
          success: false,
          error: 'A menu item with this name already exists in this category',
        } as ApiResponse,
        { status: 409 }
      );
    }

    // Handle other errors
    console.error('POST /api/menu error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create menu item',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse,
      { status: 500 }
    );
  }
}