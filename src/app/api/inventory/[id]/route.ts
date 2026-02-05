// src/app/api/inventory/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateStock } from '@/services/inventoryService';
import { z } from 'zod';

// ============= VALIDATION SCHEMAS =============

const updateStockSchema = z.object({
  adjustment: z.enum(['add', 'remove', 'set']),
  quantity: z.number().min(0, 'Quantity must be non-negative'),
  reason: z.string().optional(),
});

// ============= HELPER FUNCTIONS =============

/**
 * Determines stock status based on quantity and minimum level
 */
function getStockStatus(
  stockQuantity: number | null,
  minStockLevel: number | null,
  trackInventory: boolean
): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  if (!trackInventory || stockQuantity === null) {
    return 'IN_STOCK';
  }

  if (stockQuantity === 0) {
    return 'OUT_OF_STOCK';
  }

  if (minStockLevel !== null && stockQuantity <= minStockLevel) {
    return 'LOW_STOCK';
  }

  return 'IN_STOCK';
}

// ============= GET HANDLER =============

/**
 * GET /api/inventory/[id]
 * Fetches a single inventory item by ID
 * @param request - Next.js request object
 * @param params - Route parameters containing item ID
 * @returns Single inventory item with stock status
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid item ID',
        },
        { status: 400 }
      );
    }

    // Fetch item from database
    const item = await prisma.menuItem.findUnique({
      where: { id },
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

    // Check if item exists
    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: 'Inventory item not found',
        },
        { status: 404 }
      );
    }

    // Calculate stock status
    const stockStatus = getStockStatus(
      item.stockQuantity,
      item.minStockLevel,
      item.trackInventory
    );

    // Return item with stock status
    return NextResponse.json({
      success: true,
      data: {
        ...item,
        stockStatus,
      },
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch inventory item',
      },
      { status: 500 }
    );
  }
}

// ============= PATCH HANDLER =============

/**
 * PATCH /api/inventory/[id]
 * Updates stock quantity for an inventory item
 * @param request - Next.js request object with update data
 * @param params - Route parameters containing item ID
 * @returns Updated inventory item with stock changes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid item ID',
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateStockSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { adjustment, quantity, reason } = validationResult.data;

    // Update stock using service
    const result = await updateStock(id, {
      adjustment,
      quantity,
      reason,
    });

    // Calculate new stock status
    const stockStatus = getStockStatus(
      result.menuItem.stockQuantity,
      result.menuItem.minStockLevel,
      result.menuItem.trackInventory
    );

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        menuItem: {
          ...result.menuItem,
          stockStatus,
        },
        previousQuantity: result.previousQuantity,
        newQuantity: result.newQuantity,
        availabilityChanged: result.availabilityChanged,
      },
      message: result.availabilityChanged
        ? 'Stock updated and item marked as unavailable'
        : 'Stock updated successfully',
    });
  } catch (error) {
    console.error('Error updating inventory:', error);

    // Handle specific error cases
    if (error instanceof Error) {
      // Item not found
      if (error.message.includes('not found')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 404 }
        );
      }

      // Inventory tracking not enabled
      if (error.message.includes('inventory tracking')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 400 }
        );
      }

      // Invalid adjustment type or quantity
      if (error.message.includes('Invalid') || error.message.includes('must be')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 400 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update inventory',
      },
      { status: 500 }
    );
  }
}