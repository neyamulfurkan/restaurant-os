// src/components/admin/OrdersTable.tsx

import { Eye, Printer } from 'lucide-react';
import format from 'date-fns/format';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ORDER_STATUS, ORDER_TYPE } from '@/lib/constants';
import type { OrderWithRelations, OrderStatus, OrderType } from '@/types';

interface OrdersTableProps {
  orders: OrderWithRelations[];
  onRowClick: (order: OrderWithRelations) => void;
  onPrint?: (order: OrderWithRelations) => void;
}

export function OrdersTable({ orders, onRowClick, onPrint }: OrdersTableProps) {
  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case ORDER_STATUS.PENDING:
        return 'warning';
      case ORDER_STATUS.ACCEPTED:
      case ORDER_STATUS.PREPARING:
        return 'default';
      case ORDER_STATUS.READY:
      case ORDER_STATUS.OUT_FOR_DELIVERY:
        return 'default';
      case ORDER_STATUS.DELIVERED:
        return 'success';
      case ORDER_STATUS.CANCELLED:
      case ORDER_STATUS.REJECTED:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeColor = (status: OrderStatus) => {
    switch (status) {
      case ORDER_STATUS.PENDING:
        return 'bg-yellow-500 hover:bg-yellow-600';
      case ORDER_STATUS.ACCEPTED:
        return 'bg-blue-500 hover:bg-blue-600';
      case ORDER_STATUS.PREPARING:
        return 'bg-purple-500 hover:bg-purple-600';
      case ORDER_STATUS.READY:
        return 'bg-green-500 hover:bg-green-600';
      case ORDER_STATUS.OUT_FOR_DELIVERY:
        return 'bg-indigo-500 hover:bg-indigo-600';
      case ORDER_STATUS.DELIVERED:
        return 'bg-green-600 hover:bg-green-700';
      case ORDER_STATUS.CANCELLED:
        return 'bg-red-500 hover:bg-red-600';
      case ORDER_STATUS.REJECTED:
        return 'bg-red-600 hover:bg-red-700';
      default:
        return '';
    }
  };

  const formatOrderType = (type: OrderType) => {
    switch (type) {
      case ORDER_TYPE.DINE_IN:
        return 'Dine-In';
      case ORDER_TYPE.PICKUP:
        return 'Pickup';
      case ORDER_TYPE.DELIVERY:
        return 'Delivery';
      default:
        return type;
    }
  };

  const formatStatus = (status: OrderStatus) => {
    return status
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getTotalItems = (orderItems: OrderWithRelations['orderItems']) => {
    return orderItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleRowClick = (order: OrderWithRelations) => {
    onRowClick(order);
  };

  const handlePrintClick = (
    e: React.MouseEvent,
    order: OrderWithRelations
  ) => {
    e.stopPropagation();
    if (onPrint) {
      onPrint(order);
    }
  };

  const handleViewClick = (
    e: React.MouseEvent,
    order: OrderWithRelations
  ) => {
    e.stopPropagation();
    onRowClick(order);
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-neutral-600">No orders found</p>
        <p className="mt-2 text-sm text-neutral-500">
          Orders will appear here when customers place them
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Order ID</TableHead>
            <TableHead className="font-semibold">Customer</TableHead>
            <TableHead className="font-semibold">Items</TableHead>
            <TableHead className="font-semibold">Total</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Order Type</TableHead>
            <TableHead className="font-semibold">Time</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              onClick={() => handleRowClick(order)}
              className="cursor-pointer transition-colors hover:bg-neutral-50"
            >
              <TableCell className="font-medium">
                {order.orderNumber}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-neutral-900">
                    {order.customer.name}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {order.customer.email}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <span className="font-medium">
                  {getTotalItems(order.orderItems)}
                </span>
                <span className="text-neutral-500"> items</span>
              </TableCell>
              <TableCell className="font-semibold">
                ${order.totalAmount.toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={getStatusBadgeVariant(order.status)}
                  className={getStatusBadgeColor(order.status)}
                >
                  {formatStatus(order.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-neutral-700">
                  {formatOrderType(order.type)}
                </span>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-neutral-900">
                    {format(new Date(order.createdAt), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {format(new Date(order.createdAt), 'h:mm a')}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleViewClick(e, order)}
                    className="h-8 w-8"
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handlePrintClick(e, order)}
                    className="h-8 w-8"
                    title="Print order"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}