// src/app/api/menu/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateMenuItemSchema } from '@/validations/menu';
import { z } from 'zod';

// ============= GET SINGLE MENU ITEM =============

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid menu item ID' },
        { status: 400 }
      );
    }

    // Fetch menu item with all relations
    const menuItem = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: true,
        customizationGroups: {
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!menuItem) {
      return NextResponse.json(
        { success: false, error: 'Menu item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    console.error('GET /api/menu/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch menu item' },
      { status: 500 }
    );
  }
}

// ============= UPDATE MENU ITEM =============

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid menu item ID' },
        { status: 400 }
      );
    }

    // Check if menu item exists
    const existingItem = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'Menu item not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = updateMenuItemSchema.parse(body);

    // Update menu item
    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.price !== undefined && { price: validated.price }),
        ...(validated.imageUrl !== undefined && { imageUrl: validated.imageUrl }),
        ...(validated.isAvailable !== undefined && { isAvailable: validated.isAvailable }),
        ...(validated.isVegetarian !== undefined && { isVegetarian: validated.isVegetarian }),
        ...(validated.isVegan !== undefined && { isVegan: validated.isVegan }),
        ...(validated.isGlutenFree !== undefined && { isGlutenFree: validated.isGlutenFree }),
        ...(validated.allergens !== undefined && { allergens: validated.allergens }),
        ...(validated.prepTime !== undefined && { prepTime: validated.prepTime }),
        ...(validated.calories !== undefined && { calories: validated.calories }),
        ...(validated.sortOrder !== undefined && { sortOrder: validated.sortOrder }),
        ...(validated.categoryId !== undefined && { categoryId: validated.categoryId }),
        ...(validated.trackInventory !== undefined && { trackInventory: validated.trackInventory }),
        ...(validated.stockQuantity !== undefined && { stockQuantity: validated.stockQuantity }),
        ...(validated.minStockLevel !== undefined && { minStockLevel: validated.minStockLevel }),
      },
      include: {
        category: true,
        customizationGroups: {
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    // If stock reaches zero, automatically mark as unavailable
    if (
      updatedItem.trackInventory &&
      updatedItem.stockQuantity !== null &&
      updatedItem.stockQuantity <= 0 &&
      updatedItem.isAvailable
    ) {
      await prisma.menuItem.update({
        where: { id },
        data: { isAvailable: false },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: 'Menu item updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('PATCH /api/menu/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update menu item' },
      { status: 500 }
    );
  }
}

// ============= DELETE MENU ITEM =============

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid menu item ID' },
        { status: 400 }
      );
    }

    // Check if menu item exists
    const existingItem = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        orderItems: {
          take: 1, // Just check if any exist
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'Menu item not found' },
        { status: 404 }
      );
    }

    // Check if item has order history
    if (existingItem.orderItems.length > 0) {
      // Soft delete - set isAvailable to false (preserve order history)
      const softDeletedItem = await prisma.menuItem.update({
        where: { id },
        data: { isAvailable: false },
        include: {
          category: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: softDeletedItem,
        message: 'Menu item marked as unavailable (has order history)',
      });
    }

    // Hard delete - permanently remove from database
    await prisma.menuItem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Menu item permanently deleted',
    });
  } catch (error) {
    console.error('DELETE /api/menu/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete menu item' },
      { status: 500 }
    );
  }
}