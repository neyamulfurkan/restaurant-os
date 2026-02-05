// src/components/admin/TableMapView.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, BookingWithRelations } from '@/types';
import { cn } from '@/lib/utils';
import { Users, MapPin, Calendar, Clock, Move, Check, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface TableMapViewProps {
  tables: Table[];
  bookings: BookingWithRelations[];
  onAssignTable: (bookingId: string, tableId: string) => void;
  selectedDate?: string;
  selectedTime?: string;
  floorPlanImageUrl?: string | null;
}

interface DraggingState {
  bookingId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface TableDraggingState {
  tableId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  initialPosX: number;
  initialPosY: number;
}

export default function TableMapView({
  tables,
  bookings,
  onAssignTable,
  selectedDate,
  selectedTime,
  floorPlanImageUrl,
}: TableMapViewProps) {
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [tableDragging, setTableDragging] = useState<TableDraggingState | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [localTables, setLocalTables] = useState<Table[]>(tables);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalTables(tables);
  }, [tables]);

  // Get table status based on bookings
  const getTableStatus = (table: Table): 'available' | 'reserved' | 'occupied' => {
    const tableBookings = bookings.filter((b) => b.tableId === table.id);

    if (tableBookings.length === 0) return 'available';

    // Check if any booking is currently active (within time range)
    const now = new Date();
    const hasActiveBooking = tableBookings.some((booking) => {
      const bookingDate = new Date(booking.date);
      const [hours, minutes] = booking.time.split(':');
      bookingDate.setHours(parseInt(hours), parseInt(minutes));
      const bookingEnd = new Date(bookingDate.getTime() + booking.duration * 60000);

      return now >= bookingDate && now <= bookingEnd && booking.status === 'CONFIRMED';
    });

    if (hasActiveBooking) return 'occupied';
    return 'reserved';
  };

  // Get bookings for a specific table
  const getTableBookings = (tableId: string) => {
    return bookings.filter((b) => b.tableId === tableId);
  };

  // Get unassigned bookings (filtered by date/time if provided)
  const getUnassignedBookings = () => {
    let filtered = bookings.filter((b) => !b.tableId);

    if (selectedDate) {
      filtered = filtered.filter((b) => {
        const bookingDate = new Date(b.date).toDateString();
        const filterDate = new Date(selectedDate).toDateString();
        return bookingDate === filterDate;
      });
    }

    if (selectedTime) {
      filtered = filtered.filter((b) => b.time === selectedTime);
    }

    return filtered;
  };

  // Handle drag start
  const handleDragStart = (bookingId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragging({
      bookingId,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
    });
  };

  // Handle drag move
  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!dragging) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragging({
      ...dragging,
      currentX: clientX,
      currentY: clientY,
    });

    // Check if hovering over a table
    const element = document.elementFromPoint(clientX, clientY);
    const tableElement = element?.closest('[data-table-id]');
    if (tableElement) {
      const tableId = tableElement.getAttribute('data-table-id');
      setHoveredTable(tableId);
    } else {
      setHoveredTable(null);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    if (!dragging || !hoveredTable) {
      setDragging(null);
      setHoveredTable(null);
      return;
    }

    // Assign booking to hovered table
    onAssignTable(dragging.bookingId, hoveredTable);

    setDragging(null);
    setHoveredTable(null);
  };

  // Handle table drag start
  const handleTableDragStart = (table: Table, e: React.MouseEvent | React.TouchEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setTableDragging({
      tableId: table.id,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      initialPosX: table.positionX ?? 50,
      initialPosY: table.positionY ?? 50,
    });
  };

  // Handle table drag move
  const handleTableDragMove = (e: MouseEvent | TouchEvent) => {
    if (!tableDragging || !mapRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = mapRef.current.getBoundingClientRect();
    const deltaX = clientX - tableDragging.startX;
    const deltaY = clientY - tableDragging.startY;

    const percentX = (deltaX / rect.width) * 100;
    const percentY = (deltaY / rect.height) * 100;

    let newPosX = tableDragging.initialPosX + percentX;
    let newPosY = tableDragging.initialPosY + percentY;

    newPosX = Math.max(5, Math.min(95, newPosX));
    newPosY = Math.max(5, Math.min(95, newPosY));

    setLocalTables((prev) =>
      prev.map((t) =>
        t.id === tableDragging.tableId
          ? { ...t, positionX: newPosX, positionY: newPosY }
          : t
      )
    );

    setTableDragging({
      ...tableDragging,
      currentX: clientX,
      currentY: clientY,
    });
  };

  // Handle table drag end
  const handleTableDragEnd = async () => {
    if (!tableDragging) return;

    const table = localTables.find((t) => t.id === tableDragging.tableId);
    if (!table) {
      setTableDragging(null);
      return;
    }

    try {
      const response = await fetch(`/api/tables/${table.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionX: table.positionX,
          positionY: table.positionY,
        }),
      });

      if (!response.ok) throw new Error('Failed to update table position');
      toast.success('Table position saved');
    } catch (error) {
      console.error('Error saving table position:', error);
      toast.error('Failed to save table position');
      setLocalTables(tables);
    } finally {
      setTableDragging(null);
    }
  };

  // Add event listeners for booking drag
  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      handleDragMove(e);
    };

    const handleEnd = () => {
      handleDragEnd();
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [dragging, hoveredTable]);

  // Add event listeners for table drag
  useEffect(() => {
    if (!tableDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      handleTableDragMove(e);
    };

    const handleEnd = () => {
      handleTableDragEnd();
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [tableDragging]);

  const statusColors = {
    available: 'bg-green-500 hover:bg-green-600',
    reserved: 'bg-yellow-500 hover:bg-yellow-600',
    occupied: 'bg-red-500 hover:bg-red-600',
  };

  const statusLabels = {
    available: 'Available',
    reserved: 'Reserved',
    occupied: 'Occupied',
  };

  const unassignedBookings = getUnassignedBookings();

  // AI Table Optimization Handler
  const handleOptimizeTables = async () => {
    if (unassignedBookings.length === 0) {
      toast.error('No unassigned bookings to optimize');
      return;
    }

    try {
      toast.info('AI is analyzing optimal table assignments...');

      const response = await fetch('/api/ai/optimize-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookings: unassignedBookings.map(b => ({
            id: b.id,
            guests: b.guests,
            time: b.time,
          })),
        }),
      });

      if (!response.ok) throw new Error('Optimization failed');

      const result = await response.json();
      
      toast.success(`AI found optimal assignments! (${Math.round(result.data.utilizationRate * 100)}% utilization)`);

      // Apply the assignments
      for (const assignment of result.data.assignments) {
        await onAssignTable(assignment.bookingId, assignment.tableId);
      }

      toast.success('Tables assigned successfully!');

    } catch (error) {
      console.error('AI optimization error:', error);
      toast.error('AI optimization failed');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Unassigned Bookings Panel */}
      <div className="lg:col-span-1">
        <Card className="p-4">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Unassigned Bookings
          </h3>

          {selectedDate && (
            <p className="text-sm text-neutral-600 mb-3">
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          )}

          {unassignedBookings.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-8">
              No unassigned bookings
            </p>
          ) : (
            <div className="space-y-2">
              {unassignedBookings.map((booking) => (
                <div
                  key={booking.id}
                  className={cn(
                    'p-3 bg-neutral-50 rounded-lg border-2 border-neutral-200',
                    'cursor-move hover:bg-neutral-100 transition-colors',
                    dragging?.bookingId === booking.id && 'opacity-50'
                  )}
                  onMouseDown={(e) => handleDragStart(booking.id, e)}
                  onTouchStart={(e) => handleDragStart(booking.id, e)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      {booking.customer.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {booking.guests}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-neutral-600">
                    <Clock className="w-3 h-3" />
                    {booking.time}
                  </div>
                  {booking.specialRequests && (
                    <p className="text-xs text-neutral-500 mt-2 line-clamp-2">
                      {booking.specialRequests}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-neutral-200">
            <p className="text-xs font-medium text-neutral-600 mb-2">Status</p>
            <div className="space-y-2">
              {Object.entries(statusColors).map(([status, color]) => (
                <div key={status} className="flex items-center gap-2">
                  <div className={cn('w-4 h-4 rounded', color)} />
                  <span className="text-xs text-neutral-600">
                    {statusLabels[status as keyof typeof statusLabels]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Table Map */}
      <div className="lg:col-span-3">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Restaurant Layout
            </h3>
            <div className="flex items-center gap-4">
              <Button
                variant="default"
                size="sm"
                onClick={handleOptimizeTables}
                disabled={unassignedBookings.length === 0}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Optimize
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600">
                  {tables.filter((t) => getTableStatus(t) === 'available').length} available
                </span>
                <span className="text-neutral-400">•</span>
                <span className="text-sm text-neutral-600">
                  {tables.filter((t) => getTableStatus(t) === 'reserved').length} reserved
                </span>
                <span className="text-neutral-400">•</span>
                <span className="text-sm text-neutral-600">
                  {tables.filter((t) => getTableStatus(t) === 'occupied').length} occupied
                </span>
              </div>
              <Button
                variant={editMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Done Editing
                  </>
                ) : (
                  <>
                    <Move className="w-4 h-4 mr-2" />
                    Edit Layout
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Map Container */}
          <div
            ref={mapRef}
            className="relative bg-neutral-50 rounded-xl border-2 border-neutral-200 overflow-hidden"
            style={{ height: '600px', minHeight: '400px' }}
          >
            {/* Background Image */}
            {floorPlanImageUrl && (
              <div className="absolute inset-0 z-0">
                <Image
                  src={floorPlanImageUrl}
                  alt="Floor plan"
                  fill
                  className="object-cover opacity-30"
                />
              </div>
            )}
            {/* Tables */}
            {localTables.map((table) => {
              const status = getTableStatus(table);
              const isHovered = hoveredTable === table.id;
              const isDraggingThis = tableDragging?.tableId === table.id;
              const posX = table.positionX ?? 50;
              const posY = table.positionY ?? 50;
              const shape = table.shape || 'circle';
              const width = table.width || 80;
              const height = table.height || 80;

              const shapeClasses = {
                circle: 'rounded-full',
                rectangle: 'rounded-lg',
                square: 'rounded-lg',
                oval: 'rounded-full',
              };

              return (
                <button
                  key={table.id}
                  data-table-id={table.id}
                  className={cn(
                    'absolute flex flex-col items-center justify-center z-10',
                    shapeClasses[shape as keyof typeof shapeClasses],
                    'transition-all duration-200',
                    'border-4 border-white shadow-lg',
                    statusColors[status],
                    isHovered && !editMode && 'ring-4 ring-primary-500 scale-110',
                    editMode && 'cursor-move ring-2 ring-blue-400',
                    isDraggingThis && 'scale-110 ring-4 ring-blue-500',
                    !table.isActive && 'opacity-50 cursor-not-allowed'
                  )}
                  style={{
                    left: `${posX}%`,
                    top: `${posY}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${width}px`,
                    height: `${height}px`,
                  }}
                  onClick={() => !editMode && table.isActive && setSelectedTable(table)}
                  onMouseDown={(e) => editMode && handleTableDragStart(table, e)}
                  onTouchStart={(e) => editMode && handleTableDragStart(table, e)}
                  disabled={!table.isActive && !editMode}
                >
                  <span className="text-white font-bold text-lg">
                    {table.number}
                  </span>
                  <span className="text-white text-xs flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {table.capacity}
                  </span>
                  {editMode && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                      <Move className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}

            {/* Dragging Ghost */}
            {dragging && (
              <div
                className="fixed pointer-events-none z-50"
                style={{
                  left: dragging.currentX,
                  top: dragging.currentY,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="p-3 bg-white rounded-lg shadow-xl border-2 border-primary-500">
                  <span className="text-sm font-medium">
                    {bookings.find((b) => b.id === dragging.bookingId)?.customer.name}
                  </span>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-neutral-500 mt-4 text-center">
            {editMode
              ? 'Drag tables to arrange your restaurant layout'
              : 'Drag unassigned bookings onto tables to assign them'}
          </p>
        </Card>
      </div>

      {/* Table Details Modal */}
      <Dialog open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Table {selectedTable?.number}
            </DialogTitle>
            <DialogDescription>
              Capacity: {selectedTable?.capacity} guests
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Status */}
            <div>
              <p className="text-sm font-medium mb-2">Status</p>
              <Badge
                className={cn(
                  'text-white',
                  selectedTable && statusColors[getTableStatus(selectedTable)]
                )}
              >
                {selectedTable && statusLabels[getTableStatus(selectedTable)]}
              </Badge>
            </div>

            {/* Assigned Bookings */}
            <div>
              <p className="text-sm font-medium mb-2">Assigned Bookings</p>
              {selectedTable && getTableBookings(selectedTable.id).length === 0 ? (
                <p className="text-sm text-neutral-500">No bookings assigned</p>
              ) : (
                <div className="space-y-2">
                  {selectedTable &&
                    getTableBookings(selectedTable.id).map((booking) => (
                      <div
                        key={booking.id}
                        className="p-3 bg-neutral-50 rounded-lg border border-neutral-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">
                            {booking.customer.name}
                          </span>
                          <Badge
                            variant={
                              booking.status === 'CONFIRMED'
                                ? 'default'
                                : booking.status === 'PENDING'
                                ? 'outline'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-neutral-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(booking.date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {booking.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {booking.guests}
                          </span>
                        </div>
                        {booking.specialRequests && (
                          <p className="text-xs text-neutral-500 mt-2">
                            {booking.specialRequests}
                          </p>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-xs h-7"
                          onClick={async () => {
                            await onAssignTable(booking.id, '');
                            setSelectedTable(null);
                          }}
                        >
                          Unassign
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}