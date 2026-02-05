// src/app/api/orders/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';

import {
  getOrderById,
  updateOrderStatus,
} from '@/services/orderService';
import { z } from 'zod';

// Validation schema for status update
const updateStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'ACCEPTED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REJECTED',
  ]),
  note: z.string().optional(),
});

/**
 * GET /api/orders/[id]
 * Fetch a single order by ID with all relations
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const orderId = params.id;

    // Fetch order with all relations
    const order = await getOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check authorization: customer can only see their own orders, staff can see all
    const userRole = (session.user as any)?.role;
    const isStaffRole = userRole && ['ADMIN', 'KITCHEN', 'WAITER'].includes(userRole);
    const isOrderOwner = order.customerId === (session.user as any)?.id;

    if (!isStaffRole && !isOrderOwner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only view your own orders' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch order',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[id]
 * Update order status (admin/staff or customer cancellation)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const orderId = params.id;
    const body = await request.json();

    // Check if this is a customer cancellation request
    const isCustomerCancellation = body.status === 'CANCELLED' && !body.note;
    const userRole = (session.user as any)?.role;
    const isStaff = userRole && ['ADMIN', 'KITCHEN', 'WAITER'].includes(userRole);

    if (isCustomerCancellation) {
      // Customer cancellation logic
      const existingOrder = await getOrderById(orderId);

      if (!existingOrder) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        );
      }

      // Check if user owns this order
      if (existingOrder.customerId !== (session.user as any)?.id) {
        return NextResponse.json(
          { success: false, error: 'You can only cancel your own orders' },
          { status: 403 }
        );
      }

      // Only allow cancellation if order is PENDING or ACCEPTED
      if (!['PENDING', 'ACCEPTED'].includes(existingOrder.status)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Order cannot be cancelled. It is already being prepared or completed.' 
          },
          { status: 400 }
        );
      }

      // Update order status to CANCELLED
      const updatedOrder = await updateOrderStatus(
        orderId,
        {
          status: 'CANCELLED',
          note: 'Cancelled by customer',
        },
        (session.user as any)?.id || 'CUSTOMER'
      );

      return NextResponse.json({
        success: true,
        data: updatedOrder,
        message: 'Order cancelled successfully',
      });
    }

    // Staff update order status logic
    if (!isStaff) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only staff can update order status' },
        { status: 403 }
      );
    }

    // Verify order exists
    const staffOrder = await getOrderById(orderId);

    if (!staffOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const validated = updateStatusSchema.parse(body);

    // Update order status
    const updatedOrder = await updateOrderStatus(
      orderId,
      {
        status: validated.status as any,
        note: validated.note,
      },
      (session.user as any)?.id || 'SYSTEM'
    );

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Order status updated successfully',
    });
  } catch (error) {
    console.error('Error updating order status:', error);

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

    // Handle business logic errors
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update order status',
      },
      { status: 500 }
    );
  }
}