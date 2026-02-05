// src/app/api/payments/paypal/capture-order/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { OrderStatus, PaymentStatus } from '@prisma/client';

/**
 * PayPal Capture Order Request Schema
 */
const captureOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  paypalOrderId: z.string().min(1, 'PayPal Order ID is required'),
});

/**
 * PayPal API credentials and endpoints
 */
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

/**
 * Get PayPal access token for API requests
 */
async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Capture a PayPal order
 */
async function capturePayPalOrder(paypalOrderId: string, accessToken: string) {
  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to capture PayPal payment');
  }

  return await response.json();
}

/**
 * POST /api/payments/paypal/capture-order
 * Captures a PayPal payment and updates order status
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validated = captureOrderSchema.parse(body);

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Capture the PayPal order
    const captureData = await capturePayPalOrder(validated.paypalOrderId, accessToken);

    // Verify capture was successful
    if (captureData.status !== 'COMPLETED') {
      return NextResponse.json(
        {
          success: false,
          error: 'PayPal payment capture failed',
          details: captureData,
        },
        { status: 400 }
      );
    }

    // Extract capture ID for record keeping
    const captureId =
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || validated.paypalOrderId;

    // Update order in database
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order payment status
      const order = await tx.order.update({
        where: { id: validated.orderId },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
          paymentIntentId: captureId,
          status: OrderStatus.ACCEPTED, // Move to accepted status
        },
        include: {
          customer: true,
          orderItems: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      // Create status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId: validated.orderId,
          status: OrderStatus.ACCEPTED,
          note: 'Payment completed via PayPal',
          createdBy: 'SYSTEM',
        },
      });

      return order;
    });

    return NextResponse.json({
      success: true,
      data: {
        order: updatedOrder,
        paypalCaptureId: captureId,
        captureDetails: {
          amount: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount,
          status: captureData.status,
        },
      },
      message: 'Payment captured successfully',
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle PayPal API errors
    if (error instanceof Error) {
      console.error('PayPal capture error:', error);

      // Check for specific PayPal errors
      if (error.message.includes('credentials')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Payment service configuration error',
          },
          { status: 500 }
        );
      }

      if (error.message.includes('capture')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Payment capture failed. Please try again.',
          },
          { status: 400 }
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

    // Generic error
    console.error('Unexpected error capturing PayPal payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while processing payment',
      },
      { status: 500 }
    );
  }
}