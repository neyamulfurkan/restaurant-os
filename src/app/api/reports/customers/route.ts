// src/app/api/reports/customers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';

import { generateCustomerInsightsReport } from '@/services/reportService';
import { CustomerInsightsReportData } from '@/types';

// ============= GET: Generate Customer Insights Report =============

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin or staff
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'KITCHEN' && userRole !== 'WAITER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get restaurantId from session
    const restaurantId = (session.user as any).restaurantId;
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID not found in session' },
        { status: 400 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    // Validate date parameters
    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: startDate and endDate',
        },
        { status: 400 }
      );
    }

    // Parse dates
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Validate date objects
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use ISO 8601 format.' },
        { status: 400 }
      );
    }

    // Validate date range
    if (startDate > endDate) {
      return NextResponse.json(
        { success: false, error: 'Start date cannot be after end date' },
        { status: 400 }
      );
    }

    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    // Generate customer insights report
    const reportData: CustomerInsightsReportData =
      await generateCustomerInsightsReport(restaurantId, startDate, endDate);

    return NextResponse.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    console.error('Customer insights report generation error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate customer insights report',
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while generating customer insights report',
      },
      { status: 500 }
    );
  }
}