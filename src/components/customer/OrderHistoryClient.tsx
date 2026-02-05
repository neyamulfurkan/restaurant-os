'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, ShoppingBag, Clock, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useReorder, useCancelOrder } from '@/hooks/useOrders';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface OrderHistoryClientProps {
  orders: any[];
}

export default function OrderHistoryClient({ orders }: OrderHistoryClientProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const reorderMutation = useReorder();
  const cancelOrderMutation = useCancelOrder();

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleReorder = async (orderId: string) => {
    try {
      const result = await reorderMutation.mutateAsync(orderId);
      toast.success('Order placed successfully!');
      // Redirect to order tracking page
      if (result?.data?.orderId) {
        window.location.href = `/order-tracking/${result.data.orderId}`;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reorder');
    }
  };

  const handleCancelOrder = async (orderId: string, orderStatus: string) => {
    // Only allow cancellation for PENDING or ACCEPTED orders
    if (!['PENDING', 'ACCEPTED'].includes(orderStatus)) {
      toast.error('Order cannot be cancelled. It is already being prepared or completed.');
      return;
    }

    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      await cancelOrderMutation.mutateAsync(orderId);
      toast.success('Order cancelled successfully!');
      // Refresh the page to show updated order list
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel order');
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'DELIVERED':
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
      case 'ACCEPTED':
        return 'warning';
      case 'PREPARING':
      case 'READY':
      case 'OUT_FOR_DELIVERY':
        return 'default';
      case 'CANCELLED':
      case 'REJECTED':
        return 'error';
      default:
        return 'secondary';
    }
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'DELIVERY':
        return <Package className="w-4 h-4" />;
      case 'PICKUP':
        return <ShoppingBag className="w-4 h-4" />;
      case 'DINE_IN':
        return <Clock className="w-4 h-4" />;
      default:
        return <ShoppingBag className="w-4 h-4" />;
    }
  };

  if (orders.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>Order History</h1>
        <p className="mb-6" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
          View your past orders and reorder your favorites
        </p>
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <ShoppingBag className="w-16 h-16 mx-auto text-neutral-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>No orders yet</h3>
            <p className="mb-6" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
              Start exploring our menu and place your first order!
            </p>
            <Link href="/menu">
              <Button>View Menu</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>Order History</h1>
      <p className="mb-6" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
        View your past orders and reorder your favorites
      </p>

      <div className="space-y-4">
        {orders.map((order: any) => {
          const isExpanded = expandedOrders.has(order.id);
          const itemCount = order.orderItems?.reduce(
            (sum: number, item: { quantity: number }) => sum + item.quantity,
            0
          ) || 0;

          return (
            <Card
              key={order.id}
              className="overflow-hidden transition-shadow duration-300 hover:shadow-lg"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg" style={{ color: 'hsl(var(--foreground))' }}>
                        Order #{order.orderNumber}
                      </CardTitle>
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                      <div className="flex items-center gap-1">
                        {getOrderTypeIcon(order.type)}
                        <span>{order.type.replace('_', ' ')}</span>
                      </div>
                      <span>•</span>
                      <span>{formatDate(order.createdAt)}</span>
                      <span>•</span>
                      <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="mb-4">
                  <button
                    onClick={() => toggleOrderExpansion(order.id)}
                    className="flex items-center gap-2 text-sm font-medium transition-colors"
                    style={{ color: 'hsl(var(--foreground) / 0.8)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(var(--primary))'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'hsl(var(--foreground) / 0.8)'}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide items
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        View items
                      </>
                    )}
                  </button>

                  {isExpanded && order.orderItems && (
                    <div className="mt-3 space-y-2 pl-6 border-l-2 border-neutral-200">
                      {order.orderItems.map((item: { id: string; quantity: number; name: string; customizations: any; price: number }) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-start text-sm"
                        >
                          <div className="flex-1">
                            <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                              {item.quantity}x {item.name}
                            </p>
                            {item.customizations && (
                              <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                                {typeof item.customizations === 'string' 
                                  ? item.customizations 
                                  : JSON.stringify(item.customizations)
                                    .replace(/[{}"]/g, '')
                                    .replace(/,/g, ', ')}
                              </p>
                            )}
                          </div>
                          <p className="font-medium ml-4" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Link href={`/order-tracking/${order.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </Link>
                  {['PENDING', 'ACCEPTED'].includes(order.status) && (
                    <Button
                      onClick={() => handleCancelOrder(order.id, order.status)}
                      disabled={cancelOrderMutation.isPending}
                      variant="outline"
                      className="flex-1 border-red-500 text-red-500 hover:bg-red-50"
                    >
                      {cancelOrderMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
                    </Button>
                  )}
                  <Button
                    onClick={() => handleReorder(order.id)}
                    disabled={reorderMutation.isPending}
                    className="flex-1 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                    style={{
                      background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary) / 0.9))',
                    }}
                  >
                    {reorderMutation.isPending ? 'Adding...' : 'Reorder'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}