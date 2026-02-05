// src/services/bookingService.ts

import { prisma } from '@/lib/prisma';
import { BOOKING_STATUS } from '@/lib/constants';
import type {
  BookingWithRelations,
  CreateBookingRequest,
  CheckAvailabilityRequest,
  AvailabilityResponse,
  TimeSlot,
  BookingFilters,
  PaginatedResponse,
} from '@/types';
import type { BookingStatus } from '@prisma/client';

/**
 * Creates a new booking
 * @param data - Booking creation data
 * @returns Created booking with relations
 */
export async function createBooking(
  data: CreateBookingRequest
): Promise<BookingWithRelations> {
  const { customerId, date, time, guests, specialRequests } = data;

  // Generate booking number
  const bookingNumber = await generateBookingNumber();

  // Parse date and time (preserve local date, not UTC)
  const [year, month, day] = date.split('-').map(Number);
  const bookingDate = new Date(year, month - 1, day);
  
  // Create the booking
  const booking = await prisma.booking.create({
    data: {
      bookingNumber,
      customerId,
      restaurantId: data.restaurantId || await getDefaultRestaurantId(),
      date: bookingDate,
      time,
      guests,
      specialRequests,
      status: BOOKING_STATUS.PENDING,
    },
    include: {
      customer: true,
      table: {
        select: {
          id: true,
          number: true,
          capacity: true,
          shape: true,
          width: true,
          height: true,
          positionX: true,
          positionY: true,
          isActive: true,
          restaurantId: true,
        },
      },
    },
  });

  return booking;
}

/**
 * Checks availability for a given date and returns available time slots
 * @param request - Availability check parameters
 * @returns Available time slots for the date
 */
export async function checkAvailability(
  request: CheckAvailabilityRequest
): Promise<AvailabilityResponse> {
  const { date, guests, restaurantId } = request;
  
  // Parse date in local timezone
  const [year, month, day] = date.split('-').map(Number);
  const bookingDate = new Date(year, month - 1, day);
  
  // Get restaurant settings to determine operating hours and booking intervals
  const restaurant = await prisma.restaurant.findFirst({
    where: restaurantId ? { id: restaurantId, isActive: true } : { isActive: true },
    select: {
      operatingHours: true,
      autoConfirmBookings: true,
    },
  });

  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = bookingDate.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];

  // Get operating hours for this day
  const operatingHours = restaurant?.operatingHours as Record<string, { open: string; close: string; closed?: boolean }> | null;
  const dayHours = operatingHours?.[dayName];

  console.log('=== BOOKING DEBUG ===');
  console.log('Date:', date);
  console.log('Day:', dayName);
  console.log('Operating Hours:', operatingHours);
  console.log('Day Hours:', dayHours);

  // Default hours if not set (11:00 AM - 10:00 PM)
  let openTime = '11:00';
  let closeTime = '22:00';
  let isClosed = false;

  if (operatingHours && dayHours) {
    if (dayHours.closed === true) {
      // Restaurant is closed on this day
      console.log(`Restaurant is CLOSED on ${dayName}`);
      isClosed = true;
    } else if (dayHours.open && dayHours.close) {
      // Convert from 12-hour format (09:00 AM) to 24-hour format (09:00)
      openTime = convertTo24Hour(dayHours.open);
      closeTime = convertTo24Hour(dayHours.close);
      console.log('Converted times:', { openTime, closeTime, original: dayHours });
    }
  } else {
    console.log('Using DEFAULT hours (no operating hours configured)');
  }

  // If closed, return empty slots
  if (isClosed) {
    console.log('Returning empty slots - restaurant closed');
    return {
      date: date,
      availableSlots: [],
    };
  }

  console.log('Generating time slots:', { openTime, closeTime });

  // Generate time slots (30-minute intervals by default)
  const timeSlots = generateTimeSlots(openTime, closeTime, 30);

  // Get all tables
  const tables = await prisma.table.findMany({
    where: {
      isActive: true,
    },
  });

  // Get existing bookings for this date
  const existingBookings = await prisma.booking.findMany({
    where: {
      date: bookingDate,
      status: {
        in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED],
      },
    },
    include: {
      table: true,
    },
  });

  // Calculate availability for each time slot
  const availableSlots: TimeSlot[] = timeSlots.map((slot) => {
    // If no tables configured, mark all slots as unavailable
    if (tables.length === 0) {
      return {
        time: slot,
        available: false,
        remainingCapacity: 0,
      };
    }

    const slotAvailability = calculateSlotAvailability(
      slot,
      tables,
      existingBookings,
      guests || 1
    );

    return {
      time: slot,
      available: slotAvailability.available,
      remainingCapacity: slotAvailability.remainingCapacity,
    };
  });

  return {
    date,
    availableSlots,
  };
}

