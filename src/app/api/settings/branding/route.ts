// src/app/api/settings/branding/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';

import { UpdateBrandingRequest } from '@/types';
import { z } from 'zod';

// Validation schema for branding updates
const brandingSchema = z.object({
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format').optional(),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format').optional(),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format').optional(),
  fontFamily: z.string().min(1).max(100).optional(),
});

/**
 * POST /api/settings/branding
 * Updates restaurant branding (colors, fonts)
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role
    const staff = await prisma.staff.findUnique({
      where: { email: session.user.email! },
      select: { role: true, restaurantId: true, isActive: true },
    });

    if (!staff || staff.role !== 'ADMIN' || !staff.isActive) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: UpdateBrandingRequest = await request.json();

    // Validate input
    const validationResult = brandingSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { primaryColor, secondaryColor, accentColor, fontFamily } = validationResult.data;

    // Build update data object (only include provided fields)
    const updateData: {
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      fontFamily?: string;
    } = {};

    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (accentColor !== undefined) updateData.accentColor = accentColor;
    if (fontFamily !== undefined) updateData.fontFamily = fontFamily;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No branding fields provided to update' },
        { status: 400 }
      );
    }

    // Update restaurant branding
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: staff.restaurantId },
      data: updateData,
      select: {
        id: true,
        name: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        fontFamily: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Branding updated successfully',
        data: {
          primaryColor: updatedRestaurant.primaryColor,
          secondaryColor: updatedRestaurant.secondaryColor,
          accentColor: updatedRestaurant.accentColor,
          fontFamily: updatedRestaurant.fontFamily,
          updatedAt: updatedRestaurant.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Branding update error:', error);

    // Handle Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Record to update not found')) {
        return NextResponse.json(
          { success: false, error: 'Restaurant not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to update branding',
      },
      { status: 500 }
    );
  }
}