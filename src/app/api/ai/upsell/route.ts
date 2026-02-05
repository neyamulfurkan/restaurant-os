// src/app/api/ai/upsell/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getUpsellSuggestions } from '@/services/aiService';
import { z } from 'zod';

// ============= VALIDATION SCHEMA =============

const upsellRequestSchema = z.object({
  cartItems: z.array(
    z.object({
      menuItemId: z.string().min(1, 'Menu item ID is required'),
      name: z.string().min(1, 'Item name is required'),
      price: z.number().positive('Price must be positive'),
      quantity: z.number().int().positive('Quantity must be positive'),
      customizations: z
        .array(
          z.object({
            groupName: z.string(),
            optionName: z.string(),
            price: z.number(),
          })
        )
        .optional(),
      specialInstructions: z.string().optional(),
    })
  ).min(1, 'Cart must contain at least one item'),
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  customerId: z.string().optional(),
});

// ============= POST HANDLER =============

/**
 * POST /api/ai/upsell
 * Generate personalized upsell suggestions based on cart items
 * 
 * @body {
 *   cartItems: CartItem[],
 *   restaurantId: string,
 *   customerId?: string
 * }
 * @returns {
 *   success: boolean,
 *   data?: {
 *     suggestions: Array<{
 *       menuItem: MenuItem,
 *       reason: string,
 *       confidence: number
 *     }>
 *   },
 *   error?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request
    const validated = upsellRequestSchema.parse(body);

    const { cartItems, restaurantId, customerId } = validated;

    // Validate that cart is not empty
    if (cartItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cart cannot be empty',
        },
        { status: 400 }
      );
    }

    // Generate upsell suggestions
    const suggestions = await getUpsellSuggestions(
      cartItems,
      restaurantId,
      customerId
    );

    // Return suggestions
    return NextResponse.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Upsell API error:', error);

    // Handle validation errors
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

    // Handle known errors
    if (error instanceof Error) {
      // Don't expose internal errors to client
      if (error.message.includes('Restaurant not found')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Restaurant not found',
          },
          { status: 404 }
        );
      }

      // AI service errors - return empty suggestions instead of failing
      if (error.message.includes('AI service')) {
        console.warn('AI service unavailable, returning empty suggestions');
        return NextResponse.json({
          success: true,
          data: {
            suggestions: [],
          },
        });
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate upsell suggestions',
      },
      { status: 500 }
    );
  }
}

// ============= OPTIONS HANDLER (CORS) =============

/**
 * OPTIONS /api/ai/upsell
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}