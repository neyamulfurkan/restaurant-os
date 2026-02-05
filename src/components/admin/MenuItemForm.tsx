// src/components/admin/MenuItemForm.tsx

import * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/shared/ImageUpload';
import type { MenuItemWithRelations, Category } from '@/types';

interface MenuItemFormProps {
  item?: MenuItemWithRelations | null;
  categories: Category[];
  onSubmit: (data: any) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  name: string;
  description: string;
  categoryId: string;
  price: number;
  prepTime: number;
  imageUrl?: string;
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  allergens: string[];
  calories?: number;
  trackInventory: boolean;
  stockQuantity?: number;
  minStockLevel?: number;
  customizationGroups: Array<{
    name: string;
    type: 'RADIO' | 'CHECKBOX';
    isRequired: boolean;
    maxSelections: number;
    options: Array<{
      name: string;
      priceModifier: number;
      isAvailable: boolean;
    }>;
  }>;
}

const COMMON_ALLERGENS = [
  'Nuts',
  'Dairy',
  'Shellfish',
  'Eggs',
  'Fish',
  'Soy',
  'Wheat',
  'Gluten',
];

export function MenuItemForm({
  item,
  categories,
  onSubmit,
  onCancel,
  isLoading = false,
}: MenuItemFormProps) {
  const [customizationExpanded, setCustomizationExpanded] = React.useState(false);
  const [selectedAllergens, setSelectedAllergens] = React.useState<string[]>(
    item?.allergens || []
  );

  const isEditing = Boolean(item);
  // const schema = isEditing ? menuItemUpdateSchema : menuItemCreateSchema;

  const {
    register,
    handleSubmit,
    control,
    watch,
    // setValue,
    formState: { errors },
  } = useForm<FormData>({
    mode: 'onSubmit',
    defaultValues: {
      name: item?.name || '',
      description: item?.description || '',
      categoryId: item?.categoryId || (categories.length > 0 ? categories[0].id : ''),
      price: item?.price || 0,
      prepTime: item?.prepTime || 15,
      imageUrl: item?.imageUrl || undefined,
      isAvailable: item?.isAvailable ?? true,
      isVegetarian: item?.isVegetarian || false,
      isVegan: item?.isVegan || false,
      isGlutenFree: item?.isGlutenFree || false,
      allergens: item?.allergens || [],
      calories: item?.calories || undefined,
      trackInventory: item?.trackInventory || false,
      stockQuantity: item?.stockQuantity || undefined,
      minStockLevel: item?.minStockLevel || undefined,
      customizationGroups:
        item?.customizationGroups.map((group) => ({
          name: group.name,
          type: group.type as 'RADIO' | 'CHECKBOX',
          isRequired: group.isRequired,
          maxSelections: group.maxSelections,
          options: group.options.map((option) => ({
            name: option.name,
            priceModifier: option.priceModifier,
            isAvailable: option.isAvailable,
          })),
        })) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'customizationGroups',
  });

  const trackInventory = watch('trackInventory');

  const handleFormSubmit = async (data: FormData) => {
    console.log('=== FORM SUBMISSION START ===');
    console.log('Form submitted with data:', data);
    console.log('Categories:', categories);
    console.log('Form errors:', errors);
    
    // Get restaurantId from the first category (all categories belong to same restaurant)
    const restaurantId = categories.length > 0 ? categories[0].restaurantId : undefined;
    
    console.log('Restaurant ID:', restaurantId);
    
    if (!restaurantId) {
      console.error('No restaurant ID found from categories');
      console.error('Categories structure:', JSON.stringify(categories, null, 2));
      alert('Error: Restaurant ID not found. Please contact support.');
      return;
    }

    // Clean up the data before submission
    const submitData: any = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      categoryId: data.categoryId,
      price: Number(data.price),
      prepTime: Number(data.prepTime),
      isAvailable: data.isAvailable,
      isVegetarian: data.isVegetarian,
      isVegan: data.isVegan,
      isGlutenFree: data.isGlutenFree,
      allergens: selectedAllergens,
      sortOrder: 0,
      restaurantId: restaurantId,
      trackInventory: data.trackInventory,
    };

    // Add optional fields only if they have values
    if (data.imageUrl) {
      submitData.imageUrl = data.imageUrl;
    }

    if (data.calories && !isNaN(Number(data.calories))) {
      submitData.calories = Number(data.calories);
    }

    if (data.trackInventory) {
      if (data.stockQuantity !== undefined && data.stockQuantity !== null) {
        submitData.stockQuantity = Number(data.stockQuantity);
      }
      if (data.minStockLevel !== undefined && data.minStockLevel !== null) {
        submitData.minStockLevel = Number(data.minStockLevel);
      }
    }

    if (data.customizationGroups && data.customizationGroups.length > 0) {
      submitData.customizationGroups = data.customizationGroups
        .filter(group => group.name && group.name.trim())
        .map((group, groupIdx) => ({
          name: group.name.trim(),
          type: group.type,
          isRequired: group.isRequired,
          maxSelections: Number(group.maxSelections),
          sortOrder: groupIdx,
          options: group.options
            ?.filter(option => option.name && option.name.trim())
            .map((option, optIdx) => ({
              name: option.name.trim(),
              priceModifier: Number(option.priceModifier) || 0,
              isAvailable: option.isAvailable,
              sortOrder: optIdx,
            })),
        }));
    }
    
    console.log('Final submit data:', JSON.stringify(submitData, null, 2));
    
    try {
      await onSubmit(submitData);
      console.log('=== FORM SUBMISSION SUCCESS ===');
    } catch (error) {
      console.error('=== FORM SUBMISSION ERROR ===');
      console.error('Error details:', error);
    }
  };

  const handleAllergenToggle = (allergen: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    );
  };

  const addCustomizationGroup = () => {
    append({
      name: '',
      type: 'RADIO',
      isRequired: false,
      maxSelections: 1,
      options: [{ name: '', priceModifier: 0, isAvailable: true }],
    });
    setCustomizationExpanded(true);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Name */}
      <div>
        <Label htmlFor="name">
          Item Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Margherita Pizza"
          disabled={isLoading}
          className="mt-2"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-destructive">
            {errors.name.message || 'Item name is required'}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Describe the item..."
          rows={3}
          disabled={isLoading}
          className="mt-2"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Image Upload */}
      <div>
        <Label>Item Image (Optional)</Label>
        <Controller
          name="imageUrl"
          control={control}
          render={({ field }) => (
            <ImageUpload
              currentImage={field.value}
              onUpload={(url) => field.onChange(url)}
              onRemove={() => field.onChange(undefined)}
              bucket="menu-items"
              folder="items"
              disabled={isLoading}
              className="mt-2"
            />
          )}
        />
      </div>

      {/* Category and Price Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Category */}
        <div>
          <Label htmlFor="categoryId">
            Category <span className="text-destructive">*</span>
          </Label>
          <select
            id="categoryId"
            {...register('categoryId', { required: true })}
            disabled={isLoading}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-2"
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-sm text-destructive">
              {errors.categoryId.message}
            </p>
          )}
        </div>

        {/* Price */}
        <div>
          <Label htmlFor="price">
            Price <span className="text-destructive">*</span>
          </Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            {...register('price', { valueAsNumber: true })}
            placeholder="0.00"
            disabled={isLoading}
            className="mt-2"
          />
          {errors.price && (
            <p className="mt-1 text-sm text-destructive">
              {errors.price.message}
            </p>
          )}
        </div>
      </div>

      {/* Prep Time and Calories Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Prep Time */}
        <div>
          <Label htmlFor="prepTime">Preparation Time (minutes)</Label>
          <Input
            id="prepTime"
            type="number"
            {...register('prepTime', { valueAsNumber: true })}
            placeholder="15"
            disabled={isLoading}
            className="mt-2"
          />
          {errors.prepTime && (
            <p className="mt-1 text-sm text-destructive">
              {errors.prepTime.message}
            </p>
          )}
        </div>

        {/* Calories */}
        <div>
          <Label htmlFor="calories">Calories (optional)</Label>
          <Input
            id="calories"
            type="number"
            {...register('calories', { valueAsNumber: true })}
            placeholder="e.g., 450"
            disabled={isLoading}
            className="mt-2"
          />
          {errors.calories && (
            <p className="mt-1 text-sm text-destructive">
              {errors.calories.message}
            </p>
          )}
        </div>
      </div>

      {/* Dietary Information */}
      <div>
        <Label className="mb-3 block">Dietary Information</Label>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Controller
              name="isVegetarian"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isVegetarian"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              )}
            />
            <Label
              htmlFor="isVegetarian"
              className="cursor-pointer font-normal"
            >
              Vegetarian
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="isVegan"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isVegan"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              )}
            />
            <Label htmlFor="isVegan" className="cursor-pointer font-normal">
              Vegan
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="isGlutenFree"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isGlutenFree"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              )}
            />
            <Label
              htmlFor="isGlutenFree"
              className="cursor-pointer font-normal"
            >
              Gluten-Free
            </Label>
          </div>
        </div>
      </div>

      {/* Allergens */}
      <div>
        <Label className="mb-3 block">Allergens</Label>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {COMMON_ALLERGENS.map((allergen) => (
            <div key={allergen} className="flex items-center space-x-2">
              <Checkbox
                id={`allergen-${allergen}`}
                checked={selectedAllergens.includes(allergen)}
                onCheckedChange={() => handleAllergenToggle(allergen)}
                disabled={isLoading}
              />
              <Label
                htmlFor={`allergen-${allergen}`}
                className="cursor-pointer font-normal"
              >
                {allergen}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
        <div>
          <Label htmlFor="isAvailable" className="cursor-pointer font-medium">
            Available for ordering
          </Label>
          <p className="text-sm text-muted-foreground">
            Item will appear on customer menu
          </p>
        </div>
        <Controller
          name="isAvailable"
          control={control}
          render={({ field }) => (
            <Switch
              id="isAvailable"
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={isLoading}
            />
          )}
        />
      </div>

      {/* Inventory Tracking */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="trackInventory" className="cursor-pointer font-medium">
              Track Inventory
            </Label>
            <p className="text-sm text-muted-foreground">
              Monitor stock levels for this item
            </p>
          </div>
          <Controller
            name="trackInventory"
            control={control}
            render={({ field }) => (
              <Switch
                id="trackInventory"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isLoading}
              />
            )}
          />
        </div>

        {trackInventory && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="stockQuantity">
                Current Stock <span className="text-destructive">*</span>
              </Label>
              <Input
                id="stockQuantity"
                type="number"
                {...register('stockQuantity', { valueAsNumber: true })}
                placeholder="0"
                disabled={isLoading}
                className="mt-2"
              />
              {errors.stockQuantity && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.stockQuantity.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="minStockLevel">
                Minimum Stock Level <span className="text-destructive">*</span>
              </Label>
              <Input
                id="minStockLevel"
                type="number"
                {...register('minStockLevel', { valueAsNumber: true })}
                placeholder="0"
                disabled={isLoading}
                className="mt-2"
              />
              {errors.minStockLevel && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.minStockLevel.message}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Customization Options */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <button
          type="button"
          onClick={() => setCustomizationExpanded(!customizationExpanded)}
          className="flex w-full items-center justify-between text-left"
          disabled={isLoading}
        >
          <div>
            <Label className="cursor-pointer font-medium">
              Customization Options
            </Label>
            <p className="text-sm text-muted-foreground">
              Add size options, toppings, and more
            </p>
          </div>
          {customizationExpanded ? (
            <ChevronUp className="h-5 w-5 text-neutral-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-neutral-400" />
          )}
        </button>

        {customizationExpanded && (
          <div className="space-y-4 pt-4">
            {fields.map((field, groupIndex) => (
              <CustomizationGroupFields
                key={field.id}
                groupIndex={groupIndex}
                control={control}
                register={register}
                remove={remove}
                errors={errors}
                isLoading={isLoading}
              />
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addCustomizationGroup}
              disabled={isLoading}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Option Group
            </Button>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : isEditing ? 'Update Item' : 'Create Item'}
        </Button>
      </div>
    </form>
  );
}

// Customization Group Fields Component
interface CustomizationGroupFieldsProps {
  groupIndex: number;
  control: any;
  register: any;
  remove: (index: number) => void;
  errors: any;
  isLoading: boolean;
}

function CustomizationGroupFields({
  groupIndex,
  control,
  register,
  remove,
  errors,
  isLoading,
}: CustomizationGroupFieldsProps) {
  const { fields, append, remove: removeOption } = useFieldArray({
    control,
    name: `customizationGroups.${groupIndex}.options`,
  });

  const addOption = () => {
    append({ name: '', priceModifier: 0, isAvailable: true });
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/50 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-4">
          {/* Group Name and Type */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Group Name</Label>
              <Input
                {...register(`customizationGroups.${groupIndex}.name`)}
                placeholder="e.g., Size"
                disabled={isLoading}
                className="mt-2"
              />
              {errors.customizationGroups?.[groupIndex]?.name && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.customizationGroups[groupIndex].name.message}
                </p>
              )}
            </div>

            <div>
              <Label>Type</Label>
              <Controller
                name={`customizationGroups.${groupIndex}.type`}
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RADIO">Single Choice</SelectItem>
                      <SelectItem value="CHECKBOX">Multiple Choice</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Required and Max Selections */}
          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Controller
                name={`customizationGroups.${groupIndex}.isRequired`}
                control={control}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                )}
              />
              <Label className="font-normal">Required</Label>
            </div>

            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">Max selections:</Label>
              <Input
                type="number"
                {...register(`customizationGroups.${groupIndex}.maxSelections`, {
                  valueAsNumber: true,
                })}
                className="w-20"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Options</Label>
            {fields.map((option, optionIndex) => (
              <div key={option.id} className="flex items-start gap-2">
                <Input
                  {...register(
                    `customizationGroups.${groupIndex}.options.${optionIndex}.name`
                  )}
                  placeholder="Option name"
                  disabled={isLoading}
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  {...register(
                    `customizationGroups.${groupIndex}.options.${optionIndex}.priceModifier`,
                    { valueAsNumber: true }
                  )}
                  placeholder="+0.00"
                  disabled={isLoading}
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(optionIndex)}
                  disabled={isLoading || fields.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
              disabled={isLoading}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Option
            </Button>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => remove(groupIndex)}
          disabled={isLoading}
          className="ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}