// src/app/api/ai/optimize-tables/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { z } from 'zod';
import { optimizeTables } from '@/services/aiService';

import { prisma } from '@/lib/prisma';

// Validation schema
const optimizeTablesSchema = z.object({
  bookings: z.array(z.object({
    id: z.string(),
    guests: z.number().min(1).max(100),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  })).min(1, 'At least one booking required'),
  date: z.string().optional(),
});

/**
 * POST /api/ai/optimize-tables
 * Generate optimal table assignments for bookings
 * 
 * @body bookings - Array of bookings to assign
 * @body date - Optional date for filtering tables
 * @returns Optimized table assignments with utilization rate
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication (admin only)
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is admin/staff
    const user = await prisma.staff.findUnique({
      where: { email: session.user.email! },
      select: { role: true, restaurantId: true, isActive: true },
    });

    if (!user || !user.isActive || !['ADMIN', 'WAITER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin or waiter access required' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = optimizeTablesSchema.parse(body);

    // Get restaurant's active tables
    const tables = await prisma.table.findMany({
      where: {
        restaurantId: user.restaurantId,
        isActive: true,
      },
      orderBy: {
        capacity: 'asc',
      },
    });

    if (tables.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active tables available' },
        { status: 400 }
      );
    }

    // Verify all booking IDs exist and belong to this restaurant
    const bookingIds = validated.bookings.map(b => b.id);
    const existingBookings = await prisma.booking.findMany({
      where: {
        id: { in: bookingIds },
        restaurantId: user.restaurantId,
      },
      select: { id: true },
    });

    if (existingBookings.length !== bookingIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more bookings not found or unauthorized' },
        { status: 400 }
      );
    }

    // Call AI service to optimize table assignments
    const optimization = await optimizeTables(
      validated.bookings as any,
      tables
    );

    // Validate that all assigned tables exist
    const invalidAssignments = optimization.assignments.filter(
      assignment => !tables.find(t => t.id === assignment.tableId)
    );

    if (invalidAssignments.length > 0) {
      console.error('AI suggested invalid table assignments:', invalidAssignments);
      return NextResponse.json(
        { success: false, error: 'AI optimization returned invalid table assignments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        assignments: optimization.assignments,
        utilizationRate: optimization.utilizationRate,
        totalBookings: validated.bookings.length,
        totalTables: tables.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Table optimization error:', error);
    
    // Return user-friendly error message
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to optimize table assignments';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/optimize-tables
 * Not supported - only POST is allowed
 */
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST to optimize tables.' },
    { status: 405 }
  );
}