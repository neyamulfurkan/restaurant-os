// src/services/orderService.ts

import { prisma } from '@/lib/prisma';
import {
  Order,
  OrderWithRelations,
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  OrderFilters,
  PaginatedResponse,
} from '@/types';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { ORDER_STATUS } from '@/lib/constants';

/**
 * Generate a unique order number
 * Format: ORD-YYYYMMDD-XXX
 */
async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  
  // Get today's order count
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(now.setHours(23, 59, 59, 999));
  
  const count = await prisma.order.count({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });
  
  const sequence = String(count + 1).padStart(3, '0');
  return `ORD-${dateStr}-${sequence}`;
}

/**
 * Create a new order with items and initial status history
 */
export async function createOrder(data: CreateOrderRequest): Promise<OrderWithRelations> {
  try {
    // Calculate pricing
    const subtotal = data.items.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const customizationsTotal = (item.customizations || []).reduce(
        (customSum, custom) => customSum + custom.price * item.quantity,
        0
      );
      return sum + itemTotal + customizationsTotal;
    }, 0);

    const taxAmount = subtotal * (await getRestaurantTaxRate(data.restaurantId));
    const serviceFee = await getRestaurantServiceFee(data.restaurantId);
    
    // Calculate delivery fee if delivery order
    let deliveryFee = 0;
    if (data.type === 'DELIVERY' && data.deliveryAddressId) {
      deliveryFee = await calculateDeliveryFee(
        data.restaurantId,
        data.deliveryAddressId
      );
    }

    // Apply promo code discount if provided
    let discountAmount = 0;
    if (data.promoCodeId) {
      discountAmount = await calculatePromoDiscount(
        data.promoCodeId,
        subtotal
      );
    }

    const totalAmount =
      subtotal +
      taxAmount +
      serviceFee +
      deliveryFee +
      (data.tipAmount || 0) -
      discountAmount;

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Create order with items and status history in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          type: data.type,
          status: ORDER_STATUS.PENDING,
          customerId: data.customerId,
          restaurantId: data.restaurantId,
          tableNumber: data.tableNumber,
          pickupTime: data.pickupTime ? new Date(data.pickupTime) : null,
          deliveryAddressId: data.deliveryAddressId,
          deliveryFee,
          subtotal,
          taxAmount,
          serviceFee,
          tipAmount: data.tipAmount || 0,
          discountAmount,
          totalAmount,
          paymentMethod: data.paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          promoCodeId: data.promoCodeId,
          specialInstructions: data.specialInstructions,
          // Set estimated delivery time if delivery order
          estimatedDeliveryTime:
            data.type === 'DELIVERY'
              ? new Date(Date.now() + 45 * 60 * 1000) // 45 minutes from now
              : null,
        },
        include: {
          customer: true,
          orderItems: {
            include: {
              menuItem: true,
            },
          },
          deliveryAddress: true,
          promoCode: true,
        },
      });

      // Create order items
      await tx.orderItem.createMany({
        data: data.items.map((item) => ({
          orderId: newOrder.id,
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          customizations: item.customizations || [],
          specialInstructions: item.specialInstructions,
        })),
      });

      // Create initial status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          status: ORDER_STATUS.PENDING,
          note: 'Order created',
          createdBy: 'SYSTEM',
        },
      });

      // Update promo code usage count if used
      if (data.promoCodeId) {
        await tx.promoCode.update({
          where: { id: data.promoCodeId },
          data: {
            usageCount: { increment: 1 },
          },
        });
      }

      // Update customer stats
      await tx.customer.update({
        where: { id: data.customerId },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: totalAmount },
        },
      });

      // Update inventory if items track inventory
      for (const item of data.items) {
        const menuItem = await tx.menuItem.findUnique({
          where: { id: item.menuItemId },
          select: { trackInventory: true, stockQuantity: true },
        });

        if (menuItem?.trackInventory && menuItem.stockQuantity !== null) {
          await tx.menuItem.update({
            where: { id: item.menuItemId },
            data: {
              stockQuantity: Math.max(0, menuItem.stockQuantity - item.quantity),
            },
          });
        }
      }

      return newOrder;
    });

    return order as OrderWithRelations;
  } catch (error) {
    console.error('Error creating order:', error);
    throw new Error('Failed to create order');
  }
}

/**
 * Update order status and create status history entry
 */
export async function updateOrderStatus(
  orderId: string,
  statusUpdate: UpdateOrderStatusRequest,
  updatedBy?: string
): Promise<Order> {
  try {
    const order = await prisma.$transaction(async (tx) => {
      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: statusUpdate.status as OrderStatus,
          // Set actual delivery time if delivered
          actualDeliveryTime:
            statusUpdate.status === ORDER_STATUS.DELIVERED
              ? new Date()
              : undefined,
        },
      });

      // Create status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: statusUpdate.status as OrderStatus,
          note: statusUpdate.note,
          createdBy: updatedBy || 'SYSTEM',
        },
      });

      return updatedOrder;
    });

    return order;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw new Error('Failed to update order status');
  }
}

