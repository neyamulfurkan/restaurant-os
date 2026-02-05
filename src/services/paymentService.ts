// src/services/paymentService.ts

import Stripe from 'stripe';

// Initialize Stripe dynamically based on settings
async function getStripeInstance(): Promise<Stripe | null> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/settings`);
    const data = await response.json();
    
    if (!data.data?.stripeSecretKey) {
      return null;
    }
    
    return new Stripe(data.data.stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return null;
  }
}

/**
 * Standard response format for payment operations
 */
interface PaymentResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Creates a Stripe payment intent for processing payments
 * 
 * @param amount - Amount in smallest currency unit (e.g., cents for USD)
 * @param currency - Three-letter ISO currency code (default: 'usd')
 * @param metadata - Optional metadata to attach to the payment intent
 * @returns Payment intent details or error
 */
export async function createPaymentIntent(
  amount: number,
  currency: string = 'usd',
  metadata?: Record<string, string>
): Promise<PaymentResponse<Stripe.PaymentIntent>> {
  try {
    // Validate amount
    if (amount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than zero',
      };
    }

    // Get Stripe instance from settings
    const stripe = await getStripeInstance();
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure integer
      currency: currency.toLowerCase(),
      metadata: metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      success: true,
      data: paymentIntent,
    };
  } catch (error) {
    return handleStripeError(error);
  }
}

/**
 * Confirms and verifies a payment intent status
 * 
 * @param intentId - The payment intent ID to verify
 * @returns Payment intent status or error
 */
export async function confirmPayment(
  intentId: string
): Promise<PaymentResponse<Stripe.PaymentIntent>> {
  try {
    const stripe = await getStripeInstance();
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(intentId);

    // Check if payment was successful
    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        data: paymentIntent,
      };
    }

    // Payment not successful
    return {
      success: false,
      error: `Payment status: ${paymentIntent.status}`,
      data: paymentIntent,
    };
  } catch (error) {
    return handleStripeError(error);
  }
}

/**
 * Creates a refund for a payment intent
 * 
 * @param intentId - The payment intent ID to refund
 * @param amount - Optional partial refund amount (defaults to full refund)
 * @returns Refund details or error
 */
export async function createRefund(
  intentId: string,
  amount?: number
): Promise<PaymentResponse<Stripe.Refund>> {
  try {
    const stripe = await getStripeInstance();
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    // Retrieve payment intent to validate
    const paymentIntent = await stripe.paymentIntents.retrieve(intentId);

    // Verify payment was successful before refunding
    if (paymentIntent.status !== 'succeeded') {
      return {
        success: false,
        error: 'Cannot refund a payment that has not succeeded',
      };
    }

    // Validate partial refund amount if provided
    if (amount !== undefined) {
      if (amount <= 0) {
        return {
          success: false,
          error: 'Refund amount must be greater than zero',
        };
      }
      if (amount > paymentIntent.amount) {
        return {
          success: false,
          error: 'Refund amount cannot exceed the original payment amount',
        };
      }
    }

    // Create the refund
    const refund = await stripe.refunds.create({
      payment_intent: intentId,
      amount: amount ? Math.round(amount) : undefined, // Partial or full refund
    });

    return {
      success: true,
      data: refund,
    };
  } catch (error) {
    return handleStripeError(error);
  }
}

/**
 * Handles Stripe-specific errors and returns formatted error response
 * 
 * @param error - The error thrown by Stripe
 * @returns Formatted error response
 */
function handleStripeError(error: unknown): PaymentResponse<never> {
  if (error instanceof Stripe.errors.StripeError) {
    // Handle specific Stripe error types
    switch (error.type) {
      case 'StripeCardError':
        // Card-specific errors (declined, insufficient funds, etc.)
        return {
          success: false,
          error: error.message || 'Card payment failed',
        };

      case 'StripeInvalidRequestError':
        // Invalid parameters or request
        return {
          success: false,
          error: 'Invalid payment request',
        };

      case 'StripeAPIError':
        // Stripe API/server error
        return {
          success: false,
          error: 'Payment service unavailable. Please try again later.',
        };

      case 'StripeConnectionError':
        // Network communication error
        return {
          success: false,
          error: 'Network error. Please check your connection and try again.',
        };

      case 'StripeAuthenticationError':
        // Authentication with Stripe's API failed
        return {
          success: false,
          error: 'Payment authentication failed',
        };

      case 'StripeRateLimitError':
        // Too many requests
        return {
          success: false,
          error: 'Too many payment requests. Please try again shortly.',
        };

      default:
        return {
          success: false,
          error: error.message || 'An unexpected payment error occurred',
        };
    }
  }

  // Non-Stripe errors
  console.error('Payment service error:', error);
  return {
    success: false,
    error: 'An unexpected error occurred while processing payment',
  };
}

/**
 * Retrieves a payment intent by ID
 * 
 * @param intentId - The payment intent ID
 * @returns Payment intent or error
 */
export async function getPaymentIntent(
  intentId: string
): Promise<PaymentResponse<Stripe.PaymentIntent>> {
  try {
    const stripe = await getStripeInstance();
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    const paymentIntent = await stripe.paymentIntents.retrieve(intentId);
    return {
      success: true,
      data: paymentIntent,
    };
  } catch (error) {
    return handleStripeError(error);
  }
}

/**
 * Cancels a payment intent
 * 
 * @param intentId - The payment intent ID to cancel
 * @returns Cancelled payment intent or error
 */
export async function cancelPaymentIntent(
  intentId: string
): Promise<PaymentResponse<Stripe.PaymentIntent>> {
  try {
    const stripe = await getStripeInstance();
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    const paymentIntent = await stripe.paymentIntents.cancel(intentId);
    return {
      success: true,
      data: paymentIntent,
    };
  } catch (error) {
    return handleStripeError(error);
  }
}