// src/validations/menu.ts

import { z } from 'zod';

// ============= CUSTOMIZATION OPTION SCHEMA =============

export const customizationOptionSchema = z.object({
  id: z.string().cuid().optional(), // Optional for creation
  name: z.string().min(1, 'Option name is required').max(100, 'Option name is too long'),
  priceModifier: z.number().finite('Price modifier must be a valid number'),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  customizationGroupId: z.string().cuid().optional(), // Optional for nested creation
});

export const customizationOptionCreateSchema = customizationOptionSchema.omit({
  id: true,
  customizationGroupId: true,
});

export const customizationOptionUpdateSchema = customizationOptionSchema
  .omit({ customizationGroupId: true })
  .partial();

// ============= CUSTOMIZATION GROUP SCHEMA =============

export const customizationGroupSchema = z.object({
  id: z.string().cuid().optional(), // Optional for creation
  name: z.string().min(1, 'Group name is required').max(100, 'Group name is too long'),
  type: z.enum(['RADIO', 'CHECKBOX'], {
    errorMap: () => ({ message: 'Type must be either RADIO or CHECKBOX' }),
  }),
  isRequired: z.boolean().default(false),
  maxSelections: z.number().int().min(1, 'Max selections must be at least 1').default(1),
  menuItemId: z.string().cuid().optional(), // Optional for nested creation
  sortOrder: z.number().int().min(0).default(0),
  options: z.array(customizationOptionCreateSchema).optional(),
});

export const customizationGroupCreateSchema = customizationGroupSchema.omit({
  id: true,
  menuItemId: true,
});

export const customizationGroupUpdateSchema = customizationGroupSchema
  .omit({ menuItemId: true })
  .partial();

// ============= MENU ITEM SCHEMA =============

export const menuItemSchema = z.object({
  id: z.string().cuid().optional(), // Optional for creation
  name: z.string().min(1, 'Item name is required').max(200, 'Item name is too long'),
  description: z.string().max(1000, 'Description is too long').optional().nullable().or(z.literal('')),
  price: z.number().positive('Price must be greater than 0').finite('Price must be a valid number'),
  imageUrl: z.string().optional().nullable().or(z.literal('')),
  isAvailable: z.boolean().default(true),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  allergens: z.array(z.string()).default([]),
  prepTime: z.number().int().positive('Prep time must be greater than 0').default(15),
  calories: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().nonnegative('Calories cannot be negative').optional()
  ),
  sortOrder: z.number().int().min(0).default(0),
  categoryId: z.string().min(1, 'Category ID is required'),
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  trackInventory: z.boolean().default(false),
  stockQuantity: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().nonnegative('Stock quantity cannot be negative').optional()
  ),
  minStockLevel: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().nonnegative('Min stock level cannot be negative').optional()
  ),
  customizationGroups: z.array(customizationGroupCreateSchema).optional(),
});

export const createMenuItemSchema = menuItemSchema.omit({ id: true }).refine(
  (data) => {
    if (data.trackInventory === true) {
      return (
        data.stockQuantity !== undefined &&
        data.stockQuantity !== null &&
        data.minStockLevel !== undefined &&
        data.minStockLevel !== null
      );
    }
    return true;
  },
  {
    message: 'Stock quantity and min stock level are required when inventory tracking is enabled',
    path: ['trackInventory'],
  }
);

export const updateMenuItemSchema = menuItemSchema
  .omit({ restaurantId: true })
  .partial()
  .refine(
    (data) => {
      // If trackInventory is true, require stockQuantity and minStockLevel
      if (data.trackInventory === true) {
        return (
          data.stockQuantity !== undefined &&
          data.stockQuantity !== null &&
          data.minStockLevel !== undefined &&
          data.minStockLevel !== null
        );
      }
      return true;
    },
    {
      message: 'Stock quantity and min stock level are required when inventory tracking is enabled',
      path: ['trackInventory'],
    }
  );

// ============= CATEGORY SCHEMA =============

export const categorySchema = z.object({
  id: z.string().cuid().optional(), // Optional for creation
  name: z.string().min(1, 'Category name is required').max(100, 'Category name is too long'),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  imageUrl: z.string().optional().nullable().or(z.literal('')),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  restaurantId: z.string().cuid('Invalid restaurant ID'),
});

export const categoryCreateSchema = categorySchema.omit({ id: true });

export const categoryUpdateSchema = categorySchema
  .omit({ restaurantId: true })
  .partial();

// ============= BULK OPERATIONS SCHEMAS =============

export const bulkMenuItemUpdateSchema = z.object({
  itemIds: z.array(z.string().cuid()).min(1, 'At least one item must be selected'),
  updates: z.object({
    isAvailable: z.boolean().optional(),
    categoryId: z.string().cuid().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});

export const bulkDeleteSchema = z.object({
  itemIds: z.array(z.string().cuid()).min(1, 'At least one item must be selected'),
});

// ============= QUERY SCHEMAS =============

export const menuItemQuerySchema = z.object({
  categoryId: z.string().cuid().optional(),
  isAvailable: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['name', 'price', 'sortOrder', 'createdAt']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const categoryQuerySchema = z.object({
  isActive: z.boolean().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['name', 'sortOrder', 'createdAt']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ============= TYPE EXPORTS =============

export type CustomizationOption = z.infer<typeof customizationOptionSchema>;
export type CustomizationOptionCreate = z.infer<typeof customizationOptionCreateSchema>;
export type CustomizationOptionUpdate = z.infer<typeof customizationOptionUpdateSchema>;

export type CustomizationGroup = z.infer<typeof customizationGroupSchema>;
export type CustomizationGroupCreate = z.infer<typeof customizationGroupCreateSchema>;
export type CustomizationGroupUpdate = z.infer<typeof customizationGroupUpdateSchema>;

export type MenuItem = z.infer<typeof menuItemSchema>;
export type MenuItemCreate = z.infer<typeof createMenuItemSchema>;
export type MenuItemUpdate = z.infer<typeof updateMenuItemSchema>;

export type Category = z.infer<typeof categorySchema>;
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;

export type BulkMenuItemUpdate = z.infer<typeof bulkMenuItemUpdateSchema>;
export type BulkDelete = z.infer<typeof bulkDeleteSchema>;

export type MenuItemQuery = z.infer<typeof menuItemQuerySchema>;
export type CategoryQuery = z.infer<typeof categoryQuerySchema>;