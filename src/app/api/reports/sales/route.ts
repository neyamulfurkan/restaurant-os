// src/app/api/reports/sales/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';

import { generateSalesReport } from '@/services/reportService';
import { SalesReportData } from '@/types';

/**
 * GET /api/reports/sales
 * Generate sales report for a given date range
 * Query params:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 * - restaurantId: Restaurant ID (required for multi-tenant, optional if session has restaurant)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const restaurantId = searchParams.get('restaurantId') || (session.user as any).restaurantId;

    // Validate required parameters
    if (!startDateParam) {
      return NextResponse.json(
        { success: false, error: 'startDate query parameter is required' },
        { status: 400 }
      );
    }

    if (!endDateParam) {
      return NextResponse.json(
        { success: false, error: 'endDate query parameter is required' },
        { status: 400 }
      );
    }

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required' },
        { status: 400 }
      );
    }

    // Parse and validate dates
    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    if (isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Validate date range
    if (startDate > endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate cannot be after endDate' },
        { status: 400 }
      );
    }

    // Check if date range is too large (optional: limit to 1 year)
    const daysDifference = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDifference > 365) {
      return NextResponse.json(
        { success: false, error: 'Date range cannot exceed 365 days' },
        { status: 400 }
      );
    }

    // Set time to start and end of day for accurate range
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Generate report
    const reportData: SalesReportData = await generateSalesReport(
      restaurantId,
      startDate,
      endDate
    );

    // Return report data
    return NextResponse.json(
      {
        success: true,
        data: reportData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Sales report generation error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      // Database errors
      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          { success: false, error: 'Database error occurred. Please try again.' },
          { status: 503 }
        );
      }

      // Permission errors
      if (error.message.includes('permission') || error.message.includes('access denied')) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to access this report' },
          { status: 403 }
        );
      }

      // Return generic error message
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate sales report',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    // Unknown error
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}