/**
 * Retrieves bookings with optional filters
 * @param filters - Filter criteria
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated list of bookings
 */
export async function getBookings(
  filters: BookingFilters = {},
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<BookingWithRelations>> {
  const { status, startDate, endDate, customerId } = filters;

  // Build where clause
  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      where.date.gte = new Date(startDate);
    }
    if (endDate) {
      where.date.lte = new Date(endDate);
    }
  }

  if (customerId) {
    where.customerId = customerId;
  }

  // Get total count
  const total = await prisma.booking.count({ where });

  // Get paginated results
  const bookings = await prisma.booking.findMany({
    where,
    include: {
      customer: true,
      table: {
        select: {
          id: true,
          number: true,
          capacity: true,
          shape: true,
          width: true,
          height: true,
          positionX: true,
          positionY: true,
          isActive: true,
          restaurantId: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    data: bookings,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Updates booking status and optionally assigns a table
 * @param id - Booking ID
 * @param status - New status
 * @param tableId - Optional table ID to assign
 * @param note - Optional note for status change
 * @returns Updated booking
 */
export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  tableId?: string | null
): Promise<BookingWithRelations> {
  const updateData: any = { status };

  // Handle tableId: undefined means don't update, null means unassign, string means assign
  if (tableId !== undefined) {
    if (tableId === null) {
      // Unassign table
      updateData.tableId = null;
    } else {
      // Assign table - verify it exists and is available
      const table = await prisma.table.findUnique({
        where: { id: tableId },
      });

      if (!table) {
        throw new Error('Table not found');
      }

      if (!table.isActive) {
        throw new Error('Table is not active');
      }

      updateData.tableId = tableId;
    }
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: updateData,
    include: {
      customer: true,
      table: {
        select: {
          id: true,
          number: true,
          capacity: true,
          shape: true,
          width: true,
          height: true,
          positionX: true,
          positionY: true,
          isActive: true,
          restaurantId: true,
        },
      },
    },
  });

  return booking;
}

/**
 * Cancels a booking
 * @param id - Booking ID
 * @param reason - Optional cancellation reason
 * @returns Updated booking
 */
export async function cancelBooking(
  id: string
): Promise<BookingWithRelations> {
  const booking = await prisma.booking.update({
    where: { id },
    data: {
      status: BOOKING_STATUS.CANCELLED,
    },
    include: {
      customer: true,
      table: {
        select: {
          id: true,
          number: true,
          capacity: true,
          shape: true,
          width: true,
          height: true,
          positionX: true,
          positionY: true,
          isActive: true,
          restaurantId: true,
        },
      },
    },
  });

  return booking;
}

/**
 * Confirms a booking (admin action)
 * @param id - Booking ID
 * @param tableId - Optional table ID to assign
 * @returns Updated booking
 */
export async function confirmBooking(
  id: string,
  tableId?: string
): Promise<BookingWithRelations> {
  return updateBookingStatus(id, BOOKING_STATUS.CONFIRMED, tableId);
}

/**
 * Marks a booking as no-show
 * @param id - Booking ID
 * @returns Updated booking
 */
export async function markNoShow(id: string): Promise<BookingWithRelations> {
  return updateBookingStatus(id, BOOKING_STATUS.NO_SHOW);
}

/**
 * Marks a booking as completed
 * @param id - Booking ID
 * @returns Updated booking
 */
export async function completeBooking(id: string): Promise<BookingWithRelations> {
  return updateBookingStatus(id, BOOKING_STATUS.COMPLETED);
}

/**
 * Gets a single booking by ID
 * @param id - Booking ID
 * @returns Booking with relations or null
 */
export async function getBookingById(
  id: string
): Promise<BookingWithRelations | null> {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      table: {
        select: {
          id: true,
          number: true,
          capacity: true,
          shape: true,
          width: true,
          height: true,
          positionX: true,
          positionY: true,
          isActive: true,
          restaurantId: true,
        },
      },
    },
  });

  return booking;
}

