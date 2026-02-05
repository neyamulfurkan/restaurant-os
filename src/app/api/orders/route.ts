// src/app/api/orders/route.ts

import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from '@/lib/session';
import { z } from 'zod';
import { createOrder, getOrders } from '@/services/orderService';
import { orderSchema, orderQuerySchema } from '@/validations/order';

import type { CreateOrderRequest, OrderFilters, PaginatedResponse, OrderWithRelations, OrderStatus, OrderType, PaymentMethod } from '@/types';

/**
 * GET /api/orders
 * Fetch orders with optional filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Skip auth check for now - will add proper auth later
    // const session = null; // await getServerSession();
    
    // Get restaurantId from query params (required for unauthenticated requests)
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    const rawPage = searchParams.get('page');
    const rawLimit = searchParams.get('limit');
    
    const statusParam = searchParams.get('status');
    const queryParams = {
      restaurantId: restaurantId,
      customerId: searchParams.get('customerId') || undefined,
      status: statusParam || undefined,
      type: searchParams.get('type') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      search: searchParams.get('search') || undefined,
      page: rawPage ? parseInt(rawPage, 10) : 1,
      limit: rawLimit ? parseInt(rawLimit, 10) : 20,
    };

    // Validate query parameters
    const validatedQuery = orderQuerySchema.parse(queryParams);

    // Build filters object
    const filters: OrderFilters = {
      status: validatedQuery.status as OrderStatus | undefined,
      type: validatedQuery.type as OrderType | undefined,
      customerId: validatedQuery.customerId,
      startDate: validatedQuery.startDate,
      endDate: validatedQuery.endDate,
      search: queryParams.search,
    };

    // Fetch orders using service
    const result: PaginatedResponse<OrderWithRelations> = await getOrders(
      restaurantId,
      filters,
      validatedQuery.page,
      validatedQuery.limit
    );

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        pagination: result.pagination,
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/orders error:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    // Handle generic errors
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    console.log('📥 ORDER API - Received body:', JSON.stringify(body, null, 2));

    // Validate request body with Zod
    const validatedData = orderSchema.parse({
      type: body.type,
      customerId: body.customerId,
      restaurantId: body.restaurantId,
      tableNumber: body.tableNumber,
      pickupTime: body.pickupTime,
      deliveryAddressId: body.deliveryAddressId,
      deliveryAddress: body.deliveryAddress,
      orderItems: body.items || body.orderItems, // Support both 'items' and 'orderItems'
      subtotal: body.subtotal,
      taxAmount: body.taxAmount,
      serviceFee: body.serviceFee ?? 0,
      tipAmount: body.tipAmount ?? 0,
      discountAmount: body.discountAmount ?? 0,
      totalAmount: body.totalAmount,
      deliveryFee: body.deliveryFee ?? 0,
      paymentMethod: body.paymentMethod,
      promoCodeId: body.promoCodeId,
      specialInstructions: body.specialInstructions,
    });

    // Build request object for service
    const createOrderRequest: CreateOrderRequest = {
      type: validatedData.type as OrderType,
      customerId: validatedData.customerId,
      restaurantId: validatedData.restaurantId,
      items: (validatedData.orderItems || []).map(item => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        customizations: item.customizations,
        specialInstructions: item.specialInstructions,
      })),
      tableNumber: validatedData.tableNumber,
      pickupTime: validatedData.pickupTime,
      deliveryAddressId: validatedData.deliveryAddressId,
      specialInstructions: validatedData.specialInstructions,
      paymentMethod: validatedData.paymentMethod as PaymentMethod,
      tipAmount: validatedData.tipAmount,
      promoCodeId: validatedData.promoCodeId,
    };

    // Create order using service
    const order = await createOrder(createOrderRequest);

    return NextResponse.json(
      {
        success: true,
        data: order,
        message: 'Order created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/orders error:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error('❌ Validation errors:', JSON.stringify(error.errors, null, 2));
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

    // Handle generic errors
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}