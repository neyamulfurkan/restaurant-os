// src/app/api/ai/forecast/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { generateForecast } from '@/services/aiService';
import { z } from 'zod';

// ============= VALIDATION SCHEMA =============

const forecastQuerySchema = z.object({
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  date: z.string().optional().refine(
    (date) => {
      if (!date) return true;
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime());
    },
    { message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)' }
  ),
});

// ============= GET HANDLER - Generate Demand Forecast =============

/**
 * GET /api/ai/forecast
 * 
 * Generate AI-powered demand forecast for a specific date
 * Uses historical sales data and Claude AI to predict future demand
 * 
 * Query Parameters:
 * - restaurantId (required): Restaurant ID
 * - date (optional): Date to forecast (ISO string, defaults to tomorrow)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     date: "2026-02-01",
 *     predictedOrders: 85,
 *     predictedRevenue: 2340.50,
 *     peakHourStart: "18:00",
 *     peakHourEnd: "21:00",
 *     recommendations: [
 *       {
 *         itemId: "item_123",
 *         itemName: "Margherita Pizza",
 *         suggestedQuantity: 25
 *       }
 *     ],
 *     confidence: 0.87
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Extract and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get('restaurantId');
    const dateParam = searchParams.get('date');

    // Validate input
    const validationResult = forecastQuerySchema.safeParse({
      restaurantId,
      date: dateParam,
    });

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

    const { restaurantId: validRestaurantId, date: dateString } = validationResult.data;

    // Use tomorrow as default date if not provided
    const forecastDate = dateString 
      ? new Date(dateString) 
      : (() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          return tomorrow;
        })();

    // Ensure date is in the future
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (forecastDate < now) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forecast date must be in the future',
        },
        { status: 400 }
      );
    }

    // Ensure date is not too far in future (max 30 days)
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    
    if (forecastDate > maxDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forecast date cannot be more than 30 days in the future',
        },
        { status: 400 }
      );
    }

    // Generate forecast using AI service
    const forecastData = await generateForecast(validRestaurantId, forecastDate);

    return NextResponse.json(
      {
        success: true,
        data: forecastData,
        message: 'Forecast generated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forecast API error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      // AI API errors
      if (error.message.includes('Claude API') || error.message.includes('Anthropic') || error.message.includes('Groq') || error.message.includes('AI service')) {
        return NextResponse.json(
          {
            success: false,
            error: 'AI service temporarily unavailable. Please try again later.',
          },
          { status: 503 }
        );
      }

      // Insufficient historical data
      if (error.message.includes('insufficient') || error.message.includes('historical data')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient historical data to generate forecast. Please ensure you have at least 7 days of order history.',
          },
          { status: 400 }
        );
      }

      // Database errors
      if (error.message.includes('Prisma') || error.message.includes('database')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Database error occurred. Please try again.',
          },
          { status: 500 }
        );
      }

      // Generic error with message
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    // Unknown error
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate forecast. Please try again later.',
      },
      { status: 500 }
    );
  }
}

// ============= OPTIONS HANDLER - CORS Support =============

/**
 * OPTIONS /api/ai/forecast
 * Handle preflight requests for CORS
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}