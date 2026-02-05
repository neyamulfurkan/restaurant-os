// src/app/api/customers/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ApiResponse, CustomerWithStats } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate customer ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid customer ID',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Fetch customer and relations in parallel
    const [customer, orders, bookings, addresses] = await Promise.all([
      prisma.customer.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          isGuest: true,
          profileImage: true,
          preferredLanguage: true,
          marketingConsent: true,
          totalOrders: true,
          totalSpent: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.order.findMany({
        where: { customerId: id },
          select: {
            id: true,
            orderNumber: true,
            type: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            orderItems: {
              select: {
                id: true,
                name: true,
                price: true,
                quantity: true,
                customizations: true,
              },
            },
          },
          orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      }),
      prisma.booking.findMany({
        where: { customerId: id },
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            date: true,
            time: true,
            guests: true,
            createdAt: true,
            table: {
              select: {
                number: true,
              },
            },
          },
          orderBy: {
          date: 'desc',
        },
        take: 20,
      }),
      prisma.address.findMany({
        where: { customerId: id },
          select: {
            id: true,
            label: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            isDefault: true,
            latitude: true,
            longitude: true,
          },
          orderBy: {
          isDefault: 'desc',
        },
      }),
    ]);

    // Check if customer exists
    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer not found',
        } as ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...customer,
          orders,
          bookings,
          addresses,
        },
      } as ApiResponse<CustomerWithStats>,
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/customers/[id] error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch customer details',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate customer ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid customer ID',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, email, phone, profileImage } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and email are required',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer not found',
        } as ApiResponse,
        { status: 404 }
      );
    }

    // Check if email is already taken by another customer
    if (email !== existingCustomer.email) {
      const emailExists = await prisma.customer.findFirst({
        where: {
          email,
          id: { not: id },
        },
      });

      if (emailExists) {
        return NextResponse.json(
          {
            success: false,
            error: 'Email address is already in use',
          } as ApiResponse,
          { status: 400 }
        );
      }
    }

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        email,
        phone: phone || null,
        profileImage: profileImage || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        profileImage: true,
        isGuest: true,
        preferredLanguage: true,
        totalOrders: true,
        totalSpent: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedCustomer,
        message: 'Profile updated successfully',
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /api/customers/[id] error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update customer profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse,
      { status: 500 }
    );
  }
}