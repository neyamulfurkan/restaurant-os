// src/components/customer/MenuItemModal.tsx

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Minus, Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/hooks/useCart';
import type { MenuItemWithRelations } from '@/types';
import { cn } from '@/lib/utils';


interface MenuItemModalProps {
  item: MenuItemWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
}

interface UpsellSuggestion {
  menuItem: MenuItemWithRelations;
  reason: string;
  confidence: number;
}

export function MenuItemModal({ item, isOpen, onClose }: MenuItemModalProps) {
  const { addItem } = useCart();
  
  // State for quantity and customizations
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Reset state when modal opens with new item
  useEffect(() => {
    if (isOpen && item) {
      setQuantity(1);
      setSelectedOptions({});
      setSpecialInstructions('');
    }
  }, [isOpen, item]);

  if (!item) return null;

  // Calculate total price based on item price + customization modifiers
  const calculateTotal = (): number => {
    let total = item.price;

    // Add customization prices
    item.customizationGroups?.forEach((group) => {
      const selected = selectedOptions[group.id] || [];
      selected.forEach((optionId) => {
        const option = group.options.find((opt) => opt.id === optionId);
        if (option) {
          total += option.priceModifier;
        }
      });
    });

    return total * quantity;
  };

  // Handle customization option selection
  const handleOptionChange = (groupId: string, optionId: string, type: string) => {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];

      if (type === 'RADIO') {
        // Radio: only one selection
        return { ...prev, [groupId]: [optionId] };
      } else {
        // Checkbox: multiple selections
        if (current.includes(optionId)) {
          // Remove if already selected
          return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
        } else {
          // Add if not selected
          return { ...prev, [groupId]: [...current, optionId] };
        }
      }
    });
  };

  // Handle quantity change
  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  // Handle add to cart
  const handleAddToCart = () => {
    // Build customizations array for cart
    const customizations: { groupName: string; optionName: string; price: number }[] = [];

    item.customizationGroups?.forEach((group) => {
      const selected = selectedOptions[group.id] || [];
      selected.forEach((optionId) => {
        const option = group.options.find((opt) => opt.id === optionId);
        if (option) {
          customizations.push({
            groupName: group.name,
            optionName: option.name,
            price: option.priceModifier,
          });
        }
      });
    });

    // Add to cart
    addItem(
      {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
      },
      quantity,
      customizations.length > 0 ? customizations : undefined,
      specialInstructions || undefined
    );

    // Close modal
    onClose();
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-2xl w-[calc(100vw-2rem)] sm:w-full z-50">
        {/* Header with manual close button for mobile */}
        <div className="absolute top-3 right-3 z-50">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-neutral-700" />
          </Button>
        </div>
        
        {/* Large image - 50% of modal height */}
        <div className="relative h-[45vh] min-h-[300px] bg-neutral-100">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400">
              No image available
            </div>
          )}
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Item details */}
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{item.name}</DialogTitle>
            {item.description && (
              <DialogDescription className="text-base text-neutral-600 mt-2">
                {item.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Price */}
          <div className="text-xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
            {formatCurrency(item.price)}
          </div>

          {/* Dietary info and allergens */}
          {(item.isVegetarian || item.isVegan || item.isGlutenFree || (item.allergens && item.allergens.length > 0)) && (
            <div className="space-y-2">
              {/* Dietary badges */}
              {(item.isVegetarian || item.isVegan || item.isGlutenFree) && (
                <div className="flex flex-wrap gap-2">
                  {item.isVegetarian && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))' }}>
                      Vegetarian
                    </span>
                  )}
                  {item.isVegan && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))' }}>
                      Vegan
                    </span>
                  )}
                  {item.isGlutenFree && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))' }}>
                      Gluten-Free
                    </span>
                  )}
                </div>
              )}

              {/* Allergens */}
              {item.allergens && item.allergens.length > 0 && (
                <div className="text-sm">
                  <span className="font-semibold text-neutral-700">Allergens:</span>{' '}
                  <span className="text-neutral-600">{item.allergens.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {/* Customization options */}
          {item.customizationGroups && item.customizationGroups.length > 0 && (
            <div className="space-y-4">
              {item.customizationGroups.map((group) => (
                <div key={group.id} className="space-y-3">
                  <div className="font-semibold text-neutral-900">
                    {group.name}
                    {group.isRequired && <span className="text-red-500 ml-1">*</span>}
                  </div>

                  <div className="space-y-2">
                    {group.options.map((option) => {
                      const isSelected = (selectedOptions[group.id] || []).includes(option.id);
                      const inputType = group.type === 'RADIO' ? 'radio' : 'checkbox';

                      return (
                        <label
                          key={option.id}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors',
                            isSelected
                              ? 'bg-opacity-10'
                              : 'border-neutral-200 hover:border-neutral-300'
                          )}
                          style={
                            isSelected
                              ? {
                                  borderColor: 'hsl(var(--primary))',
                                  backgroundColor: 'hsla(var(--primary), 0.1)',
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type={inputType}
                              name={group.id}
                              checked={isSelected}
                              onChange={() => handleOptionChange(group.id, option.id, group.type)}
                              className="w-4 h-4 focus:ring-2"
                              style={{
                                accentColor: 'hsl(var(--primary))',
                              }}
                            />
                            <span className="font-medium text-neutral-900">{option.name}</span>
                          </div>
                          {option.priceModifier !== 0 && (
                            <span className="text-sm text-neutral-600">
                              {option.priceModifier > 0 ? '+' : ''}
                              {formatCurrency(option.priceModifier)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Special instructions */}
          <div className="space-y-2">
            <label className="font-semibold text-neutral-900">
              Special Instructions (Optional)
            </label>
            <Textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests?"
              className="min-h-[80px]"
            />
          </div>

          {/* Quantity selector */}
          <div className="space-y-2">
            <label className="font-semibold text-neutral-900">Quantity</label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="h-10 w-10"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(1)}
                className="h-10 w-10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sticky bottom: Total and Add to Cart button */}
        <div className="border-t border-neutral-200 p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold text-neutral-900">Total</span>
            <span className="text-2xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
              {formatCurrency(calculateTotal())}
            </span>
          </div>
          <Button
            onClick={handleAddToCart}
            className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)',
              color: '#ffffff',
            }}
          >
            Add to Cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}