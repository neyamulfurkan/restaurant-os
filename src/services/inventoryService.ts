// src/services/inventoryService.ts

import { prisma } from '@/lib/prisma';
import { MenuItem } from '@/types';

// ============= TYPES =============

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryItem extends MenuItem {
  stockStatus: StockStatus;
}

export interface UpdateStockParams {
  adjustment: 'add' | 'remove' | 'set';
  quantity: number;
  reason?: string;
}

export interface InventoryFilters {
  categoryId?: string;
  status?: StockStatus;
  search?: string;
  trackInventoryOnly?: boolean;
}

export interface StockUpdateResult {
  menuItem: MenuItem;
  previousQuantity: number;
  newQuantity: number;
  availabilityChanged: boolean;
}

// ============= HELPER FUNCTIONS =============

/**
 * Determines stock status based on quantity and minimum level
 */
function getStockStatus(
  stockQuantity: number | null,
  minStockLevel: number | null,
  trackInventory: boolean
): StockStatus {
  if (!trackInventory || stockQuantity === null) {
    return 'IN_STOCK';
  }

  if (stockQuantity === 0) {
    return 'OUT_OF_STOCK';
  }

  if (minStockLevel !== null && stockQuantity <= minStockLevel) {
    return 'LOW_STOCK';
  }

  return 'IN_STOCK';
}

/**
 * Calculates new stock quantity based on adjustment type
 */
function calculateNewQuantity(
  currentQuantity: number,
  adjustment: 'add' | 'remove' | 'set',
  quantity: number
): number {
  switch (adjustment) {
    case 'add':
      return currentQuantity + quantity;
    case 'remove':
      return Math.max(0, currentQuantity - quantity);
    case 'set':
      return Math.max(0, quantity);
    default:
      throw new Error(`Invalid adjustment type: ${adjustment}`);
  }
}

// ============= EXPORTED FUNCTIONS =============

/**
 * Updates stock quantity for a menu item
 * Auto-marks item as unavailable if stock reaches 0
 * @param itemId - Menu item ID
 * @param params - Update parameters (adjustment type, quantity, reason)
 * @returns Updated menu item with stock changes
 */
export async function updateStock(
  itemId: string,
  params: UpdateStockParams
): Promise<StockUpdateResult> {
  const { adjustment, quantity, reason } = params;

  // Validate quantity
  if (quantity < 0) {
    throw new Error('Quantity must be a positive number');
  }

  // Fetch current item
  const currentItem = await prisma.menuItem.findUnique({
    where: { id: itemId },
  });

  if (!currentItem) {
    throw new Error(`Menu item with ID ${itemId} not found`);
  }

  if (!currentItem.trackInventory) {
    throw new Error('This item does not have inventory tracking enabled');
  }

  // Calculate new quantity
  const previousQuantity = currentItem.stockQuantity ?? 0;
  const newQuantity = calculateNewQuantity(previousQuantity, adjustment, quantity);

  // Determine if availability should change
  const shouldBeUnavailable = newQuantity === 0;
  const availabilityChanged = currentItem.isAvailable && shouldBeUnavailable;

  // Update item in database
  const updatedItem = await prisma.menuItem.update({
    where: { id: itemId },
    data: {
      stockQuantity: newQuantity,
      isAvailable: shouldBeUnavailable ? false : currentItem.isAvailable,
      updatedAt: new Date(),
    },
  });

  // Log the stock update (optional: create audit trail)
  if (reason) {
    // Could create a StockHistory model in future for audit trail
    console.log(`Stock updated for ${currentItem.name}: ${adjustment} ${quantity}. Reason: ${reason}`);
  }

  return {
    menuItem: updatedItem,
    previousQuantity,
    newQuantity,
    availabilityChanged,
  };
}

/**
 * Retrieves inventory items with stock status
 * @param filters - Optional filters for category, status, search
 * @returns List of menu items with calculated stock status
 */
