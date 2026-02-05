// src/app/api/inventory/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

import {
  getInventory,
  updateStock,
  getInventoryStats,
  type InventoryFilters,
  type StockStatus,
} from '@/services/inventoryService';
import { ApiResponse } from '@/types';

// ============= VALIDATION SCHEMAS =============

const inventoryFiltersSchema = z.object({
  categoryId: z.string().optional(),
  status: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).optional(),
  search: z.string().optional(),
  trackInventoryOnly: z.boolean().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(50),
});

const updateStockSchema = z.object({
  itemId: z.string().min(1, 'Menu item ID is required'),
  adjustment: z.enum(['add', 'remove', 'set'], {
    required_error: 'Adjustment type is required',
  }),
  quantity: z.number().int().nonnegative('Quantity must be a positive number'),
  reason: z.string().optional(),
});

// ============= GET HANDLER =============

/**
 * GET /api/inventory
 * Retrieves inventory items with stock status and optional filters
 * Query params: categoryId, status, search, trackInventoryOnly, page, pageSize
 * Requires admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    // Check if user is admin or staff
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'KITCHEN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin or Kitchen access required' } as ApiResponse,
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const params = {
      categoryId: searchParams.get('categoryId') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      trackInventoryOnly: searchParams.get('trackInventoryOnly') === 'true',
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '50',
    };

    const validated = inventoryFiltersSchema.parse(params);

    // Build filters for service
    const filters: InventoryFilters = {
      categoryId: validated.categoryId,
      status: validated.status as StockStatus,
      search: validated.search,
      trackInventoryOnly: validated.trackInventoryOnly,
    };

    // Fetch inventory items
    const allItems = await getInventory(filters);

    // Implement pagination
    const startIndex = (validated.page - 1) * validated.pageSize;
    const endIndex = startIndex + validated.pageSize;
    const paginatedItems = allItems.slice(startIndex, endIndex);

    // Get inventory statistics
    const stats = await getInventoryStats();

    // Fetch categories for filter dropdown
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Return response with pagination
    return NextResponse.json({
      items: paginatedItems,
      categories: categories,
      stats,
      pagination: {
        total: allItems.length,
        page: validated.page,
        pageSize: validated.pageSize,
        totalPages: Math.ceil(allItems.length / validated.pageSize),
      },
    });
  } catch (error) {
    console.error('Inventory GET error:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch inventory',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// ============= POST HANDLER =============

/**
 * POST /api/inventory
 * Updates stock quantity for a menu item
 * Body: { menuItemId, adjustment, quantity, reason }
 * Requires admin or kitchen authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    // Check if user is admin or kitchen staff
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'KITCHEN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin or Kitchen access required' } as ApiResponse,
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = updateStockSchema.parse(body);

    // Update stock using service
    const result = await updateStock(validated.itemId, {
      adjustment: validated.adjustment,
      quantity: validated.quantity,
      reason: validated.reason,
    });

    // Prepare response message
    let message = `Stock ${validated.adjustment === 'set' ? 'set to' : validated.adjustment === 'add' ? 'increased by' : 'decreased by'} ${validated.quantity}`;
    
    if (result.availabilityChanged) {
      message += '. Item marked as unavailable due to out of stock';
    }

    // Return success response
    return NextResponse.json({
      menuItem: result.menuItem,
      previousQuantity: result.previousQuantity,
      newQuantity: result.newQuantity,
      availabilityChanged: result.availabilityChanged,
      message,
    });
  } catch (error) {
    console.error('Inventory POST error:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Handle service-level errors (e.g., item not found, invalid operation)
    if (error instanceof Error) {
      // Check for specific error messages
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: error.message } as ApiResponse,
          { status: 404 }
        );
      }

      if (
        error.message.includes('does not have inventory tracking') ||
        error.message.includes('must be a positive number')
      ) {
        return NextResponse.json(
          { success: false, error: error.message } as ApiResponse,
          { status: 400 }
        );
      }
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update stock',
      } as ApiResponse,
      { status: 500 }
    );
  }
}
// ============= PATCH HANDLER (Bulk Update) =============

/**
 * PATCH /api/inventory
 * Bulk updates stock quantities for multiple items
 * Body: { updates: [{ itemId, quantity }] }
 * Requires admin or kitchen authentication
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    // Check if user is admin or kitchen staff
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'KITCHEN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin or Kitchen access required' } as ApiResponse,
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const updates = body.updates as Array<{ itemId: string; quantity: number }>;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Updates array is required and must not be empty' } as ApiResponse,
        { status: 400 }
      );
    }

    // Process each update
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ itemId: string; error: string }>,
    };

    for (const update of updates) {
      try {
        if (!update.itemId || typeof update.quantity !== 'number') {
          throw new Error('Invalid update format');
        }

        await updateStock(update.itemId, {
          adjustment: 'set',
          quantity: update.quantity,
        });
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          itemId: update.itemId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      successful: results.successful,
      failed: results.failed,
      errors: results.errors,
      message: `Updated ${results.successful} items successfully${results.failed > 0 ? `. Failed: ${results.failed}` : ''}`,
    });
  } catch (error) {
    console.error('Bulk inventory update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform bulk update',
      } as ApiResponse,
      { status: 500 }
    );
  }
}