// src/components/admin/OrderDetailsModal.tsx

import React, { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Printer,
  DollarSign,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import OrderStatusStepper from '@/components/customer/OrderStatusStepper';
// Removed direct import to avoid bundling Prisma in browser
import { OrderWithRelations, OrderStatus } from '@/types';
import { ORDER_STATUS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


interface OrderDetailsModalProps {
  order: OrderWithRelations;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedOrder: OrderWithRelations) => void;
}

export default function OrderDetailsModal({
  order,
  isOpen,
  onClose,
  onUpdate,
}: OrderDetailsModalProps) {
  const { toast } = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Get next available status
  const getNextStatus = (): OrderStatus | null => {
    const statusFlow: Record<OrderStatus, OrderStatus | null> = {
      [ORDER_STATUS.PENDING]: ORDER_STATUS.ACCEPTED,
      [ORDER_STATUS.ACCEPTED]: ORDER_STATUS.PREPARING,
      [ORDER_STATUS.PREPARING]: ORDER_STATUS.READY,
      [ORDER_STATUS.READY]:
        order.type === 'DELIVERY'
          ? ORDER_STATUS.OUT_FOR_DELIVERY
          : ORDER_STATUS.DELIVERED,
      [ORDER_STATUS.OUT_FOR_DELIVERY]: ORDER_STATUS.DELIVERED,
      [ORDER_STATUS.DELIVERED]: null,
      [ORDER_STATUS.CANCELLED]: null,
      [ORDER_STATUS.REJECTED]: null,
    };

    return statusFlow[order.status as OrderStatus] || null;
  };

  const nextStatus = getNextStatus();

  // Handle status update
  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          note: `Status updated to ${newStatus}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const result = await response.json();
      const updatedOrder = result.data;

      toast({
        title: 'Status Updated',
        description: `Order status changed to ${newStatus.toLowerCase()}`,
      });

      onUpdate(updatedOrder as OrderWithRelations);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle refund
  const handleRefund = async () => {
    if (!refundReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for the refund',
        variant: 'destructive',
      });
      return;
    }

    setIsRefunding(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: refundReason,
          cancelledBy: 'ADMIN',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel order');
      }

      const result = await response.json();
      const cancelledOrder = result.data;

      toast({
        title: 'Order Refunded',
        description: 'Order has been cancelled and refunded successfully',
      });

      onUpdate(cancelledOrder as OrderWithRelations);
      setShowRefundDialog(false);
      setRefundReason('');
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to refund order',
        variant: 'destructive',
      });
    } finally {
      setIsRefunding(false);
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle contact customer
  const handleContactCustomer = (type: 'phone' | 'email') => {
    if (type === 'phone' && order.customer?.phone) {
      window.location.href = `tel:${order.customer.phone}`;
    } else if (type === 'email' && order.customer?.email) {
      window.location.href = `mailto:${order.customer.email}`;
    }
  };

  // Copy order ID
  const copyOrderId = () => {
    navigator.clipboard.writeText(order.orderNumber);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
    toast({
      title: 'Copied',
      description: 'Order ID copied to clipboard',
    });
  };

  // Calculate item total
  const getItemTotal = (item: any) => {
    const basePrice = item.price * item.quantity;
    const customizationsTotal = item.customizations
      ? item.customizations.reduce(
          (sum: number, custom: any) => sum + custom.price * item.quantity,
          0
        )
      : 0;
    return basePrice + customizationsTotal;
  };

  // Safety check: if order data is incomplete, don't render
  if (!order || !order.customer || !order.orderItems) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="text-2xl font-bold">Order Details</span>
              <Badge
                className={cn('text-sm', {
                  'bg-yellow-100 text-yellow-800':
                    order.status === ORDER_STATUS.PENDING,
                  'bg-blue-100 text-blue-800':
                    order.status === ORDER_STATUS.ACCEPTED,
                  'bg-orange-100 text-orange-800':
                    order.status === ORDER_STATUS.PREPARING,
                  'bg-purple-100 text-purple-800':
                    order.status === ORDER_STATUS.READY,
                  'bg-indigo-100 text-indigo-800':
                    order.status === ORDER_STATUS.OUT_FOR_DELIVERY,
                  'bg-green-100 text-green-800':
                    order.status === ORDER_STATUS.DELIVERED,
                  'bg-red-100 text-red-800':
                    order.status === ORDER_STATUS.CANCELLED ||
                    order.status === ORDER_STATUS.REJECTED,
                })}
              >
                {order.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Order ID and Type */}
            <div className="flex items-center justify-between rounded-lg bg-muted p-4">
              <div className="flex items-center space-x-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-bold">{order.orderNumber}</p>
                    <button
                      onClick={copyOrderId}
                      className="rounded p-1 hover:bg-neutral-200 transition-colors"
                      aria-label="Copy order ID"
                    >
                      {copiedOrderId ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-neutral-600" />
                      )}
                    </button>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div>
                  <p className="text-sm text-muted-foreground">Order Type</p>
                  <p className="text-lg font-semibold">{order.type}</p>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div>
                  <p className="text-sm text-muted-foreground">Order Time</p>
                  <p className="text-lg font-semibold">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 text-lg font-semibold text-foreground">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <div className="rounded-full p-2" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Name & Email</p>
                    <p className="font-medium">{order.customer?.name || 'N/A'}</p>
                    <p className="text-sm text-neutral-600">
                      {order.customer?.email || 'N/A'}
                    </p>
                  </div>
                </div>
                {order.customer?.phone && (
                  <div className="flex items-start space-x-3">
                    <div className="rounded-full p-2" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Phone</p>
                      <p className="font-medium">{order.customer?.phone}</p>
                    </div>
                  </div>
                )}
                {order.deliveryAddress && (
                  <div className="flex items-start space-x-3 md:col-span-2">
                    <div className="rounded-full p-2" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Delivery Address</p>
                      <p className="font-medium">
                        {order.deliveryAddress.street}
                      </p>
                      <p className="text-sm text-neutral-600">
                        {order.deliveryAddress.city},{' '}
                        {order.deliveryAddress.state}{' '}
                        {order.deliveryAddress.zipCode}
                      </p>
                    </div>
                  </div>
                )}
                {order.tableNumber && (
                  <div className="flex items-start space-x-3">
                    <div className="rounded-full p-2" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
                      <AlertCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Table Number</p>
                      <p className="font-medium">{order.tableNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border p-4">
                <h3 className="text-lg font-semibold text-foreground">Order Items</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Customizations</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.orderItems?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.name}</p>
                        {item.specialInstructions && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Note: {item.specialInstructions}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.customizations &&
                        Array.isArray(item.customizations) &&
                        item.customizations.length > 0 ? (
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {(item.customizations as any[]).map((custom, idx) => (
                              <li key={idx}>
                                {custom.optionName}
                                {custom.price > 0 && ` (+${formatCurrency(custom.price)})`}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(getItemTotal(item))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Special Instructions */}
            {order.specialInstructions && (
              <div className="rounded-lg border p-4" style={{ 
                backgroundColor: 'hsl(var(--warning) / 0.1)',
                borderColor: 'hsl(var(--warning) / 0.3)'
              }}>
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--warning))' }} />
                  <div>
                    <p className="font-semibold text-foreground">Special Instructions</p>
                    <p className="mt-1" style={{ color: 'hsl(var(--warning))' }}>{order.specialInstructions}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Summary */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 text-lg font-semibold text-foreground">Pricing Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                  <span>Tax</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
                {order.serviceFee > 0 && (
                  <div className="flex justify-between" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                    <span>Service Fee</span>
                    <span>{formatCurrency(order.serviceFee)}</span>
                  </div>
                )}
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                    <span>Delivery Fee</span>
                    <span>{formatCurrency(order.deliveryFee)}</span>
                  </div>
                )}
                {order.tipAmount > 0 && (
                  <div className="flex justify-between" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                    <span>Tip</span>
                    <span>{formatCurrency(order.tipAmount)}</span>
                  </div>
                )}
                {order.discountAmount > 0 && (
                  <div className="flex justify-between" style={{ color: 'hsl(var(--success))' }}>
                    <span>Discount</span>
                    <span>-{formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Payment Method</span>
                  <span className="font-medium">{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Payment Status</span>
                  <Badge
                    className={cn({
                      'bg-yellow-100 text-yellow-800':
                        order.paymentStatus === 'PENDING',
                      'bg-green-100 text-green-800':
                        order.paymentStatus === 'COMPLETED',
                      'bg-red-100 text-red-800':
                        order.paymentStatus === 'FAILED',
                      'bg-gray-100 text-gray-800':
                        order.paymentStatus === 'REFUNDED',
                    })}
                  >
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Order Status</h3>
              <OrderStatusStepper
                currentStatus={order.status as OrderStatus}
                orderType={order.type}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {nextStatus && (
                <Button
                  onClick={() => handleStatusUpdate(nextStatus)}
                  disabled={isUpdatingStatus}
                  className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
                >
                  {isUpdatingStatus ? 'Updating...' : `Mark as ${nextStatus}`}
                </Button>
              )}

              {order.paymentStatus === 'COMPLETED' &&
                ![ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED].includes(
                  order.status as any
                ) && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowRefundDialog(true)}
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Refund Order
                  </Button>
                )}

              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print Kitchen Ticket
              </Button>

              {order.customer?.phone && (
                <Button
                  variant="outline"
                  onClick={() => handleContactCustomer('phone')}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Call Customer
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => handleContactCustomer('email')}
              >
                <Mail className="mr-2 h-4 w-4" />
                Email Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Confirmation Dialog */}
      <AlertDialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund Order</AlertDialogTitle>
            <AlertDialogDescription>
              This action will cancel the order and process a refund. Please provide
              a reason for the refund.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Textarea
              placeholder="Reason for refund..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefund}
              disabled={isRefunding || !refundReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRefunding ? 'Processing...' : 'Confirm Refund'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}