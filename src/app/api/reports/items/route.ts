// src/app/api/reports/items/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';

import { generateItemPerformanceReport } from '@/services/reportService';
import { ApiResponse, ItemPerformanceReportData } from '@/types';

/**
 * GET /api/reports/items
 * Generate item performance report
 * Query params:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication check
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        } as ApiResponse,
        { status: 401 }
      );
    }

    // Admin/staff role check
    if (session.user.role !== 'ADMIN' && session.user.role !== 'KITCHEN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Admin or Kitchen role required',
        } as ApiResponse,
        { status: 403 }
      );
    }

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    // Validate required parameters
    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: startDate and endDate',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Parse dates
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Validate date parsing
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use ISO date strings (YYYY-MM-DD)',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate date range
    if (startDate > endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Start date must be before or equal to end date',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    // Get restaurant ID from session
    const restaurantId = session.user.restaurantId;

    if (!restaurantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Restaurant ID not found in session',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Generate item performance report
    const reportData = await generateItemPerformanceReport(
      restaurantId,
      startDate,
      endDate
    );

    // Return report data
    return NextResponse.json(
      {
        success: true,
        data: reportData,
        message: 'Item performance report generated successfully',
      } as ApiResponse<ItemPerformanceReportData>,
      { status: 200 }
    );
  } catch (error) {
    console.error('Item performance report generation error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate item performance report',
          message: error.message,
        } as ApiResponse,
        { status: 500 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      } as ApiResponse,
      { status: 500 }
    );
  }
}