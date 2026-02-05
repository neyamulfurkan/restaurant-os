// src/components/customer/RecommendedItems.tsx

import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import MenuItemCard from './MenuItemCard';
import { Button } from '@/components/ui/button';
import { MenuItemWithRelations } from '@/types';
import { useCartStore } from '@/store/cartStore';

interface RecommendedItemsProps {
  restaurantId: string;
  customerId?: string;
  onItemClick: (item: MenuItemWithRelations) => void;
}

export default function RecommendedItems({
  restaurantId,
  customerId,
  onItemClick,
}: RecommendedItemsProps) {
  const [recommendations, setRecommendations] = useState<MenuItemWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { addItem } = useCartStore();
  const { branding } = useSettingsStore();

  // Fetch recommendations on mount
  useEffect(() => {
    console.log('🔵 RecommendedItems: Starting fetch');
    console.log('🔵 Restaurant ID:', restaurantId);
    console.log('🔵 Customer ID:', customerId);
    fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, customerId]);

  // Auto-scroll every 5 seconds
  useEffect(() => {
    if (recommendations.length > 0) {
      startAutoScroll();
    }

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations.length, currentIndex]);

  const fetchRecommendations = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        restaurantId,
        ...(customerId && { customerId }),
      });

      console.log('🔵 Fetching recommendations with params:', params.toString());
      const response = await fetch(`/api/ai/recommendations?${params}`);
      
      console.log('🔵 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      console.log('🔵 Response data:', data);
      console.log('🔵 Data.success:', data.success);
      console.log('🔵 Data.data:', data.data);
      console.log('🔵 Data.data length:', data.data?.length);
      
      if (data.success && data.data) {
        console.log('🔵 Setting recommendations:', data.data.length, 'items');
        setRecommendations(data.data);
      } else {
        console.log('🔴 No data.success or data.data');
        setRecommendations([]);
      }
    } catch (error) {
      console.error('🔴 Error fetching recommendations:', error);
      // Fail silently - recommendations are optional
      setRecommendations([]);
    } finally {
      setIsLoading(false);
      console.log('🔵 Fetch complete, loading:', false);
    }
  };

  const startAutoScroll = () => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }

    autoScrollTimerRef.current = setInterval(() => {
      handleNext();
    }, 5000);
  };

  const resetAutoScroll = () => {
    startAutoScroll();
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => {
      const newIndex = prev === 0 ? recommendations.length - 1 : prev - 1;
      scrollToIndex(newIndex);
      return newIndex;
    });
    resetAutoScroll();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => {
      const newIndex = prev === recommendations.length - 1 ? 0 : prev + 1;
      scrollToIndex(newIndex);
      return newIndex;
    });
    resetAutoScroll();
  };

  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.offsetWidth / getVisibleCards();
      const scrollPosition = index * cardWidth;
      
      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth',
      });
    }
  };

  const getVisibleCards = () => {
    if (typeof window === 'undefined') return 3;
    
    if (window.innerWidth < 768) return 1; // Mobile
    if (window.innerWidth < 1024) return 2; // Tablet
    return 3; // Desktop (3-4 items, we'll use 3)
  };

  const handleAddToCart = (item: MenuItemWithRelations) => {
    // If item has customizations, open modal instead
    if (item.customizationGroups && item.customizationGroups.length > 0) {
      onItemClick(item);
      return;
    }

    // Add to cart directly
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
    });
  };

   // Don't render if no recommendations or loading failed
  if (!isLoading && recommendations.length === 0) {
    console.log('🔴 Component returning null - no recommendations');
    return null;
  }

  console.log('🟢 Component rendering with', recommendations.length, 'recommendations');

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="py-6 bg-neutral-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 
            className="text-2xl md:text-3xl font-bold text-center mb-6"
            style={{ color: branding.primaryColor }}
          >
            Recommended for You
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-white rounded-2xl overflow-hidden shadow-md"
              >
                <div className="aspect-[4/3] bg-neutral-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-neutral-200 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 rounded w-full" />
                  <div className="h-4 bg-neutral-200 rounded w-2/3" />
                  <div className="h-10 bg-neutral-200 rounded w-1/3 mt-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6" style={{ backgroundColor: 'hsl(var(--page-bg))' }}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Title */}
        <h2 
          className="text-2xl md:text-3xl font-bold text-center mb-6"
          style={{ color: branding.primaryColor }}
        >
          Recommended for You
        </h2>

        {/* Carousel Container */}
        <div className="relative">
          {/* Navigation Arrows */}
          {recommendations.length > getVisibleCards() && (
            <>
              {/* Previous Button */}
              <Button
                onClick={handlePrevious}
                variant="ghost"
                size="icon"
                className="
                  absolute
                  left-0
                  top-1/2
                  -translate-y-1/2
                  -translate-x-4
                  z-10
                  shadow-lg
                  rounded-full
                  w-12
                  h-12
                  hidden
                  md:flex
                  items-center
                  justify-center
                "
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: branding.primaryColor,
                }}
                aria-label="Previous recommendations"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = branding.primaryColor;
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                  e.currentTarget.style.color = branding.primaryColor;
                }}
              >
                <ChevronLeft className="w-6 h-6" style={{ strokeWidth: 2.5 }} />
              </Button>

              {/* Next Button */}
              <Button
                onClick={handleNext}
                variant="ghost"
                size="icon"
                className="
                  absolute
                  right-0
                  top-1/2
                  -translate-y-1/2
                  translate-x-4
                  z-10
                  shadow-lg
                  rounded-full
                  w-12
                  h-12
                  hidden
                  md:flex
                  items-center
                  justify-center
                "
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: branding.primaryColor,
                }}
                aria-label="Next recommendations"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = branding.primaryColor;
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                  e.currentTarget.style.color = branding.primaryColor;
                }}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="
              overflow-x-auto
              scrollbar-hide
              -mx-2
              px-2
            "
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <div className="flex gap-4 pb-2">
              {recommendations.map((item) => (
                <div
                  key={item.id}
                  className="
                    flex-none
                    w-[calc(50%-8px)]
                    md:w-[calc(33.333%-11px)]
                    lg:w-[calc(25%-12px)]
                  "
                >
                  <MenuItemCard
                    item={item}
                    onAddToCart={handleAddToCart}
                    onItemClick={onItemClick}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Dots Indicator (Mobile) */}
          {recommendations.length > 1 && (
            <div className="flex justify-center gap-2 mt-4 md:hidden">
              {recommendations.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    scrollToIndex(index);
                    resetAutoScroll();
                  }}
                  className={`
                    w-2
                    h-2
                    rounded-full
                    transition-all
                    duration-200
                    ${
                      index === currentIndex
                        ? 'bg-primary-500 w-6'
                        : 'bg-neutral-300'
                    }
                  `}
                  aria-label={`Go to recommendation ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hide scrollbar globally for this component */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}