/**
 * Gets bookings for a specific date
 * @param date - Date to check
 * @param status - Optional status filter
 * @returns List of bookings
 */
export async function getBookingsByDate(
  date: string,
  status?: BookingStatus
): Promise<BookingWithRelations[]> {
  const bookingDate = new Date(date);
  
  const where: any = {
    date: bookingDate,
  };

  if (status) {
    where.status = status;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      customer: true,
      table: {
        select: {
          id: true,
          number: true,
          capacity: true,
          shape: true,
          width: true,
          height: true,
          positionX: true,
          positionY: true,
          isActive: true,
          restaurantId: true,
        },
      },
    },
    orderBy: {
      time: 'asc',
    },
  });

  return bookings;
}

// ============= HELPER FUNCTIONS =============

/**
 * Generates a unique booking number
 * Format: BKG-YYYYMMDD-XXX
 */
async function generateBookingNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  
  // Get count of bookings created today
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));
  
  const count = await prisma.booking.count({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  const sequence = (count + 1).toString().padStart(3, '0');
  return `BKG-${dateStr}-${sequence}`;
}

/**
 * Converts 12-hour time format to 24-hour format
 * @param time12h - Time in 12-hour format (e.g., "09:00 AM")
 * @returns Time in 24-hour format (e.g., "09:00")
 */
function convertTo24Hour(time12h: string): string {
  // If already in 24-hour format, return as is
  if (!time12h.includes('AM') && !time12h.includes('PM')) {
    return time12h;
  }

  const [time, period] = time12h.trim().split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Generates time slots between start and end time
 * @param startTime - Start time (HH:MM)
 * @param endTime - End time (HH:MM)
 * @param intervalMinutes - Interval in minutes
 * @returns Array of time strings
 */
function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number = 30
): string[] {
  const slots: string[] = [];
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  let currentMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  while (currentMinutes < endMinutes) { // Generate slots up to closing time
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    slots.push(timeStr);
    currentMinutes += intervalMinutes;
  }
  
  return slots;
}

/**
 * Calculates availability for a specific time slot
 * @param slot - Time slot (HH:MM)
 * @param tables - All available tables
 * @param existingBookings - Existing bookings for the date
 * @param requiredGuests - Number of guests needed
 * @returns Availability information
 */
function calculateSlotAvailability(
  slot: string,
  tables: any[],
  existingBookings: any[],
  requiredGuests: number
): { available: boolean; remainingCapacity: number } {
  console.log(`\n=== Checking slot ${slot} for ${requiredGuests} guests ===`);
  console.log('Total tables:', tables.length);
  console.log('Tables:', tables.map(t => `${t.number} (${t.capacity} guests)`));
  
  // If no tables configured, return unavailable
  if (tables.length === 0) {
    console.log('❌ No tables configured - returning unavailable');
    return {
      available: false,
      remainingCapacity: 0,
    };
  }

  // Calculate slot time range (assuming 2-hour duration)
  const [slotHour, slotMinute] = slot.split(':').map(Number);
  const slotStartMinutes = slotHour * 60 + slotMinute;
  const slotEndMinutes = slotStartMinutes + 120; // 2 hours

  // Find conflicting bookings
  const conflictingBookings = existingBookings.filter((booking) => {
    const [bookingHour, bookingMinute] = booking.time.split(':').map(Number);
    const bookingStartMinutes = bookingHour * 60 + bookingMinute;
    const bookingEndMinutes = bookingStartMinutes + (booking.duration || 120);

    // Check if time ranges overlap
    const overlaps = (
      (slotStartMinutes >= bookingStartMinutes && slotStartMinutes < bookingEndMinutes) ||
      (slotEndMinutes > bookingStartMinutes && slotEndMinutes <= bookingEndMinutes) ||
      (slotStartMinutes <= bookingStartMinutes && slotEndMinutes >= bookingEndMinutes)
    );
    
    if (overlaps) {
      console.log(`  Conflicting booking: ${booking.time} (${booking.guests} guests) - Table ${booking.table?.number || 'unassigned'}`);
    }
    
    return overlaps;
  });

  console.log(`Conflicting bookings: ${conflictingBookings.length}`);

  // Get occupied table IDs
  const occupiedTableIds = new Set(
    conflictingBookings
      .filter((b) => b.tableId)
      .map((b) => b.tableId)
  );

  console.log(`Occupied tables: ${Array.from(occupiedTableIds).length}`);

  // Get available tables (not occupied)
  const availableTables = tables.filter((t) => !occupiedTableIds.has(t.id));

  console.log(`Available tables: ${availableTables.length}`);
  console.log('Available:', availableTables.map(t => `${t.number} (${t.capacity})`));

  // Check if we can accommodate guests by combining tables
  // Option 1: Single table that fits all guests
  const suitableTable = availableTables.find((t) => t.capacity >= requiredGuests);
  
  // Option 2: Multiple tables that together can accommodate guests
  const totalAvailableCapacity = availableTables.reduce((sum, t) => sum + t.capacity, 0);
  const canCombineTables = totalAvailableCapacity >= requiredGuests && availableTables.length > 0;

  console.log(`Suitable table for ${requiredGuests} guests:`, suitableTable ? `${suitableTable.number} (${suitableTable.capacity})` : 'NONE');
  console.log(`Can combine tables: ${canCombineTables}, Total capacity: ${totalAvailableCapacity}`);

  // Calculate remaining capacity (sum of all available table capacities)
  const remainingCapacity = totalAvailableCapacity;

  const result = {
    available: !!suitableTable || canCombineTables,
    remainingCapacity,
  };

  console.log(`Result: available=${result.available}, remainingCapacity=${result.remainingCapacity}`);

  return result;
}

/**
 * Gets the default restaurant ID (for single-restaurant setup)
 * In multi-restaurant scenarios, this should be passed in requests
 */
async function getDefaultRestaurantId(): Promise<string> {
  const restaurant = await prisma.restaurant.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!restaurant) {
    throw new Error('No active restaurant found');
  }

  return restaurant.id;
}

