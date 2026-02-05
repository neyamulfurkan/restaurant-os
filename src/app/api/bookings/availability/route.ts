// src/app/api/bookings/availability/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability } from '@/services/bookingService';
import type { CheckAvailabilityRequest, AvailabilityResponse } from '@/types';

/**
 * GET /api/bookings/availability
 * Checks availability for a specific date and returns available time slots
 * Query params: date (YYYY-MM-DD), guests (number)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const date = searchParams.get('date');
    const guestsParam = searchParams.get('guests');

    // Validate required parameters
    if (!date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Date parameter is required',
        },
        { status: 400 }
      );
    }

    // Validate date format (basic check)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Expected YYYY-MM-DD',
        },
        { status: 400 }
      );
    }

    // Validate date is not in the past (use UTC to avoid timezone issues)
    const requestedDate = new Date(date + 'T00:00:00Z');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (requestedDate < today) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot check availability for past dates',
        },
        { status: 400 }
      );
    }

    // Parse guests parameter (default to 1 if not provided)
    let guests = 1;
    if (guestsParam) {
      guests = parseInt(guestsParam, 10);
      
      if (isNaN(guests) || guests < 1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Guests must be a positive number',
          },
          { status: 400 }
        );
      }

      if (guests > 20) {
        return NextResponse.json(
          {
            success: false,
            error: 'Maximum 20 guests per booking. Please contact us for larger parties.',
          },
          { status: 400 }
        );
      }
    }

    // Build request object
    const availabilityRequest: CheckAvailabilityRequest = {
      date,
      guests,
    };

    // Check availability
    const availability: AvailabilityResponse = await checkAvailability(availabilityRequest);

    return NextResponse.json(
      {
        success: true,
        date: availability.date,
        slots: availability.availableSlots,
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Booking availability check error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      // Check for specific error messages from service
      if (error.message.includes('No active restaurant found')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Restaurant configuration error. Please contact support.',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check availability',
      },
      { status: 500 }
    );
  }
}