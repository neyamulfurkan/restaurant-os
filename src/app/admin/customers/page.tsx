'use client';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import React, { useState } from 'react';
import { Download, Search, User } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Customer } from '@/types';

// Mock data - replace with actual API call
const mockCustomers: Customer[] = [
  {
    id: '1',
    email: 'john.doe@example.com',
    name: 'John Doe',
    phone: '+1234567890',
    passwordHash: null,
    profileImage: null,
    isGuest: false,
    totalOrders: 24,
    totalSpent: 1250.50,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2025-01-28'),
    restaurantId: 'rest1',
    preferredLanguage: 'en',
    marketingConsent: true,
  },
  {
    id: '2',
    email: 'jane.smith@example.com',
    name: 'Jane Smith',
    phone: '+1234567891',
    passwordHash: null,
    profileImage: null,
    isGuest: false,
    totalOrders: 18,
    totalSpent: 890.25,
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2025-01-25'),
    restaurantId: 'rest1',
    preferredLanguage: 'en',
    marketingConsent: true,
  },
  {
    id: '3',
    email: 'bob.wilson@example.com',
    name: 'Bob Wilson',
    phone: '+1234567892',
    passwordHash: null,
    profileImage: null,
    isGuest: false,
    totalOrders: 45,
    totalSpent: 2340.75,
    createdAt: new Date('2023-11-10'),
    updatedAt: new Date('2025-01-30'),
    restaurantId: 'rest1',
    preferredLanguage: 'en',
    marketingConsent: false,
  },
];

// Mock order history data
const mockOrderHistory = [
  {
    id: 'ord1',
    orderNumber: 'ORD-20250128-001',
    totalAmount: 45.50,
    status: 'DELIVERED',
    createdAt: new Date('2025-01-28'),
    type: 'DELIVERY',
  },
  {
    id: 'ord2',
    orderNumber: 'ORD-20250125-023',
    totalAmount: 32.25,
    status: 'DELIVERED',
    createdAt: new Date('2025-01-25'),
    type: 'PICKUP',
  },
  {
    id: 'ord3',
    orderNumber: 'ORD-20250120-045',
    totalAmount: 58.00,
    status: 'DELIVERED',
    createdAt: new Date('2025-01-20'),
    type: 'DINE_IN',
  },
];

export default function AdminCustomersPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Redirect non-admin users
  React.useEffect(() => {
    if (session?.user?.role && session.user.role !== 'ADMIN') {
      router.push('/admin/orders');
    }
  }, [session, router]);

  const [customers] = useState<Customer[]>(mockCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter customers based on search query
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery)
  );

  // Paginate customers
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle customer row click
  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  // Handle export customer data (GDPR compliance)
  const handleExportData = (customer: Customer) => {
    // In production, this would call an API endpoint
    const data = {
      personalInfo: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        joinDate: customer.createdAt,
      },
      statistics: {
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
      },
      preferences: {
        language: customer.preferredLanguage,
        marketingConsent: customer.marketingConsent,
      },
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer-data-${customer.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Customers</h1>
          <p className="mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Manage your customer database and view their activity
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
              <User className="w-6 h-6" style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Total Customers</p>
              <p className="text-2xl font-bold">{customers.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--success) / 0.1)' }}>
              <Download className="w-6 h-6" style={{ color: 'hsl(var(--success))' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Avg Orders per Customer</p>
              <p className="text-2xl font-bold">
                {(
                  customers.reduce((sum, c) => sum + c.totalOrders, 0) /
                  customers.length
                ).toFixed(1)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--accent) / 0.1)' }}>
              <Download className="w-6 h-6" style={{ color: 'hsl(var(--accent))' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Avg Customer Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  customers.reduce((sum, c) => sum + c.totalSpent, 0) /
                    customers.length
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Customers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Total Orders</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead>Last Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">No customers found</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCustomers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => handleCustomerClick(customer)}
                >
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{customer.totalOrders}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(customer.totalSpent)}
                  </TableCell>
                  <TableCell>{formatDate(customer.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportData(customer);
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of{' '}
              {filteredCustomers.length} customers
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Customer Details Modal */}
      <Dialog
        open={selectedCustomer !== null}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              View customer information and order history
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Name</p>
                  <p className="font-medium">{selectedCustomer.name}</p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Email</p>
                  <p className="font-medium">{selectedCustomer.email}</p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Phone</p>
                  <p className="font-medium">{selectedCustomer.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Join Date</p>
                  <p className="font-medium">
                    {formatDate(selectedCustomer.createdAt)}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--muted))' }}>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
                    {selectedCustomer.totalOrders}
                  </p>
                  <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Total Orders</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: 'hsl(var(--success))' }}>
                    {formatCurrency(selectedCustomer.totalSpent)}
                  </p>
                  <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Total Spent</p>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h3 className="font-semibold mb-3">Recent Orders</h3>
                <div className="space-y-2">
                  {mockOrderHistory.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 border rounded-lg transition-colors"
                      style={{ borderColor: 'hsl(var(--border))' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'hsl(var(--muted) / 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div>
                        <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>{order.orderNumber}</p>
                        <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          {formatDate(order.createdAt)} • {order.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                          {formatCurrency(order.totalAmount)}
                        </p>
                        <Badge
                          variant={
                            order.status === 'DELIVERED' ? 'default' : 'outline'
                          }
                          className="text-xs"
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleExportData(selectedCustomer)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline" className="flex-1">
                  Send Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}