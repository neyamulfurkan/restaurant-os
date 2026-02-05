// src/components/customer/TimeSlotSelector.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TimeSlot } from '@/types';

interface TimeSlotSelectorProps {
  availableSlots: TimeSlot[];
  selectedSlot?: string;
  onSelect: (time: string) => void;
  className?: string;
}

export function TimeSlotSelector({
  availableSlots,
  selectedSlot,
  onSelect,
  className,
}: TimeSlotSelectorProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto p-1">
        {availableSlots.map((slot) => {
          const isSelected = selectedSlot === slot.time;
          const isAvailable = slot.available;

          return (
            <Button
              key={slot.time}
              variant={isSelected ? 'default' : 'outline'}
              className={cn(
                'relative h-12 transition-all duration-200',
                isAvailable
                  ? 'hover:scale-105 hover:shadow-md active:scale-95'
                  : 'opacity-50 cursor-not-allowed hover:scale-100',
                !isAvailable && 'line-through decoration-2',
                isSelected && 'ring-2 ring-primary ring-offset-2'
              )}
              onClick={() => isAvailable && onSelect(slot.time)}
              disabled={!isAvailable}
            >
              <span className="font-medium">{slot.time}</span>
              {slot.remainingCapacity !== undefined &&
                slot.remainingCapacity > 0 &&
                slot.remainingCapacity <= 3 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-warning-500 text-xs text-white">
                    {slot.remainingCapacity}
                  </span>
                )}
            </Button>
          );
        })}
      </div>

      {availableSlots.length === 0 && (
        <div className="flex items-center justify-center py-12 text-center">
          <p className="text-neutral-500">
            No time slots available for the selected date. Please choose another
            date.
          </p>
        </div>
      )}

      {availableSlots.length > 0 && (
        <div className="mt-4 flex items-center gap-4 text-sm text-neutral-600">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-neutral-300 bg-white" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-neutral-300 bg-neutral-100 line-through decoration-2" />
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-primary" />
            <span>Selected</span>
          </div>
        </div>
      )}
    </div>
  );
}