// src/app/admin/orders/page.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import React from 'react';
import { Search, Calendar, RefreshCw } from 'lucide-react';
import format from 'date-fns/format';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { OrdersTable } from '@/components/admin/OrdersTable';
import OrderDetailsModal from '@/components/admin/OrderDetailsModal';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useOrders } from '@/hooks/useOrders';
import { OrderWithRelations, OrderStatus, OrderType } from '@/types';
import { ORDER_STATUS, ORDER_TYPE } from '@/lib/constants';
import { cn } from '@/lib/utils';


type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export default function AdminOrdersPage() {
  // State
  const [activeTab, setActiveTab] = useState<'all' | OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 20;

  // Fetch ALL orders regardless of active tab for proper counts
  const { data: ordersData, isLoading, isError, refetch } = useOrders(
    undefined,
    undefined // Always fetch all orders
  );

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    if (!ordersData?.orders) return [];

    let filtered = [...ordersData.orders];

    // Filter by active tab status
    if (activeTab !== 'all') {
      filtered = filtered.filter((order) => order.status === activeTab);
    }

    // Filter by order type
    if (orderTypeFilter !== 'all') {
      filtered = filtered.filter((order) => order.type === orderTypeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [ordersData?.orders, activeTab, orderTypeFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ordersPerPage;
    return filteredOrders.slice(startIndex, startIndex + ordersPerPage);
  }, [filteredOrders, currentPage, ordersPerPage]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, orderTypeFilter, searchQuery, dateRange]);

  // Get order counts by status
  const getStatusCount = (status: OrderStatus | 'all'): number => {
    if (!ordersData?.orders) return 0;
    if (status === 'all') return ordersData.orders.length;
    return ordersData.orders.filter((order) => order.status === status).length;
  };

  // Handle order update
  const handleOrderUpdate = (updatedOrder: OrderWithRelations) => {
    refetch();
    setSelectedOrder(updatedOrder);
  };

  // Handle print
  const handlePrint = (order: OrderWithRelations) => {
    // Open print dialog with order details
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kitchen Ticket - ${order.orderNumber}</title>
          <style>
            body { font-family: monospace; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            .order-info { margin-bottom: 20px; }
            .items { margin-top: 20px; }
            .item { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #ccc; }
            .special { background: #fff3cd; padding: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h1>KITCHEN TICKET</h1>
          <div class="order-info">
            <p><strong>Order #:</strong> ${order.orderNumber}</p>
            <p><strong>Type:</strong> ${order.type}</p>
            <p><strong>Time:</strong> ${format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}</p>
            ${order.tableNumber ? `<p><strong>Table:</strong> ${order.tableNumber}</p>` : ''}
          </div>
          <div class="items">
            <h2>ITEMS:</h2>
            ${order.orderItems.map((item) => `
              <div class="item">
                <p><strong>${item.quantity}x ${item.name}</strong></p>
                ${item.customizations && Array.isArray(item.customizations) && item.customizations.length > 0
                  ? `<p style="margin-left: 20px;">+ ${(item.customizations as any[]).map((c) => c.optionName).join(', ')}</p>`
                  : ''
                }
                ${item.specialInstructions
                  ? `<p style="margin-left: 20px; font-style: italic;">Note: ${item.specialInstructions}</p>`
                  : ''
                }
              </div>
            `).join('')}
          </div>
          ${order.specialInstructions
            ? `<div class="special"><strong>SPECIAL INSTRUCTIONS:</strong><br/>${order.specialInstructions}</div>`
            : ''
          }
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg font-medium text-red-600">Failed to load orders</p>
        <Button onClick={() => refetch()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders</h1>
          <p className="mt-1 text-muted-foreground">
            Manage and track all customer orders
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, customer name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Order Type Filter */}
          <Select
            value={orderTypeFilter}
            onValueChange={(value) => setOrderTypeFilter(value as OrderType | 'all')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Order Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value={ORDER_TYPE.DINE_IN}>Dine-In</SelectItem>
              <SelectItem value={ORDER_TYPE.PICKUP}>Pickup</SelectItem>
              <SelectItem value={ORDER_TYPE.DELIVERY}>Delivery</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange.from && dateRange.to ? (
                  <>
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                  </>
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Quick Select</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: new Date(),
                        to: new Date(),
                      })}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                        to: new Date(),
                      })}
                    >
                      Last 7 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        to: new Date(),
                      })}
                    >
                      Last 30 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                        to: new Date(),
                      })}
                    >
                      Last 90 days
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Active Filters */}
        {(searchQuery || orderTypeFilter !== 'all') && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchQuery}
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-1 hover:text-red-600"
                >
                  ×
                </button>
              </Badge>
            )}
            {orderTypeFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Type: {orderTypeFilter}
                <button
                  onClick={() => setOrderTypeFilter('all')}
                  className="ml-1 hover:text-red-600"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all" className="relative">
            All Orders
            <Badge variant="secondary" className="ml-2">
              {getStatusCount('all')}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value={ORDER_STATUS.PENDING}>
            Pending
            <Badge variant="secondary" className="ml-2" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              {getStatusCount(ORDER_STATUS.PENDING)}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value={ORDER_STATUS.PREPARING}>
            Preparing
            <Badge variant="secondary" className="ml-2" style={{ backgroundColor: '#ffedd5', color: '#9a3412' }}>
              {getStatusCount(ORDER_STATUS.PREPARING)}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value={ORDER_STATUS.READY}>
            Ready
            <Badge variant="secondary" className="ml-2" style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}>
              {getStatusCount(ORDER_STATUS.READY)}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value={ORDER_STATUS.DELIVERED}>
            Completed
            <Badge variant="secondary" className="ml-2" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
              {getStatusCount(ORDER_STATUS.DELIVERED)}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value={ORDER_STATUS.CANCELLED}>
            Cancelled
            <Badge variant="secondary" className="ml-2" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
              {getStatusCount(ORDER_STATUS.CANCELLED)}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Orders Table */}
              <OrdersTable
                orders={paginatedOrders as OrderWithRelations[]}
                onRowClick={setSelectedOrder}
                onPrint={handlePrint}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-neutral-600">
                    Showing {((currentPage - 1) * ordersPerPage) + 1} to{' '}
                    {Math.min(currentPage * ordersPerPage, filteredOrders.length)} of{' '}
                    {filteredOrders.length} orders
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          // Show first, last, current, and adjacent pages
                          return (
                            page === 1 ||
                            page === totalPages ||
                            Math.abs(page - currentPage) <= 1
                          );
                        })
                        .map((page, idx, arr) => (
                          <React.Fragment key={page}>
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span className="px-2 text-muted-foreground">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                'min-w-[2.5rem]'
                              )}
                              style={currentPage === page ? {
                                backgroundColor: 'hsl(var(--primary))',
                                color: 'white'
                              } : {}}
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={handleOrderUpdate}
        />
      )}
    </div>
  );
}