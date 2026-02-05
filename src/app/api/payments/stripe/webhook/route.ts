// src/app/api/payments/stripe/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

import { ORDER_STATUS } from '@/lib/constants';
import { PaymentStatus } from '@/types';

/**
 * Stripe webhook endpoint
 * Handles payment events and updates order status accordingly
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      // Return 200 to prevent Stripe from retrying
      return NextResponse.json({ received: true });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', errorMessage);
      return NextResponse.json(
        { error: `Webhook Error: ${errorMessage}` },
        { status: 400 }
      );
    }

    // Handle the event
    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return 200 to acknowledge receipt (Stripe requirement)
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook handler error:', error);
    // Still return 200 to prevent Stripe from retrying
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

/**
 * Handle successful payment
 * Updates order payment status and moves order to accepted state
 */
async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  try {
    const orderId = paymentIntent.metadata.orderId;

    if (!orderId) {
      console.error('No orderId in payment intent metadata');
      return;
    }

    // Update order in transaction
    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
          paymentIntentId: paymentIntent.id,
        },
      });

      // Get current order status
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });

      // If order is still pending, move to accepted
      if (order?.status === ORDER_STATUS.PENDING) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: ORDER_STATUS.ACCEPTED },
        });

        // Create status history
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: ORDER_STATUS.ACCEPTED,
            note: 'Payment received successfully',
            createdBy: 'SYSTEM',
          },
        });
      }
    });

    console.log(`Payment succeeded for order ${orderId}`);

    // TODO: Send confirmation email/SMS to customer
    // This would integrate with notificationService
  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

/**
 * Handle failed payment
 * Updates order payment status and adds note to status history
 */
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  try {
    const orderId = paymentIntent.metadata.orderId;

    if (!orderId) {
      console.error('No orderId in payment intent metadata');
      return;
    }

    const failureMessage =
      paymentIntent.last_payment_error?.message || 'Payment failed';

    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.FAILED,
          paymentIntentId: paymentIntent.id,
        },
      });

      // Create status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: ORDER_STATUS.PENDING,
          note: `Payment failed: ${failureMessage}`,
          createdBy: 'SYSTEM',
        },
      });
    });

    console.log(`Payment failed for order ${orderId}: ${failureMessage}`);

    // TODO: Send payment failure notification to customer
  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
}

/**
 * Handle canceled payment
 * Updates order payment status
 */
async function handlePaymentCanceled(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  try {
    const orderId = paymentIntent.metadata.orderId;

    if (!orderId) {
      console.error('No orderId in payment intent metadata');
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PENDING,
        paymentIntentId: paymentIntent.id,
      },
    });

    console.log(`Payment canceled for order ${orderId}`);
  } catch (error) {
    console.error('Error handling payment cancellation:', error);
    throw error;
  }
}

/**
 * Handle charge refund
 * Updates order payment status to refunded
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  try {
    // Find order by payment intent ID
    const order = await prisma.order.findFirst({
      where: { paymentIntentId: charge.payment_intent as string },
      select: { id: true },
    });

    if (!order) {
      console.error('No order found for refunded charge');
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.REFUNDED,
        },
      });

      // Create status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: ORDER_STATUS.CANCELLED,
          note: `Refund processed: ${charge.amount_refunded / 100} ${charge.currency.toUpperCase()}`,
          createdBy: 'SYSTEM',
        },
      });
    });

    console.log(`Refund processed for order ${order.id}`);

    // TODO: Send refund confirmation to customer
  } catch (error) {
    console.error('Error handling charge refund:', error);
    throw error;
  }
}

/**
 * Handle dispute created
 * Logs dispute for manual review
 */
async function handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
  try {
    // Find order by payment intent ID
    const order = await prisma.order.findFirst({
      where: { paymentIntentId: dispute.payment_intent as string },
      select: { id: true, orderNumber: true },
    });

    if (!order) {
      console.error('No order found for disputed charge');
      return;
    }

    // Create status history entry for tracking
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: ORDER_STATUS.CANCELLED,
        note: `Payment dispute created: ${dispute.reason}. Dispute ID: ${dispute.id}`,
        createdBy: 'SYSTEM',
      },
    });

    console.log(
      `Dispute created for order ${order.orderNumber}: ${dispute.reason}`
    );

    // TODO: Send alert to admin/staff for manual review
    // This is critical and requires human intervention
  } catch (error) {
    console.error('Error handling dispute creation:', error);
    throw error;
  }
}