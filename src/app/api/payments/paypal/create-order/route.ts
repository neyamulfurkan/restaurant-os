// src/app/api/payments/paypal/create-order/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// PayPal SDK types
interface PayPalOrderRequest {
  intent: 'CAPTURE';
  purchase_units: Array<{
    amount: {
      currency_code: string;
      value: string;
    };
    custom_id?: string;
  }>;
  application_context?: {
    return_url: string;
    cancel_url: string;
    brand_name: string;
    user_action: string;
  };
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

/**
 * Request validation schema
 */
const createOrderSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
  currency: z.string().length(3).default('USD'),
  orderId: z.string().optional(),
});

/**
 * POST /api/payments/paypal/create-order
 * Creates a PayPal order for payment processing
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    // Check for PayPal credentials from settings
    const settingsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/settings`);
    const settingsData = await settingsResponse.json();
    
    const clientId = settingsData.data?.paypalClientId;
    const clientSecret = settingsData.data?.paypalClientSecret;

    // DEVELOPMENT MODE: Skip PayPal if not configured
    if (!clientId || !clientSecret) {
      console.log('⚠️ DEVELOPMENT MODE: PayPal not configured, simulating order creation');
      
      const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
      
      // Return mock PayPal order for development
      return NextResponse.json(
        {
          success: true,
          data: {
            orderId: 'PAYPAL_DEV_MOCK_' + Date.now(),
            status: 'CREATED',
            approveUrl: `${baseUrl}/checkout/paypal-return?token=DEV_MOCK&orderId=${validated.orderId}`,
          },
          isDevelopmentMode: true,
        },
        { status: 201 }
      );
    }

    // Get PayPal access token
    const auth = await getPayPalAccessToken(clientId, clientSecret);

    if (!auth.success || !auth.accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to authenticate with PayPal',
        },
        { status: 502 }
      );
    }

    // Prepare PayPal order request
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
    const orderRequest: PayPalOrderRequest = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: validated.currency.toUpperCase(),
            value: validated.amount.toFixed(2),
          },
          ...(validated.orderId && { custom_id: validated.orderId }),
        },
      ],
      application_context: {
        return_url: `${baseUrl}/checkout/paypal-return?orderId=${validated.orderId}`,
        cancel_url: `${baseUrl}/checkout`,
        brand_name: 'Restaurant',
        user_action: 'PAY_NOW',
      },
    };

    // Create PayPal order
    const paypalOrder = await createPayPalOrder(
      orderRequest,
      auth.accessToken
    );

    if (!paypalOrder.success || !paypalOrder.data) {
      return NextResponse.json(
        {
          success: false,
          error: paypalOrder.error || 'Failed to create PayPal order',
        },
        { status: 502 }
      );
    }

    // Return PayPal order details
    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: paypalOrder.data.id,
          status: paypalOrder.data.status,
          approveUrl: paypalOrder.data.links.find((link) => link.rel === 'approve')?.href,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Validation error
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

    // Unexpected error
    console.error('PayPal create-order API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while creating PayPal order',
      },
      { status: 500 }
    );
  }
}

/**
 * Gets PayPal access token for API authentication
 */
async function getPayPalAccessToken(
  clientId: string,
  clientSecret: string
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    // Determine PayPal base URL based on environment
    const baseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error_description || 'Failed to get access token',
      };
    }

    const data = await response.json();
    return {
      success: true,
      accessToken: data.access_token,
    };
  } catch (error) {
    console.error('PayPal authentication error:', error);
    return {
      success: false,
      error: 'Network error while authenticating with PayPal',
    };
  }
}

/**
 * Creates a PayPal order via the PayPal API
 */
async function createPayPalOrder(
  orderRequest: PayPalOrderRequest,
  accessToken: string
): Promise<{ success: boolean; data?: PayPalOrderResponse; error?: string }> {
  try {
    // Determine PayPal base URL based on environment
    const baseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `PayPal API error: ${response.status}`,
      };
    }

    const data: PayPalOrderResponse = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('PayPal order creation error:', error);
    return {
      success: false,
      error: 'Network error while creating PayPal order',
    };
  }
}