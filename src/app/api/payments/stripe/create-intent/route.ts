// src/app/api/payments/stripe/create-intent/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/services/paymentService';
import { z } from 'zod';

/**
 * Validation schema for payment intent creation request
 */
const createIntentSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
  currency: z.string().length(3).toLowerCase().optional().default('usd'),
  orderId: z.string().optional(),
  customerId: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

/**
 * POST /api/payments/stripe/create-intent
 * Creates a Stripe payment intent for processing payments
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = createIntentSchema.parse(body);

    const { amount, currency, orderId, customerId, customerEmail } = validatedData;

    // Check if Stripe is configured in settings
    const settingsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/settings`);
    const settingsData = await settingsResponse.json();
    
    // DEVELOPMENT MODE: Skip Stripe if not configured
    if (!settingsData.data?.stripeSecretKey) {
      console.log('⚠️ DEVELOPMENT MODE: Stripe not configured, simulating payment intent');
      
      // Return mock payment intent for development
      return NextResponse.json(
        {
          success: true,
          data: {
            clientSecret: 'dev_mock_client_secret_' + Date.now(),
            paymentIntentId: 'pi_dev_mock_' + Date.now(),
            amount: amount,
            currency: currency || 'usd',
          },
          isDevelopmentMode: true,
        },
        { status: 201 }
      );
    }

    // Prepare metadata for payment intent
    const metadata: Record<string, string> = {};
    if (orderId) {
      metadata.orderId = orderId;
    }
    if (customerId) {
      metadata.customerId = customerId;
    }
    if (customerEmail) {
      metadata.customerEmail = customerEmail;
    }

    // Create payment intent via payment service
    const result = await createPaymentIntent(amount, currency, metadata);

    // Handle service response
    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to create payment intent',
        },
        { status: 400 }
      );
    }

    // Return client secret for frontend payment confirmation
    return NextResponse.json(
      {
        success: true,
        data: {
          clientSecret: result.data.client_secret,
          paymentIntentId: result.data.id,
          amount: result.data.amount,
          currency: result.data.currency,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle Zod validation errors
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

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // Log unexpected errors
    console.error('Create payment intent API error:', error);

    // Return generic error response
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while creating payment intent',
      },
      { status: 500 }
    );
  }
}