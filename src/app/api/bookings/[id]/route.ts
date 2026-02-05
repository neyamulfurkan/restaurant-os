// src/app/api/bookings/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';

import {
  getBookingById,
  updateBookingStatus,
  cancelBooking,
} from '@/services/bookingService';
import type { BookingStatus } from '@prisma/client';

/**
 * GET /api/bookings/[id]
 * Retrieves a single booking by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    const booking = await getBookingById(id);

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to view this booking
    // Customer can view their own bookings, admin/staff can view all
    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    if (
      userRole !== 'ADMIN' &&
      userRole !== 'KITCHEN' &&
      userRole !== 'WAITER' &&
      booking.customerId !== userId
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('GET /api/bookings/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch booking',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bookings/[id]
 * Updates a booking (status, table assignment, special requests)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Check if booking exists
    const existingBooking = await getBookingById(id);

    if (!existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    // Only admin and staff can update bookings (except customer cancellation)
    const isAdmin = userRole === 'ADMIN' || userRole === 'WAITER';
    const isOwner = existingBooking.customerId === userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Customers can only cancel their own bookings
    if (isOwner && !isAdmin && body.status && body.status !== 'CANCELLED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Customers can only cancel bookings',
        },
        { status: 403 }
      );
    }

    const { status, tableId } = body;

    // Validate status if provided
    const validStatuses: BookingStatus[] = [
      'PENDING',
      'CONFIRMED',
      'CANCELLED',
      'COMPLETED',
      'NO_SHOW',
    ];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid booking status' },
        { status: 400 }
      );
    }

    // Update booking
    // Handle tableId: undefined means don't update, null means unassign
    const updatedBooking = await updateBookingStatus(
      id,
      status || existingBooking.status,
      tableId !== undefined ? tableId : undefined
    );

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: 'Booking updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/bookings/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update booking',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bookings/[id]
 * Cancels a booking (soft delete by changing status)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Check if booking exists
    const existingBooking = await getBookingById(id);

    if (!existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    const isAdmin = userRole === 'ADMIN' || userRole === 'WAITER';
    const isOwner = existingBooking.customerId === userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Cannot cancel already completed or cancelled bookings
    if (
      existingBooking.status === 'COMPLETED' ||
      existingBooking.status === 'CANCELLED'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel ${existingBooking.status.toLowerCase()} booking`,
        },
        { status: 400 }
      );
    }

    // Parse cancellation reason from request body if provided
    try {
      const body = await _request.json();
      // Reason can be logged or used for future notification features
      if (body.reason) {
        console.log('Cancellation reason:', body.reason);
      }
    } catch {
      // No body or invalid JSON, continue without reason
    }

    // Cancel the booking
    const cancelledBooking = await cancelBooking(id);

    return NextResponse.json({
      success: true,
      data: cancelledBooking,
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    console.error('DELETE /api/bookings/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel booking',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}