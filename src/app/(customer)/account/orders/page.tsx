import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import OrderHistoryClient from '@/components/customer/OrderHistoryClient';

export default async function OrderHistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch orders on server
  const orders = await prisma.order.findMany({
    where: { customerId: session.user.id },
    include: {
      orderItems: {
        include: {
          menuItem: true,
        },
      },
      customer: true,
      deliveryAddress: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Serialize dates for client
  const serializedOrders = orders.map((order) => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    pickupTime: order.pickupTime?.toISOString() || null,
    estimatedDeliveryTime: order.estimatedDeliveryTime?.toISOString() || null,
    actualDeliveryTime: order.actualDeliveryTime?.toISOString() || null,
    customer: {
      ...order.customer,
      createdAt: order.customer.createdAt.toISOString(),
      updatedAt: order.customer.updatedAt.toISOString(),
    },
    orderItems: order.orderItems.map((item) => ({
      ...item,
      menuItem: {
        ...item.menuItem,
        createdAt: item.menuItem.createdAt.toISOString(),
        updatedAt: item.menuItem.updatedAt.toISOString(),
      },
    })),
    deliveryAddress: order.deliveryAddress
      ? {
          ...order.deliveryAddress,
          createdAt: order.deliveryAddress.createdAt.toISOString(),
          updatedAt: order.deliveryAddress.updatedAt.toISOString(),
        }
      : null,
  }));

  return <OrderHistoryClient orders={serializedOrders} />;
}