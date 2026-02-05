// src/app/api/customers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { PaginatedResponse } from '@/types';

/**
 * GET /api/customers
 * Fetch all customers with filtering, search, and pagination
 * Requires authentication (admin/staff only)
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || undefined;
    const minTotalSpent = searchParams.get('minTotalSpent')
      ? parseFloat(searchParams.get('minTotalSpent')!)
      : undefined;
    const maxTotalSpent = searchParams.get('maxTotalSpent')
      ? parseFloat(searchParams.get('maxTotalSpent')!)
      : undefined;
    const minTotalOrders = searchParams.get('minTotalOrders')
      ? parseInt(searchParams.get('minTotalOrders')!)
      : undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build where clause
    const where: any = {
      // Exclude guests if needed (optional)
      // isGuest: false,
    };

    // Search filter (name, email, phone)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Total spent filters
    if (minTotalSpent !== undefined) {
      where.totalSpent = { gte: minTotalSpent };
    }
    if (maxTotalSpent !== undefined) {
      where.totalSpent = { ...where.totalSpent, lte: maxTotalSpent };
    }

    // Total orders filter
    if (minTotalOrders !== undefined) {
      where.totalOrders = { gte: minTotalOrders };
    }

    // Date range filter (last order date)
    if (startDate || endDate) {
      where.orders = {
        some: {
          createdAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
          },
        },
      };
    }

    // Count total matching customers
    const total = await prisma.customer.count({ where });

    // Calculate pagination
    const totalPages = Math.ceil(total / pageSize);
    const skip = (page - 1) * pageSize;

    // Determine sort field
    const orderBy: any = {};
    if (sortBy === 'totalOrders' || sortBy === 'totalSpent' || sortBy === 'createdAt') {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    // Fetch customers with pagination
    const customers = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        profileImage: true,
        isGuest: true,
        preferredLanguage: true,
        marketingConsent: true,
        totalOrders: true,
        totalSpent: true,
        createdAt: true,
        updatedAt: true,
        restaurantId: true,
        // Exclude passwordHash for security
        // Include last order date
        orders: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      skip,
      take: pageSize,
      orderBy,
    });

    // Transform data to include lastOrderDate
    const transformedCustomers = customers.map((customer) => ({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      profileImage: customer.profileImage,
      isGuest: customer.isGuest,
      preferredLanguage: customer.preferredLanguage,
      marketingConsent: customer.marketingConsent,
      totalOrders: customer.totalOrders,
      totalSpent: customer.totalSpent,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      restaurantId: customer.restaurantId,
      lastOrderDate: customer.orders[0]?.createdAt || null,
    }));

    // Build response
    const response: PaginatedResponse<typeof transformedCustomers[0]> = {
      data: transformedCustomers,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
      },
    };

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error('API Error - GET /api/customers:', error);

    // Handle specific errors
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch customers',
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}