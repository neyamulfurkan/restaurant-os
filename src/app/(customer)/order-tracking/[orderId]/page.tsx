// src/app/(customer)/order-tracking/[orderId]/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Phone, Flag, MapPin, Clock, Package, ChevronDown, ChevronUp } from 'lucide-react';
import OrderStatusStepper from '@/components/customer/OrderStatusStepper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { OrderWithRelations, OrderStatus } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ORDER_STATUS } from '@/lib/constants';

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const { toast } = useToast();
  const [order, setOrder] = useState<OrderWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportIssue, setReportIssue] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<Array<{
    status: OrderStatus;
    createdAt: Date;
    note?: string;
  }>>([]);

  // Fetch order data
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/orders/${orderId}`);
        
        if (!response.ok) {
          throw new Error('Order not found');
        }

        const data = await response.json();
        setOrder(data.data);
        setStatusUpdates(data.data.statusHistory || []);
      } catch (error) {
        console.error('Error fetching order:', error);
        toast({
          title: "Error",
          description: "Failed to load order details",
          variant: "destructive",
        });
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, router, toast]);

  // Real-time subscription for order status updates
  useEffect(() => {
    if (!order) return;

    // Create WebSocket connection or use Supabase Realtime
    const subscribeToUpdates = async () => {
      try {
        // Using polling as fallback (replace with Supabase Realtime in production)
        const interval = setInterval(async () => {
          const response = await fetch(`/api/orders/${orderId}`);
          if (response.ok) {
            const data = await response.json();
            const newOrder = data.data;
            
            // Check if status changed
            if (newOrder.status !== order.status) {
              setOrder(newOrder);
              setStatusUpdates(newOrder.statusHistory || []);
              
              // Show notification
              toast({
                title: "Order Updated",
                description: getStatusMessage(newOrder.status),
              });
              
              // Play notification sound (optional)
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Order Update', {
                  body: getStatusMessage(newOrder.status),
                  icon: '/icons/icon-192x192.png',
                });
              }
            }
          }
        }, 10000); // Poll every 10 seconds

        return () => clearInterval(interval);
      } catch (error) {
        console.error('Error subscribing to updates:', error);
      }
    };

    subscribeToUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, orderId]);

  // Calculate estimated time remaining
  const calculateTimeRemaining = () => {
    if (!order) return null;

    const now = new Date();
    let estimatedTime: Date | null = null;

    if (order.type === 'DELIVERY' && order.estimatedDeliveryTime) {
      estimatedTime = new Date(order.estimatedDeliveryTime);
    } else if (order.type === 'PICKUP' && order.pickupTime) {
      estimatedTime = new Date(order.pickupTime);
    }

    if (!estimatedTime) return null;

    const diffMs = estimatedTime.getTime() - now.getTime();
    if (diffMs <= 0) return 'Any moment now';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''}`;
    }

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  // Handle call restaurant
  const handleCallRestaurant = () => {
    // Get restaurant phone from order or settings
    const phone = '+1234567890'; // Replace with actual restaurant phone
    window.location.href = `tel:${phone}`;
  };

  // Handle report issue
  const handleReportIssue = async () => {
    if (!reportIssue.trim()) {
      toast({
        title: "Error",
        description: "Please describe the issue",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingReport(true);
      
      // Submit report to API
      const response = await fetch('/api/orders/report-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order?.id,
          issue: reportIssue,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit report');

      toast({
        title: "Success",
        description: "Issue reported. We'll contact you shortly.",
      });
      setIsReportDialogOpen(false);
      setReportIssue('');
    } catch (error) {
      console.error('Error reporting issue:', error);
      toast({
        title: "Error",
        description: "Failed to report issue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Get status message
  const getStatusMessage = (status: OrderStatus): string => {
    switch (status) {
      case ORDER_STATUS.PENDING:
        return 'Your order has been received';
      case ORDER_STATUS.ACCEPTED:
        return 'Your order has been accepted';
      case ORDER_STATUS.PREPARING:
        return 'Chef is preparing your food';
      case ORDER_STATUS.READY:
        return order?.type === 'PICKUP' 
          ? 'Your order is ready for pickup'
          : 'Your order is ready';
      case ORDER_STATUS.OUT_FOR_DELIVERY:
        return 'Your order is on the way';
      case ORDER_STATUS.DELIVERED:
        return order?.type === 'DELIVERY'
          ? 'Your order has been delivered'
          : order?.type === 'PICKUP'
          ? 'Order picked up'
          : 'Order served';
      case ORDER_STATUS.CANCELLED:
        return 'Your order has been cancelled';
      case ORDER_STATUS.REJECTED:
        return 'Your order has been rejected';
      default:
        return 'Order status updated';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" />
          <div className="h-32 animate-pulse rounded-lg bg-neutral-200" />
          <div className="h-64 animate-pulse rounded-lg bg-neutral-200" />
        </div>
      </div>
    );
  }

  // Order not found
  if (!order) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="p-8 text-center">
          <Package className="mx-auto h-16 w-16 text-neutral-400" />
          <h2 className="mt-4 text-2xl font-bold text-neutral-900">Order Not Found</h2>
          <p className="mt-2 text-neutral-600">
            We couldn't find the order you're looking for.
          </p>
          <Button onClick={() => router.push('/')} className="mt-6">
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  const timeRemaining = calculateTimeRemaining();
  const isCancelledOrRejected = order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.REJECTED;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8" style={{ 
      minHeight: '100vh',
      backgroundColor: `hsl(var(--page-bg))`
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">
            {isCancelledOrRejected ? 'Order Status' : 'Track Your Order'}
          </h1>
          <p className="mt-2 text-neutral-600">Order #{order.orderNumber}</p>
        </div>

        {/* Progress Stepper */}
        {!isCancelledOrRejected && (
          <Card className="mb-6 p-6">
            <OrderStatusStepper currentStatus={order.status} orderType={order.type} />
          </Card>
        )}

        {/* Cancelled/Rejected Alert */}
        {isCancelledOrRejected && (
          <Card className="mb-6 p-6" style={{ 
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--destructive) / 0.3)'
          }}>
            <div className="flex items-start">
              <Flag className="mr-3 h-6 w-6 flex-shrink-0 text-error-600" />
              <div>
                <h3 className="font-semibold text-error-900">
                  {order.status === ORDER_STATUS.CANCELLED ? 'Order Cancelled' : 'Order Rejected'}
                </h3>
                <p className="mt-1 text-sm text-error-700">
                  {order.status === ORDER_STATUS.CANCELLED
                    ? 'This order has been cancelled.'
                    : 'Unfortunately, we were unable to process this order.'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Estimated Time Card */}
        {!isCancelledOrRejected && timeRemaining && (
          <Card className="mb-6 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="mr-3 h-8 w-8" style={{ color: `hsl(var(--primary))` }} />
                <div>
                  <p className="text-sm font-medium text-neutral-600">
                    {order.type === 'DELIVERY' ? 'Estimated Delivery' : 'Estimated Pickup'}
                  </p>
                  <p className="text-2xl font-bold text-neutral-900">{timeRemaining}</p>
                </div>
              </div>
              {order.type === 'DELIVERY' && order.deliveryAddress && (
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-600">Delivering to</p>
                  <p className="text-sm text-neutral-900">{order.deliveryAddress.street}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Order Details Card */}
        <Card className="mb-6 overflow-hidden" style={{ backgroundColor: 'hsl(var(--card))' }}>
          <div className="border-b border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">Order Details</h2>
              <Badge
                style={{
                  backgroundColor: order.status === ORDER_STATUS.DELIVERED
                    ? 'hsl(var(--success) / 0.1)'
                    : order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.REJECTED
                    ? 'hsl(var(--destructive) / 0.1)'
                    : 'hsl(var(--primary) / 0.1)',
                  color: order.status === ORDER_STATUS.DELIVERED
                    ? 'hsl(var(--success))'
                    : order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.REJECTED
                    ? 'hsl(var(--destructive))'
                    : 'hsl(var(--primary))'
                }}
              >
                {order.status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>

          <div className="p-6">
            {/* Order Info */}
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-neutral-600">Order Type</p>
                <p className="mt-1 text-base text-neutral-900">
                  {order.type.replace(/_/g, ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-600">Order Time</p>
                <p className="mt-1 text-base text-neutral-900">
                  {formatDate(new Date(order.createdAt))}
                </p>
              </div>
              {order.type === 'DINE_IN' && order.tableNumber && (
                <div>
                  <p className="text-sm font-medium text-neutral-600">Table Number</p>
                  <p className="mt-1 text-base text-neutral-900">{order.tableNumber}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-neutral-600">Payment Method</p>
                <p className="mt-1 text-base text-neutral-900">
                  {order.paymentMethod.replace(/_/g, ' ')}
                </p>
              </div>
            </div>

            {/* Items List */}
            <div className="border-t border-neutral-200 pt-6">
              <button
                onClick={() => setIsItemsExpanded(!isItemsExpanded)}
                className="flex w-full items-center justify-between text-left"
              >
                <h3 className="text-base font-semibold text-neutral-900">
                  Items ({order.orderItems.length})
                </h3>
                {isItemsExpanded ? (
                  <ChevronUp className="h-5 w-5 text-neutral-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-neutral-600" />
                )}
              </button>

              {isItemsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 space-y-3"
                >
                  {order.orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between border-b border-neutral-100 pb-3 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900">
                          {item.quantity}x {item.name}
                        </p>
                        {item.customizations && Array.isArray(item.customizations) && (
                          <div className="mt-1 space-y-1">
                            {(item.customizations as Array<{ groupName: string; optionName: string; price: number }>).map(
                              (custom, idx) => (
                                <p key={idx} className="text-sm text-neutral-600">
                                  + {custom.optionName}
                                  {custom.price > 0 && ` (+${formatCurrency(custom.price)})`}
                                </p>
                              )
                            )}
                          </div>
                        )}
                        {item.specialInstructions && (
                          <p className="mt-1 text-sm italic text-neutral-600">
                            Note: {item.specialInstructions}
                          </p>
                        )}
                      </div>
                      <p className="ml-4 font-medium text-neutral-900">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Order Summary */}
            <div className="mt-6 space-y-2 border-t border-neutral-200 pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Subtotal</span>
                <span className="text-neutral-900">{formatCurrency(order.subtotal)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Delivery Fee</span>
                  <span className="text-neutral-900">{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Tax</span>
                <span className="text-neutral-900">{formatCurrency(order.taxAmount)}</span>
              </div>
              {order.serviceFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Service Fee</span>
                  <span className="text-neutral-900">{formatCurrency(order.serviceFee)}</span>
                </div>
              )}
              {order.tipAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Tip</span>
                  <span className="text-neutral-900">{formatCurrency(order.tipAmount)}</span>
                </div>
              )}
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-success-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-lg font-bold">
                <span className="text-neutral-900">Total</span>
                <span className="text-neutral-900">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Live Updates Card */}
        {statusUpdates.length > 0 && (
          <Card className="mb-6 p-6" style={{ backgroundColor: 'hsl(var(--card))' }}>
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">Live Updates</h2>
            <div className="space-y-4">
              {statusUpdates.map((update, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className="flex items-start"
                >
                  <div className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `hsl(var(--primary) / 0.1)` }}>
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: `hsl(var(--primary))` }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900">
                      {getStatusMessage(update.status)}
                    </p>
                    {update.note && (
                      <p className="mt-1 text-sm text-neutral-600">{update.note}</p>
                    )}
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatDate(new Date(update.createdAt))}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Map for Delivery (Placeholder) */}
        {order.type === 'DELIVERY' && !isCancelledOrRejected && (
          <Card className="mb-6 overflow-hidden" style={{ backgroundColor: 'hsl(var(--card))' }}>
            <div className="aspect-video bg-neutral-200">
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <MapPin className="mx-auto h-12 w-12 text-neutral-400" />
                  <p className="mt-2 text-sm text-neutral-600">
                    Map integration coming soon
                  </p>
                  <p className="text-xs text-neutral-500">
                    Google Maps will show delivery route here
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        {!isCancelledOrRejected && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleCallRestaurant}
              variant="outline"
              className="flex-1"
            >
              <Phone className="mr-2 h-4 w-4" />
              Call Restaurant
            </Button>

            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <Flag className="mr-2 h-4 w-4" />
                  Report Issue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report an Issue</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Textarea
                    placeholder="Please describe the issue with your order..."
                    value={reportIssue}
                    onChange={(e) => setReportIssue(e.target.value)}
                    rows={4}
                  />
                  <Button
                    onClick={handleReportIssue}
                    disabled={isSubmittingReport}
                    className="w-full"
                  >
                    {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </motion.div>
    </div>
  );
}