/**
 * Checks if a booking conflicts with existing bookings
 * @param date - Booking date
 * @param time - Booking time
 * @param duration - Booking duration in minutes
 * @param tableId - Optional table ID
 * @param excludeBookingId - Booking ID to exclude (for updates)
 * @returns True if there's a conflict
 */
export async function hasBookingConflict(
  date: Date,
  time: string,
  duration: number = 120,
  tableId?: string,
  excludeBookingId?: string
): Promise<boolean> {
  const [hour, minute] = time.split(':').map(Number);
  const startMinutes = hour * 60 + minute;
  const endMinutes = startMinutes + duration;

  const where: any = {
    date,
    status: {
      in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED],
    },
  };

  if (tableId) {
    where.tableId = tableId;
  }

  if (excludeBookingId) {
    where.id = { not: excludeBookingId };
  }

  const existingBookings = await prisma.booking.findMany({
    where,
  });

  return existingBookings.some((booking) => {
    const [bookingHour, bookingMinute] = booking.time.split(':').map(Number);
    const bookingStartMinutes = bookingHour * 60 + bookingMinute;
    const bookingEndMinutes = bookingStartMinutes + (booking.duration || 120);

    // Check if time ranges overlap
    return (
      (startMinutes >= bookingStartMinutes && startMinutes < bookingEndMinutes) ||
      (endMinutes > bookingStartMinutes && endMinutes <= bookingEndMinutes) ||
      (startMinutes <= bookingStartMinutes && endMinutes >= bookingEndMinutes)
    );
  });
}