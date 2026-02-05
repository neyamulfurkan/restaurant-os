// src/app/admin/dashboard/page.tsx

'use client';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import KPICard from '@/components/admin/KPICard';
import SalesChart, { SalesChartData } from '@/components/admin/SalesChart';
import OrdersPieChart from '@/components/admin/OrdersPieChart';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { OrderStatus, BookingStatus, OrderType } from '@/types';
import Link from 'next/link';
import AIForecastWidget from '@/components/admin/AIForecastWidget';

// ============= TYPES =============

interface DashboardStats {
  totalSalesToday: number;
  totalSalesYesterday: number;
  activeOrders: number;
  todayBookings: number;
  popularItem: {
    name: string;
    imageUrl: string | null;
    ordersCount: number;
  } | null;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: OrderStatus;
  type: OrderType;
  createdAt: string;
}

interface RecentBooking {
  id: string;
  bookingNumber: string;
  customerName: string;
  date: string;
  time: string;
  guests: number;
  status: BookingStatus;
}

interface OrderTypeCount {
  type: OrderType;
  count: number;
}

// ============= COMPONENT =============

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Redirect non-admin users
  React.useEffect(() => {
    if (session?.user?.role && session.user.role !== 'ADMIN') {
      router.push('/admin/orders');
    }
  }, [session, router]);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesData, setSalesData] = useState<SalesChartData[]>([]);
  const [orderTypeCounts, setOrderTypeCounts] = useState<OrderTypeCount[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setIsLoading(true);

      // Fetch stats from orders API
      // Get restaurant ID from session
      const restaurantId = session?.user?.restaurantId || 'cml1q2zai0000b3gh1wuau3so';
      const ordersRes = await fetch(`/api/orders?restaurantId=${restaurantId}&limit=100`);
      const bookingsRes = await fetch(`/api/bookings?restaurantId=${restaurantId}&limit=100`);

      if (!ordersRes.ok || !bookingsRes.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const ordersData = await ordersRes.json();
      const bookingsData = await bookingsRes.json();

      const allOrders = ordersData.success ? (ordersData.data || []) : [];
      const allBookings = bookingsData.success ? (bookingsData.data || []) : [];

      // Calculate stats from orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayOrders = allOrders.filter((o: { createdAt: string; status: string }) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= today && orderDate < tomorrow && !['CANCELLED', 'REJECTED'].includes(o.status);
      });

      const yesterdayOrders = allOrders.filter((o: { createdAt: string; status: string }) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= yesterday && orderDate < today && !['CANCELLED', 'REJECTED'].includes(o.status);
      });

      const totalSalesToday = todayOrders.reduce((sum: number, o: { totalAmount: number }) => sum + o.totalAmount, 0);
      const totalSalesYesterday = yesterdayOrders.reduce((sum: number, o: { totalAmount: number }) => sum + o.totalAmount, 0);

      const activeOrders = allOrders.filter((o: { status: string }) => 
        ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)
      ).length;

      const todayBookings = allBookings.filter((b: { date: string }) => {
        const bookingDate = new Date(b.date);
        return bookingDate >= today && bookingDate < tomorrow;
      }).length;

      // Generate sales data for last 30 days
      const salesByDate: Array<{ date: string; sales: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayOrders = allOrders.filter((o: { createdAt: string; status: string }) => {
          const orderDate = new Date(o.createdAt);
          return orderDate >= date && orderDate < nextDate && !['CANCELLED', 'REJECTED'].includes(o.status);
        });

        salesByDate.push({
          date: date.toISOString().split('T')[0],
          sales: dayOrders.reduce((sum: number, o: { totalAmount: number }) => sum + o.totalAmount, 0),
        });
      }

      // Order type counts
      const orderTypeCounts: OrderTypeCount[] = [
        { type: 'DINE_IN' as OrderType, count: allOrders.filter((o: { type: string }) => o.type === 'DINE_IN').length },
        { type: 'PICKUP' as OrderType, count: allOrders.filter((o: { type: string }) => o.type === 'PICKUP').length },
        { type: 'DELIVERY' as OrderType, count: allOrders.filter((o: { type: string }) => o.type === 'DELIVERY').length },
      ];

      // Recent orders
      const recentOrders = allOrders
        .sort((a: { createdAt: string }, b: { createdAt: string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map((o: { id: string; orderNumber: string; customer?: { name: string }; totalAmount: number; status: OrderStatus; type: OrderType; createdAt: string }) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customer?.name || 'Guest',
          total: o.totalAmount,
          status: o.status,
          type: o.type,
          createdAt: o.createdAt,
        }));

      // Recent bookings
      const recentBookings = allBookings
        .sort((a: { createdAt: string }, b: { createdAt: string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map((b: { id: string; bookingNumber: string; customer?: { name: string }; date: string; time: string; guests: number; status: BookingStatus; createdAt: string }) => ({
          id: b.id,
          bookingNumber: b.bookingNumber,
          customerName: b.customer?.name || 'Guest',
          date: b.date,
          time: b.time,
          guests: b.guests,
          status: b.status,
        }));

      setStats({
        totalSalesToday,
        totalSalesYesterday,
        activeOrders,
        todayBookings,
        popularItem: null,
      });
      setSalesData(salesByDate);
      setOrderTypeCounts(orderTypeCounts);
      setRecentOrders(recentOrders);
      setRecentBookings(recentBookings);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  // Calculate percentage changes for KPIs
  const salesChange = stats.totalSalesYesterday > 0
    ? ((stats.totalSalesToday - stats.totalSalesYesterday) / stats.totalSalesYesterday) * 100
    : 0;

  // Generate trend data for KPI cards (last 7 days - mock data)
  const generateTrendData = (baseValue: number) => {
    return Array.from({ length: 7 }, () => {
      const variation = (Math.random() - 0.5) * 0.3;
      return Math.max(0, baseValue * (1 + variation));
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Dashboard</h1>
        <p className="mt-1" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Sales Today"
          value={stats.totalSalesToday}
          change={salesChange}
          trendData={generateTrendData(stats.totalSalesToday)}
          isCurrency
        />

        <KPICard
          title="Active Orders"
          value={stats.activeOrders}
          change={5.2}
          trendData={generateTrendData(stats.activeOrders)}
        />

        <KPICard
          title="Today's Bookings"
          value={stats.todayBookings}
          change={-2.1}
          trendData={generateTrendData(stats.todayBookings)}
        />

        <Card className="rounded-2xl shadow-md p-6 bg-card border-border">
          <h3 className="text-sm font-medium mb-4 text-muted-foreground">
            Popular Item
          </h3>
          {stats.popularItem ? (
            <div className="flex items-center gap-4">
              {stats.popularItem.imageUrl && (
                <Image
                  src={stats.popularItem.imageUrl}
                  alt={stats.popularItem.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <p className="text-lg font-semibold mb-1 text-foreground">
                  {stats.popularItem.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.popularItem.ordersCount} orders today
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </Card>
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart data={salesData} />
        <OrdersPieChart data={orderTypeCounts} />
      </div>

      {/* Row 3: Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="rounded-2xl shadow-md bg-card border-border">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Recent Orders
              </h3>
              <Link href="/admin/orders">
                <Button variant="ghost" className="text-primary">
                  View All
                </Button>
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y bg-card border-border">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="cursor-pointer transition-colors"
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--muted))'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                      onClick={() => window.location.href = `/admin/orders?id=${order.id}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-foreground">
                          {order.orderNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {order.customerName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(order.total)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getOrderStatusColor(order.status)}>
                          {formatOrderStatus(order.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                          {formatDate(new Date(order.createdAt), 'time')}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <p className="text-sm text-muted-foreground">No recent orders</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Bookings */}
        <Card className="rounded-2xl shadow-md bg-card border-border">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Recent Bookings
              </h3>
              <Link href="/admin/bookings">
                <Button variant="ghost" className="text-primary">
                  View All
                </Button>
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                    Guests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y bg-card border-border">
                {recentBookings.length > 0 ? (
                  recentBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="cursor-pointer transition-colors"
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--muted))'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                      onClick={() => window.location.href = `/admin/bookings?id=${booking.id}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-foreground">
                          {booking.customerName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(new Date(booking.date), 'short')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {booking.time}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {booking.guests}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getBookingStatusColor(booking.status)}>
                          {formatBookingStatus(booking.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <p className="text-sm text-muted-foreground">No recent bookings</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Row 4: AI Forecast Widget */}
      <div className="mt-6">
        <AIForecastWidget restaurantId={session?.user?.restaurantId || 'cml1q2zai0000b3gh1wuau3so'} />
      </div>
    </div>
  );
}

// ============= HELPER FUNCTIONS =============

function formatOrderStatus(status: OrderStatus): string {
  const statusMap: Record<OrderStatus, string> = {
    PENDING: 'Pending',
    ACCEPTED: 'Accepted',
    PREPARING: 'Preparing',
    READY: 'Ready',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    REJECTED: 'Rejected',
  };
  return statusMap[status] || status;
}

function getOrderStatusColor(status: OrderStatus): string {
  const colorMap: Record<OrderStatus, string> = {
    PENDING: 'bg-warning-100 text-warning-800',
    ACCEPTED: 'bg-blue-100 text-blue-800',
    PREPARING: 'bg-purple-100 text-purple-800',
    READY: 'bg-success-100 text-success-800',
    OUT_FOR_DELIVERY: 'bg-blue-100 text-blue-800',
    DELIVERED: 'bg-success-100 text-success-800',
    CANCELLED: 'bg-neutral-100 text-neutral-800',
    REJECTED: 'bg-error-100 text-error-800',
  };
  return colorMap[status] || 'bg-neutral-100 text-neutral-800';
}

function formatBookingStatus(status: BookingStatus): string {
  const statusMap: Record<BookingStatus, string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed',
    NO_SHOW: 'No Show',
  };
  return statusMap[status] || status;
}

function getBookingStatusColor(status: BookingStatus): string {
  const colorMap: Record<BookingStatus, string> = {
    PENDING: 'bg-warning-100 text-warning-800',
    CONFIRMED: 'bg-success-100 text-success-800',
    CANCELLED: 'bg-neutral-100 text-neutral-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    NO_SHOW: 'bg-error-100 text-error-800',
  };
  return colorMap[status] || 'bg-neutral-100 text-neutral-800';
}