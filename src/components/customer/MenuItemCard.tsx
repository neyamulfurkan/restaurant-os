// src/components/customer/MenuItemCard.tsx

import React from 'react';
import Image from 'next/image';
import { Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MenuItemWithRelations } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface MenuItemCardProps {
  item: MenuItemWithRelations;
  onAddToCart: (item: MenuItemWithRelations) => void;
  onItemClick: (item: MenuItemWithRelations) => void;
}

export default function MenuItemCard({
  item,
  onAddToCart,
  onItemClick,
}: MenuItemCardProps) {
  const hasCustomizations = item.customizationGroups && item.customizationGroups.length > 0;
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.isAvailable) {
      onAddToCart(item);
    }
  };

  const handleCardClick = () => {
    onItemClick(item);
  };

  return (
    <Card
      className="
        h-full
        flex
        flex-col
        overflow-hidden
        cursor-pointer
        transition-all
        duration-300
        hover:-translate-y-2
        hover:shadow-xl
        border
        border-neutral-100
      "
      style={{ backgroundColor: 'hsl(var(--card))' }}
      onClick={handleCardClick}
    >
      {/* Image Container - Fixed aspect ratio */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100 shrink-0">
        <Image
          src={item.imageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="18"%3ENo image%3C/text%3E%3C/svg%3E'}
          alt={item.name}
          fill
          className="object-cover"
          loading="lazy"
          sizes="(max-width: 640px) 240px, (max-width: 768px) 280px, (max-width: 1024px) 300px, 320px"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            if (!target.src.startsWith('data:')) {
              target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="18"%3EImage unavailable%3C/text%3E%3C/svg%3E';
            }
          }}
        />

        {/* Vegetarian/Vegan Badge - Top Right Overlay */}
        {(item.isVegetarian || item.isVegan) && (
          <div className="absolute top-2 right-2">
            <Badge
              variant="success"
              className="bg-green-500 text-white shadow-md text-xs"
            >
              {item.isVegan ? 'Vegan' : 'Vegetarian'}
            </Badge>
          </div>
        )}

        {/* Out of Stock Overlay */}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white text-lg font-semibold">
              Out of Stock
            </span>
          </div>
        )}

        {/* Customization Icon - Bottom Right */}
        {hasCustomizations && item.isAvailable && (
          <div className="absolute bottom-2 right-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md">
              <Settings className="w-4 h-4 text-neutral-600" />
            </div>
          </div>
        )}
      </div>

      {/* Content - Flex grow to fill remaining space */}
      <div className="flex flex-col flex-1 p-4">
        {/* Item Name - Fixed height */}
        <h3 className="text-lg sm:text-xl font-bold mb-1 line-clamp-1 min-h-[1.75rem]" style={{ color: 'hsl(var(--foreground))' }}>
          {item.name}
        </h3>

        {/* Description - Fixed 2 lines */}
        <div className="mb-3 min-h-[2.5rem]">
          {item.description && (
            <p className="text-sm line-clamp-2" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
              {item.description}
            </p>
          )}
        </div>

        {/* Additional Dietary Info Badges - Fixed height area */}
        <div className="mb-3 min-h-[1.5rem]">
          {item.isGlutenFree && (
            <Badge variant="outline" className="text-xs">
              Gluten-Free
            </Badge>
          )}
        </div>

        {/* Price and Button - Push to bottom */}
        <div className="flex items-center justify-between gap-2 mt-auto">
          <span className="text-lg sm:text-xl font-bold shrink-0" style={{ color: 'hsl(var(--primary))' }}>
            {formatCurrency(item.price)}
          </span>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={!item.isAvailable}
            className="
              transition-transform
              duration-200
              active:scale-95
              text-sm
              shrink-0
            "
            size="sm"
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </Card>
  );
}