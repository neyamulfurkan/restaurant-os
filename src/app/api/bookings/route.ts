// src/app/api/bookings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { z } from 'zod';
import {
  createBooking,
  getBookings,
  checkAvailability,
  hasBookingConflict,
} from '@/services/bookingService';
import {
  
  guestBookingSchema,
} from '@/validations/booking';
import { prisma } from '@/lib/prisma';
import type {
  ApiResponse,
  BookingWithRelations,
  BookingStatus,
} from '@/types';

/**
 * GET /api/bookings
 * Fetches bookings with optional filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    
    const status = searchParams.get('status') as string | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const customerId = searchParams.get('customerId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    // Validate pagination parameters
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid pagination parameters',
        },
        { status: 400 }
      );
    }

    // Build filters
    const filters: {
      status?: BookingStatus;
      startDate?: string;
      endDate?: string;
      customerId?: string;
    } = {};

    if (status) {
      filters.status = status as BookingStatus;
    }

    if (startDate) {
      try {
        filters.startDate = new Date(startDate).toISOString();
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid startDate format',
          },
          { status: 400 }
        );
      }
    }

    if (endDate) {
      try {
        filters.endDate = new Date(endDate).toISOString();
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid endDate format',
          },
          { status: 400 }
        );
      }
    }

    if (customerId) {
      filters.customerId = customerId;
    }

    // Fetch bookings with filters
    const result = await getBookings(filters, page, pageSize);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    }, { status: 200 });
  } catch (error) {
    console.error('GET /api/bookings error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bookings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings
 * Creates a new booking
 */
export async function POST(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await getServerSession();
    
    // Parse request body
    const body = await request.json();

    // Determine if this is a guest booking (no session) or authenticated booking
    const isGuest = !session;
    
    let validatedData: {
      date: Date;
      time: string;
      guests: number;
      restaurantId: string;
      customerId?: string;
      tableId?: string;
      duration?: number;
      specialRequests?: string;
      depositAmount?: number;
      name?: string;
      email?: string;
      phone?: string;
    };
    let customerId: string;

    // Always use guest schema for customer bookings (we'll get customerId from session or create one)
    try {
      const parsed = guestBookingSchema.parse(body);
      validatedData = {
        ...parsed,
        date: new Date(parsed.date + 'T00:00:00Z'),
      };
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
      throw error;
    }

    // Create or find customer
    const existingCustomer = await prisma.customer.findUnique({
      where: { email: validatedData.email },
    });

    if (existingCustomer) {
      customerId = existingCustomer.id;
      
      // If user is logged in, update isGuest to false
      if (!isGuest) {
        await prisma.customer.update({
          where: { id: customerId },
          data: { isGuest: false },
        });
      }
    } else {
      // Create customer
      const newCustomer = await prisma.customer.create({
        data: {
          email: validatedData.email!,
          name: validatedData.name!,
          phone: validatedData.phone,
          isGuest: isGuest,
          restaurantId: validatedData.restaurantId,
        },
      });
      customerId = newCustomer.id;
    }

    // Skip availability check if table is already assigned
    // (admin is manually assigning, so we trust their choice)
    if (!validatedData.tableId) {
      // Check availability for the requested date
      const availabilityResult = await checkAvailability({
        date: validatedData.date.toISOString().split('T')[0],
        guests: validatedData.guests,
      });

      // Find the requested time slot
      const requestedSlot = availabilityResult.availableSlots.find(
        (slot) => slot.time === validatedData.time
      );

      if (!requestedSlot || !requestedSlot.available) {
        return NextResponse.json(
          {
            success: false,
            error: 'The requested time slot is not available',
            message: 'Please choose a different time',
          },
          { status: 409 }
        );
      }
    }

    // Check for conflicts if table is specified
    if (validatedData.tableId) {
      const hasConflict = await hasBookingConflict(
        new Date(validatedData.date),
        validatedData.time,
        validatedData.duration || 120,
        validatedData.tableId
      );

      if (hasConflict) {
        return NextResponse.json(
          {
            success: false,
            error: 'The specified table has a conflicting booking',
            message: 'Please choose a different table or time',
          },
          { status: 409 }
        );
      }

      // Verify table exists and is active
      const table = await prisma.table.findUnique({
        where: { id: validatedData.tableId },
      });

      if (!table || !table.isActive) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid or inactive table',
          },
          { status: 400 }
        );
      }

      // Verify table has sufficient capacity
      if (table.capacity < validatedData.guests) {
        return NextResponse.json(
          {
            success: false,
            error: 'Table capacity is insufficient for the number of guests',
          },
          { status: 400 }
        );
      }
    }

    // Create the booking
    const booking = await createBooking({
      ...validatedData,
      date: validatedData.date.toISOString().split('T')[0],
      customerId,
    });

    // TODO: Send booking confirmation email/SMS
    // This would be handled by a separate notification service

    const response: ApiResponse<BookingWithRelations> = {
      success: true,
      data: booking,
      message: 'Booking created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('POST /api/bookings error:', error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('No active restaurant')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Restaurant not found',
            message: 'No active restaurant available',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Booking already exists',
            message: 'A booking with this information already exists',
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create booking',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}