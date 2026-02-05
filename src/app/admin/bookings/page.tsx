// src/app/admin/bookings/page.tsx

'use client';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BookingCalendarView } from '@/components/admin/BookingCalendarView';
import BookingDetailsDrawer from '@/components/admin/BookingDetailsDrawer';
import TableMapView from '@/components/admin/TableMapView';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { BookingWithRelations, Table as TableType } from '@/types';
import { BOOKING_STATUS } from '@/lib/constants';

import { Calendar, Search, Filter, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBookingsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Redirect kitchen users (only ADMIN and WAITER can access)
  React.useEffect(() => {
    if (session?.user?.role === 'KITCHEN') {
      router.push('/admin/orders');
    }
  }, [session, router]);

  const [activeTab, setActiveTab] = useState<'calendar' | 'list' | 'map'>('calendar');
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active'); // Changed from 'all' to 'active'
  const [dateFilter, setDateFilter] = useState<string>('');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all'); // New: all, today, week, month

  // Fetch ALL bookings (no status filter in API)
  const {
    data: bookings,
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useQuery<BookingWithRelations[]>({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const response = await fetch('/api/bookings');
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const result = await response.json();
      console.log('Bookings API response:', result);
      return result.data || result.bookings || [];
    },
  });
// Fetch restaurant settings for floor plan
  const { data: restaurantSettings } = useQuery({
    queryKey: ['restaurant-settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      return data.data;
    },
  });
  // Fetch tables
  const {
    data: tables,
    isLoading: tablesLoading,
  } = useQuery<TableType[]>({
    queryKey: ['admin-tables'],
    queryFn: async () => {
      const response = await fetch('/api/tables');
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      return data.tables || [];
    },
  });
  

  // Filter bookings based on search and date range
  const filteredBookings = React.useMemo(() => {
    if (!bookings) return [];

    let filtered = bookings;

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(
        (booking) =>
          booking.status === BOOKING_STATUS.PENDING ||
          booking.status === BOOKING_STATUS.CONFIRMED
      );
    } else if (statusFilter !== 'all') {
      // Filter by specific status
      filtered = filtered.filter((booking) => booking.status === statusFilter);
    }

    // Apply date range filter
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter((booking) => {
        const bookingDate = new Date(booking.date);
        
        switch (dateRangeFilter) {
          case 'today':
            return bookingDate.toDateString() === today.toDateString();
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return bookingDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setDate(today.getDate() - 30);
            return bookingDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (booking) =>
          booking.bookingNumber.toLowerCase().includes(query) ||
          booking.customer.name.toLowerCase().includes(query) ||
          booking.customer.email.toLowerCase().includes(query) ||
          booking.customer.phone?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [bookings, searchQuery, statusFilter, dateRangeFilter]);

  // Handle booking click
  const handleBookingClick = (booking: BookingWithRelations) => {
    setSelectedBooking(booking);
    setDrawerOpen(true);
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedBooking(null), 300);
  };

  // Handle drawer update
  const handleDrawerUpdate = () => {
    refetchBookings();
  };

  // Handle table assignment
  const handleAssignTable = async (bookingId: string, tableId: string) => {
    console.log('🔵 handleAssignTable called with:', { bookingId, tableId, tableIdType: typeof tableId });
    
    try {
      // Convert empty string to null for unassignment
      const tableIdValue = tableId === '' ? null : tableId;
      
      console.log('🔵 Sending request with tableIdValue:', tableIdValue);
      
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: tableIdValue }),
      });

      console.log('🔵 Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.log('🔴 Error response:', error);
        throw new Error(error.error || 'Failed to update table assignment');
      }

      const result = await response.json();
      console.log('🟢 Success response:', result);
      console.log('🟢 Updated booking table:', result.data?.table);
      console.log('🟢 Updated booking tableId:', result.data?.tableId);

      toast.success(tableIdValue ? 'Table assigned successfully' : 'Table unassigned successfully');
      
      // Force refetch with cache invalidation
      await refetchBookings();
      
      console.log('🔵 Bookings refetched');
    } catch (error) {
      console.error('🔴 Error assigning table:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update table assignment');
    }
  };

  // Export bookings
  const handleExport = () => {
    if (!filteredBookings || filteredBookings.length === 0) {
      toast.error('No bookings to export');
      return;
    }

    // Create CSV content
    const headers = [
      'Booking Number',
      'Date',
      'Time',
      'Customer Name',
      'Email',
      'Phone',
      'Guests',
      'Table',
      'Status',
      'Special Requests',
      'Created At',
    ];

    const rows = filteredBookings.map((booking) => [
      booking.bookingNumber,
      new Date(booking.date).toLocaleDateString(),
      booking.time,
      booking.customer.name,
      booking.customer.email,
      booking.customer.phone || '',
      booking.guests,
      booking.table?.number || 'Not Assigned',
      booking.status,
      booking.specialRequests || '',
      new Date(booking.createdAt).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Bookings exported successfully');
  };

  // Get status badge variant
  const getStatusBadgeVariant = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case BOOKING_STATUS.CONFIRMED:
        return 'default';
      case BOOKING_STATUS.PENDING:
        return 'secondary';
      case BOOKING_STATUS.CANCELLED:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (bookingsLoading || tablesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Bookings</h1>
          <p className="mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Manage table reservations and assignments
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value={BOOKING_STATUS.PENDING}>Pending</SelectItem>
              <SelectItem value={BOOKING_STATUS.CONFIRMED}>Confirmed</SelectItem>
              <SelectItem value={BOOKING_STATUS.COMPLETED}>Completed</SelectItem>
              <SelectItem value={BOOKING_STATUS.CANCELLED}>Cancelled</SelectItem>
              <SelectItem value={BOOKING_STATUS.NO_SHOW}>No Show</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            placeholder="Filter by date"
          />

          {/* Clear Filters */}
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('active');
              setDateFilter('');
              setDateRangeFilter('all');
            }}
          >
            <Filter className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Total Bookings</div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--foreground))' }}>
            {filteredBookings?.length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Pending</div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--warning))' }}>
            {filteredBookings?.filter((b) => b.status === BOOKING_STATUS.PENDING)
              .length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Confirmed</div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--success))' }}>
            {filteredBookings?.filter((b) => b.status === BOOKING_STATUS.CONFIRMED)
              .length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Total Guests</div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--foreground))' }}>
            {filteredBookings?.reduce((sum, b) => sum + b.guests, 0) || 0}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full max-w-[400px] grid-cols-3">
          <TabsTrigger value="calendar">
            <Calendar className="w-4 h-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="map">Table Map</TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar" className="mt-6">
          <Card>
            <BookingCalendarView
              bookings={filteredBookings || []}
              onBookingClick={handleBookingClick}
            />
          </Card>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="mt-6">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings && filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings?.map((booking) => (
                    <TableRow key={booking.id} className="cursor-pointer">
                      <TableCell className="font-medium">
                        {booking.bookingNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{booking.customer.name}</div>
                          <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            {booking.customer.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>
                            {new Date(booking.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{booking.time}</div>
                        </div>
                      </TableCell>
                      <TableCell>{booking.guests}</TableCell>
                      <TableCell>
                        {booking.table ? (
                          <span className="font-medium">{booking.table.number}</span>
                        ) : (
                          <span style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}>Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(booking.status)}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBookingClick(booking)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Table Map View */}
        <TabsContent value="map" className="mt-6">
          <TableMapView
            tables={tables || []}
            bookings={filteredBookings || []}
            onAssignTable={handleAssignTable}
            selectedDate={dateFilter}
            floorPlanImageUrl={restaurantSettings?.floorPlanImageUrl}
          />
        </TabsContent>
      </Tabs>

      {/* Booking Details Drawer */}
      <BookingDetailsDrawer
        booking={selectedBooking}
        tables={tables || []}
        open={drawerOpen}
        onClose={handleDrawerClose}
        onUpdate={handleDrawerUpdate}
      />
    </div>
  );
}