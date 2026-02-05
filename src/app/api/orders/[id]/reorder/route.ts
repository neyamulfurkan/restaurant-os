import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/orders/:id/reorder
 * Create a new order based on a previous order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    // Fetch the original order with items
    const originalOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    });

    if (!originalOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Calculate totals
    const subtotal = originalOrder.orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const taxAmount = subtotal * 0.1; // 10% tax (adjust as needed)
    const totalAmount = subtotal + taxAmount;

    // Create new order with same items
    const newOrder = await prisma.order.create({
      data: {
        type: originalOrder.type,
        status: 'PENDING',
        customerId: originalOrder.customerId,
        restaurantId: originalOrder.restaurantId,
        tableNumber: originalOrder.tableNumber,
        subtotal,
        taxAmount,
        serviceFee: originalOrder.serviceFee,
        tipAmount: 0,
        discountAmount: 0,
        totalAmount,
        deliveryFee: originalOrder.deliveryFee,
        paymentMethod: originalOrder.paymentMethod,
        paymentStatus: 'PENDING',
        orderNumber: `ORD-${Date.now()}`,
        orderItems: {
          create: originalOrder.orderItems.map((item) => ({
            menuItem: {
              connect: { id: item.menuItemId }
            },
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            customizations: item.customizations || undefined,
            specialInstructions: item.specialInstructions || undefined,
          })),
        },
      },
      include: {
        orderItems: true,
        customer: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: newOrder.id,
          orderNumber: newOrder.orderNumber,
        },
        message: 'Order placed successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/orders/:id/reorder error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to reorder' },
      { status: 500 }
    );
  }
}