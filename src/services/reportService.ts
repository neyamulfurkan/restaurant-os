// src/services/reportService.ts

import { prisma } from '@/lib/prisma';
import {
  SalesReportData,
  ItemPerformanceReportData,
  CustomerInsightsReportData,
  OrderType,
} from '@/types';

// ============= SALES REPORT =============

export async function generateSalesReport(
  restaurantId: string,
  startDate: string | Date,
  endDate: string | Date
): Promise<SalesReportData> {
  // Convert strings to Date if needed
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  // Fetch orders within date range
  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      createdAt: {
        gte: start,
        lte: end,
      },
      status: {
        not: 'CANCELLED',
      },
    },
    include: {
      orderItems: {
        include: {
          menuItem: true,
        },
      },
    },
  });

  // Calculate total sales and orders
  const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Sales by order type
  const salesByType = Object.values(OrderType).map((type) => {
    const typeOrders = orders.filter((o) => o.type === type);
    const amount = typeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    return {
      type,
      amount,
      percentage: totalSales > 0 ? (amount / totalSales) * 100 : 0,
    };
  });

  // Sales trend (daily breakdown)
  const salesTrend: Array<{ date: string; sales: number; amount: number; orders: number }> = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    const dayOrders = orders.filter(
      (o) => o.createdAt >= dayStart && o.createdAt <= dayEnd
    );

    const amount = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    
    salesTrend.push({
      date: dateStr,
      sales: amount,
      amount: amount,
      orders: dayOrders.length,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

const itemSales = new Map<string, { itemId: string; itemName: string; quantity: number; revenue: number }>();

  orders.forEach((order) => {
    order.orderItems.forEach((item) => {
      const existing = itemSales.get(item.menuItemId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
      } else {
        itemSales.set(item.menuItemId, {
          itemId: item.menuItemId,
          itemName: item.name,
          quantity: item.quantity,
          revenue: item.price * item.quantity,
        });
      }
    });
  });

  const topSellingItems = Array.from(itemSales.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    totalSales,
    totalOrders,
    averageOrderValue,
    salesByType,
    salesTrend,
    topSellingItems,
  };
}

// ============= ITEM PERFORMANCE REPORT =============

export async function generateItemPerformanceReport(
  restaurantId: string,
  startDate: string | Date,
  endDate: string | Date
): Promise<ItemPerformanceReportData> {
  // Convert strings to Date if needed
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  // Fetch orders within date range
  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      createdAt: {
        gte: start,
        lte: end,
      },
      status: {
        not: 'CANCELLED',
      },
    },
    include: {
      orderItems: {
        include: {
          menuItem: true,
        },
      },
    },
  });

  // Calculate item performance
  const itemPerformance = new Map<
    string,
    { itemId: string; itemName: string; quantitySold: number; revenue: number }
  >();

  orders.forEach((order) => {
    order.orderItems.forEach((item) => {
      const existing = itemPerformance.get(item.menuItemId);
      if (existing) {
        existing.quantitySold += item.quantity;
        existing.revenue += item.price * item.quantity;
      } else {
        itemPerformance.set(item.menuItemId, {
          itemId: item.menuItemId,
          itemName: item.name,
          quantitySold: item.quantity,
          revenue: item.price * item.quantity,
        });
      }
    });
  });

  const performanceArray = Array.from(itemPerformance.values());

  // Best sellers (top 20 by revenue)
  const bestSellers = performanceArray
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20)
    .map((item) => ({
      ...item,
      profitMargin: undefined, // Can be calculated if cost data available
    }));

  // Worst sellers (bottom 20 by quantity)
  const worstSellers = performanceArray
    .sort((a, b) => a.quantitySold - b.quantitySold)
    .slice(0, 20);

  return {
    bestSellers,
    worstSellers,
  };
}

// ============= CUSTOMER INSIGHTS REPORT =============

export async function generateCustomerInsightsReport(
  restaurantId: string,
  startDate: string | Date,
  endDate: string | Date
): Promise<CustomerInsightsReportData> {
  // Convert strings to Date if needed
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  // Total customers
  const totalCustomers = await prisma.customer.count({
    where: { restaurantId },
  });

  // New customers in date range
  const newCustomers = await prisma.customer.count({
    where: {
      restaurantId,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });

  // Orders in date range
  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      createdAt: {
        gte: start,
        lte: end,
      },
      status: {
        not: 'CANCELLED',
      },
    },
    include: {
      customer: true,
    },
  });

  // Returning customers (customers who ordered more than once in period)
  const customerOrderCounts = new Map<string, number>();
  orders.forEach((order) => {
    customerOrderCounts.set(
      order.customerId,
      (customerOrderCounts.get(order.customerId) || 0) + 1
    );
  });
  const returningCustomers = Array.from(customerOrderCounts.values()).filter(
    (count) => count > 1
  ).length;

  // Average lifetime value (all-time)
  const customersWithStats = await prisma.customer.findMany({
    where: { restaurantId },
    select: {
      id: true,
      name: true,
      totalSpent: true,
      totalOrders: true,
    },
  });

  const averageLifetimeValue =
    totalCustomers > 0
      ? customersWithStats.reduce((sum, c) => sum + c.totalSpent, 0) / totalCustomers
      : 0;

  const averageOrdersPerCustomer =
    totalCustomers > 0
      ? customersWithStats.reduce((sum, c) => sum + c.totalOrders, 0) / totalCustomers
      : 0;

  // Peak ordering hours
  const hourCounts = new Array(24).fill(0);
  orders.forEach((order) => {
    const hour = order.createdAt.getHours();
    hourCounts[hour]++;
  });

  const peakOrderingHours = hourCounts
    .map((count, hour) => ({ hour, orders: count }))
    .filter((h) => h.orders > 0)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 10);

  // Top customers by total spent (all-time)
  const topCustomers = customersWithStats
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 20)
    .map((c) => ({
      customerId: c.id,
      customerName: c.name,
      totalOrders: c.totalOrders,
      totalSpent: c.totalSpent,
    }));

  const newCustomersPercentage = totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : 0;
  const returningCustomersPercentage = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

  return {
    totalCustomers,
    newCustomers,
    newCustomersPercentage,
    returningCustomers,
    returningCustomersPercentage,
    averageLifetimeValue,
    averageOrdersPerCustomer,
    peakOrderingHours,
    topCustomers,
  };
}

// PDF and Excel exports moved to src/lib/reportExports.ts