export async function getInventory(
  filters?: InventoryFilters
): Promise<InventoryItem[]> {
  const {
    categoryId,
    status,
    search,
    trackInventoryOnly = true,
  } = filters || {};

  // Build where clause
  const where: any = {};
  
  if (trackInventoryOnly) {
    where.trackInventory = true;
  }
  
  if (categoryId) {
    where.categoryId = categoryId;
  }

  // Add search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Fetch items from database
  const items = await prisma.menuItem.findMany({
    where,
    include: {
      category: true,
    },
    orderBy: [
      { category: { sortOrder: 'asc' } },
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
  });

  // Add stock status and filter by status if needed
  const inventoryItems: InventoryItem[] = items.map((item) => ({
    ...item,
    stockStatus: getStockStatus(
      item.stockQuantity,
      item.minStockLevel,
      item.trackInventory
    ),
  }));

  // Filter by status if specified
  if (status) {
    return inventoryItems.filter((item) => item.stockStatus === status);
  }

  return inventoryItems;
}

/**
 * Retrieves items with low stock (at or below minimum level)
 * @returns List of items needing restocking
 */
export async function checkLowStock(): Promise<InventoryItem[]> {
  const items = await prisma.menuItem.findMany({
    where: {
      trackInventory: true,
      AND: [
        {
          stockQuantity: {
            lte: prisma.menuItem.fields.minStockLevel,
          },
        },
        {
          minStockLevel: {
            not: null,
          },
        },
      ],
    },
    include: {
      category: true,
    },
    orderBy: {
      stockQuantity: 'asc',
    },
  });

  return items.map((item) => ({
    ...item,
    stockStatus: getStockStatus(
      item.stockQuantity,
      item.minStockLevel,
      item.trackInventory
    ),
  }));
}

/**
 * Bulk update stock quantities (useful for imports)
 * @param updates - Array of item IDs and their new quantities
 * @returns Summary of updates
 */
export async function bulkUpdateStock(
  updates: Array<{ itemId: string; quantity: number; adjustment?: 'add' | 'remove' | 'set' }>
): Promise<{
  successful: number;
  failed: number;
  errors: Array<{ itemId: string; error: string }>;
}> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as Array<{ itemId: string; error: string }>,
  };

  for (const update of updates) {
    try {
      await updateStock(update.itemId, {
        adjustment: update.adjustment || 'set',
        quantity: update.quantity,
      });
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        itemId: update.itemId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Enables inventory tracking for a menu item
 * @param itemId - Menu item ID
 * @param initialQuantity - Initial stock quantity
 * @param minStockLevel - Minimum stock level for alerts
 */
export async function enableInventoryTracking(
  itemId: string,
  initialQuantity: number = 0,
  minStockLevel: number = 5
): Promise<MenuItem> {
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    throw new Error(`Menu item with ID ${itemId} not found`);
  }

  return prisma.menuItem.update({
    where: { id: itemId },
    data: {
      trackInventory: true,
      stockQuantity: initialQuantity,
      minStockLevel,
      isAvailable: initialQuantity > 0,
    },
  });
}

/**
 * Disables inventory tracking for a menu item
 * @param itemId - Menu item ID
 */
export async function disableInventoryTracking(itemId: string): Promise<MenuItem> {
  return prisma.menuItem.update({
    where: { id: itemId },
    data: {
      trackInventory: false,
      stockQuantity: null,
      minStockLevel: null,
    },
  });
}

/**
 * Gets inventory statistics
 * @returns Summary statistics for inventory
 */
export async function getInventoryStats(): Promise<{
  totalItems: number;
  trackedItems: number;
  outOfStock: number;
  lowStock: number;
  inStock: number;
}> {
  const allTrackedItems = await getInventory({ trackInventoryOnly: true });

  return {
    totalItems: await prisma.menuItem.count(),
    trackedItems: allTrackedItems.length,
    outOfStock: allTrackedItems.filter((item) => item.stockStatus === 'OUT_OF_STOCK').length,
    lowStock: allTrackedItems.filter((item) => item.stockStatus === 'LOW_STOCK').length,
    inStock: allTrackedItems.filter((item) => item.stockStatus === 'IN_STOCK').length,
  };
}