/**
 * Get paginated list of orders with filters
 */
export async function getOrders(
  restaurantId: string,
  filters?: OrderFilters,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<OrderWithRelations>> {
  try {
    const where: any = {
      restaurantId,
    };

    // Apply filters
    if (filters?.status) {
      const statusArray = Array.isArray(filters.status) 
        ? filters.status 
        : filters.status.includes(',')
        ? filters.status.split(',')
        : [filters.status];
      
      where.status = statusArray.length > 1 
        ? { in: statusArray }
        : statusArray[0];
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    if (filters?.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    // Get total count
    const total = await prisma.order.count({ where });

    // Get paginated orders
    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        deliveryAddress: true,
        promoCode: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: orders as OrderWithRelations[],
      pagination: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw new Error('Failed to fetch orders');
  }
}

/**
 * Get single order by ID with all relations
 */
export async function getOrderById(orderId: string): Promise<OrderWithRelations | null> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        deliveryAddress: true,
        promoCode: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return order as OrderWithRelations | null;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw new Error('Failed to fetch order');
  }
}

/**
 * Cancel order and process refund if payment completed
 */
export async function cancelOrder(
  orderId: string,
  reason?: string,
  cancelledBy?: string
): Promise<Order> {
  try {
    const order = await prisma.$transaction(async (tx) => {
      // Get current order
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!currentOrder) {
        throw new Error('Order not found');
      }

      // Only allow cancellation for pending/accepted orders
      if (![ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED].includes(currentOrder.status as any)) {
        throw new Error('Order cannot be cancelled at this stage');
      }

      // Update order status
      const cancelledOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: ORDER_STATUS.CANCELLED,
          // Set payment status to refunded if it was completed
          paymentStatus:
            currentOrder.paymentStatus === 'COMPLETED'
              ? PaymentStatus.REFUNDED
              : currentOrder.paymentStatus,
        },
      });

      // Create status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: ORDER_STATUS.CANCELLED,
          note: reason || 'Order cancelled',
          createdBy: cancelledBy || 'SYSTEM',
        },
      });

      // Restore inventory if items tracked inventory
      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
        include: { menuItem: true },
      });

      for (const item of orderItems) {
        if (item.menuItem.trackInventory && item.menuItem.stockQuantity !== null) {
          await tx.menuItem.update({
            where: { id: item.menuItemId },
            data: {
              stockQuantity: { increment: item.quantity },
            },
          });
        }
      }

      // Update customer stats
      await tx.customer.update({
        where: { id: currentOrder.customerId },
        data: {
          totalOrders: { decrement: 1 },
          totalSpent: { decrement: currentOrder.totalAmount },
        },
      });

      return cancelledOrder;
    });

    return order;
  } catch (error) {
    console.error('Error cancelling order:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to cancel order');
  }
}

// ============= HELPER FUNCTIONS =============

async function getRestaurantTaxRate(restaurantId: string): Promise<number> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { taxRate: true },
  });
  return restaurant?.taxRate || 0;
}

async function getRestaurantServiceFee(restaurantId: string): Promise<number> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { serviceFee: true },
  });
  return restaurant?.serviceFee || 0;
}

async function calculateDeliveryFee(
  restaurantId: string,
  addressId: string
): Promise<number> {
  const address = await prisma.address.findUnique({
    where: { id: addressId },
    select: { zipCode: true },
  });

  if (!address) return 0;

  // Find matching delivery zone
  const zone = await prisma.deliveryZone.findFirst({
    where: {
      restaurantId,
      isActive: true,
      zipCodes: {
        has: address.zipCode,
      },
    },
    select: { deliveryFee: true },
  });

  return zone?.deliveryFee || 0;
}

async function calculatePromoDiscount(
  promoCodeId: string,
  subtotal: number
): Promise<number> {
  const promoCode = await prisma.promoCode.findUnique({
    where: { id: promoCodeId },
  });

  if (!promoCode || !promoCode.isActive) return 0;

  // Check if promo code is valid
  const now = new Date();
  if (now < promoCode.validFrom || now > promoCode.validUntil) return 0;

  // Check usage limit
  if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
    return 0;
  }

  // Check minimum order value
  if (subtotal < promoCode.minOrderValue) return 0;

  // Calculate discount
  let discount = 0;
  if (promoCode.discountType === 'PERCENTAGE') {
    discount = subtotal * (promoCode.discountValue / 100);
    // Apply max discount if set
    if (promoCode.maxDiscount && discount > promoCode.maxDiscount) {
      discount = promoCode.maxDiscount;
    }
  } else {
    // Fixed discount
    discount = promoCode.discountValue;
  }

  return Math.min(discount, subtotal);
}