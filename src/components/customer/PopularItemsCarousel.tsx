// src/components/customer/PopularItemsCarousel.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MenuItemCard from './MenuItemCard';
import { MenuItemWithRelations } from '@/types';
import { Button } from '@/components/ui/button';

interface PopularItemsCarouselProps {
  onAddToCart: (item: MenuItemWithRelations) => void;
  onItemClick: (item: MenuItemWithRelations) => void;
}

export default function PopularItemsCarousel({
  onAddToCart,
  onItemClick,
}: PopularItemsCarouselProps) {
  const [popularItems, setPopularItems] = useState<MenuItemWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch popular items on mount
  useEffect(() => {
    const fetchPopularItems = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/menu?popular=true&limit=8');
        if (!response.ok) throw new Error('Failed to fetch popular items');
        
        const data = await response.json();
        setPopularItems(data.data || []);
      } catch (error) {
        console.error('Error fetching popular items:', error);
        setPopularItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopularItems();
  }, []);

  // Auto-scroll functionality
  useEffect(() => {
    const startAutoScroll = () => {
      autoScrollIntervalRef.current = setInterval(() => {
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const scrollWidth = container.scrollWidth;
          const clientWidth = container.clientWidth;
          const maxScroll = scrollWidth - clientWidth;
          
          // Scroll to next position (one card width)
          const cardWidth = container.querySelector('.carousel-item')?.clientWidth || 300;
          const currentScroll = container.scrollLeft;
          const nextScroll = currentScroll + cardWidth + 16; // +16 for gap

          if (nextScroll >= maxScroll) {
            // Reset to start when reaching the end
            container.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            container.scrollTo({ left: nextScroll, behavior: 'smooth' });
          }
        }
      }, 5000); // 5 seconds
    };

    if (popularItems.length > 0) {
      startAutoScroll();
    }

    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [popularItems.length]);

  // Pause auto-scroll on hover
  const handleMouseEnter = () => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
    }
  };

  const handleMouseLeave = () => {
    // Restart auto-scroll when mouse leaves
    if (popularItems.length > 0) {
      autoScrollIntervalRef.current = setInterval(() => {
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const scrollWidth = container.scrollWidth;
          const clientWidth = container.clientWidth;
          const maxScroll = scrollWidth - clientWidth;
          
          const cardWidth = container.querySelector('.carousel-item')?.clientWidth || 300;
          const currentScroll = container.scrollLeft;
          const nextScroll = currentScroll + cardWidth + 16;

          if (nextScroll >= maxScroll) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            container.scrollTo({ left: nextScroll, behavior: 'smooth' });
          }
        }
      }, 5000);
    }
  };

  // Scroll navigation
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.querySelector('.carousel-item')?.clientWidth || 300;
      container.scrollBy({ left: -(cardWidth + 16), behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.querySelector('.carousel-item')?.clientWidth || 300;
      container.scrollBy({ left: cardWidth + 16, behavior: 'smooth' });
    }
  };

  // Don't render if no items or loading failed
  if (!isLoading && popularItems.length === 0) {
    return null;
  }

  return (
    <section className="py-12" style={{ backgroundColor: 'hsl(var(--page-bg))' }}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Title */}
        <h2 className="text-5xl font-bold text-center mb-8" style={{ color: 'hsl(var(--foreground))' }}>
          Customer Favorites
        </h2>

        {/* Carousel Container */}
        <div className="relative">
          {/* Left Arrow */}
          <Button
            onClick={scrollLeft}
            variant="outline"
            size="icon"
            className="
              absolute
              left-0
              top-1/2
              -translate-y-1/2
              z-10
              bg-white
              shadow-lg
              hover:bg-neutral-100
              rounded-full
              w-12
              h-12
              hidden
              md:flex
              items-center
              justify-center
            "
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          {/* Scrollable Items Container */}
          <div
            ref={scrollContainerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="
              flex
              overflow-x-auto
              gap-4
              scroll-smooth
              scrollbar-hide
              px-12
              md:px-16
            "
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="carousel-item flex-shrink-0 w-[280px] sm:w-[320px]"
                >
                  <div className="animate-pulse">
                    <div className="aspect-[4/3] bg-neutral-200 rounded-t-2xl" />
                    <div className="p-4 bg-white rounded-b-2xl">
                      <div className="h-6 bg-neutral-200 rounded mb-2" />
                      <div className="h-4 bg-neutral-200 rounded w-3/4 mb-3" />
                      <div className="h-4 bg-neutral-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              popularItems.map((item) => (
                <div
                  key={item.id}
                  className="carousel-item flex-shrink-0 w-[280px] sm:w-[320px]"
                >
                  <MenuItemCard
                    item={item}
                    onAddToCart={onAddToCart}
                    onItemClick={onItemClick}
                  />
                </div>
              ))
            )}
          </div>

          {/* Right Arrow */}
          <Button
            onClick={scrollRight}
            variant="outline"
            size="icon"
            className="
              absolute
              right-0
              top-1/2
              -translate-y-1/2
              z-10
              bg-white
              shadow-lg
              hover:bg-neutral-100
              rounded-full
              w-12
              h-12
              hidden
              md:flex
              items-center
              justify-center
            "
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* CSS to hide scrollbar */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}