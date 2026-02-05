// src/components/customer/OrderStatusStepper.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { ORDER_STATUS } from '@/lib/constants';
import { OrderStatus } from '@/types';
import { cn } from '@/lib/utils';

interface OrderStatusStepperProps {
  currentStatus: OrderStatus;
  orderType: 'DINE_IN' | 'PICKUP' | 'DELIVERY';
}

interface Step {
  status: OrderStatus;
  label: string;
  showForTypes: Array<'DINE_IN' | 'PICKUP' | 'DELIVERY'>;
}

const ALL_STEPS: Step[] = [
  {
    status: ORDER_STATUS.PENDING,
    label: 'Order Received',
    showForTypes: ['DINE_IN', 'PICKUP', 'DELIVERY'],
  },
  {
    status: ORDER_STATUS.PREPARING,
    label: 'Preparing',
    showForTypes: ['DINE_IN', 'PICKUP', 'DELIVERY'],
  },
  {
    status: ORDER_STATUS.READY,
    label: 'Ready',
    showForTypes: ['DINE_IN', 'PICKUP', 'DELIVERY'],
  },
  {
    status: ORDER_STATUS.OUT_FOR_DELIVERY,
    label: 'Out for Delivery',
    showForTypes: ['DELIVERY'],
  },
  {
    status: ORDER_STATUS.DELIVERED,
    label: 'Delivered',
    showForTypes: ['DELIVERY'],
  },
  {
    status: ORDER_STATUS.DELIVERED,
    label: 'Picked Up',
    showForTypes: ['PICKUP'],
  },
  {
    status: ORDER_STATUS.DELIVERED,
    label: 'Served',
    showForTypes: ['DINE_IN'],
  },
];

const STATUS_ORDER: OrderStatus[] = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED,
];

export default function OrderStatusStepper({
  currentStatus,
  orderType,
}: OrderStatusStepperProps) {
  // Filter steps based on order type
  const steps = ALL_STEPS.filter((step) =>
    step.showForTypes.includes(orderType)
  );

  // Get current step index
  const currentStatusIndex = STATUS_ORDER.indexOf(currentStatus as OrderStatus);

  // Determine if step is completed or active
  const getStepState = (stepStatus: OrderStatus) => {
    const stepIndex = STATUS_ORDER.indexOf(stepStatus as OrderStatus);
    
    if (currentStatus === ORDER_STATUS.CANCELLED || currentStatus === ORDER_STATUS.REJECTED) {
      return 'inactive';
    }
    
    if (stepIndex < currentStatusIndex) {
      return 'completed';
    }
    
    if (stepIndex === currentStatusIndex) {
      return 'active';
    }
    
    return 'pending';
  };

  return (
    <div className="w-full">
      {/* Desktop: Horizontal Stepper */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-neutral-200">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
              initial={{ width: '0%' }}
              animate={{
                width: `${(currentStatusIndex / (steps.length - 1)) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>

          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const state = getStepState(step.status);
              const isCompleted = state === 'completed';
              const isActive = state === 'active';
              const isPending = state === 'pending';

              return (
                <div key={step.status} className="flex flex-col items-center">
                  {/* Circle */}
                  <motion.div
                    className={cn(
                      'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-300',
                      {
                        'border-accent-500 bg-accent-500': isActive,
                        'border-primary-500 bg-primary-500': isCompleted,
                        'border-neutral-300 bg-white': isPending,
                      }
                    )}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.2, duration: 0.2 }}
                      >
                        <Check className="h-5 w-5 text-white" />
                      </motion.div>
                    ) : (
                      <div
                        className={cn('h-3 w-3 rounded-full', {
                          'bg-white': isActive,
                          'bg-neutral-400': isPending,
                        })}
                      />
                    )}
                  </motion.div>

                  {/* Label */}
                  <motion.p
                    className={cn(
                      'mt-2 text-center text-sm font-medium transition-colors duration-300',
                      {
                        'text-accent-600': isActive,
                        'text-primary-600': isCompleted,
                        'text-neutral-500': isPending,
                      }
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.1, duration: 0.3 }}
                  >
                    {step.label}
                  </motion.p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile: Vertical Stepper */}
      <div className="md:hidden">
        <div className="space-y-4">
          {steps.map((step, index) => {
            const state = getStepState(step.status);
            const isCompleted = state === 'completed';
            const isActive = state === 'active';
            const isPending = state === 'pending';
            const isLast = index === steps.length - 1;

            return (
              <div key={step.status} className="relative">
                <div className="flex items-start">
                  {/* Circle */}
                  <motion.div
                    className={cn(
                      'relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300',
                      {
                        'border-accent-500 bg-accent-500': isActive,
                        'border-primary-500 bg-primary-500': isCompleted,
                        'border-neutral-300 bg-white': isPending,
                      }
                    )}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: index * 0.1 + 0.2,
                          duration: 0.2,
                        }}
                      >
                        <Check className="h-5 w-5 text-white" />
                      </motion.div>
                    ) : (
                      <div
                        className={cn('h-3 w-3 rounded-full', {
                          'bg-white': isActive,
                          'bg-neutral-400': isPending,
                        })}
                      />
                    )}
                  </motion.div>

                  {/* Label */}
                  <motion.p
                    className={cn(
                      'ml-4 mt-2 text-base font-medium transition-colors duration-300',
                      {
                        'text-accent-600': isActive,
                        'text-primary-600': isCompleted,
                        'text-neutral-500': isPending,
                      }
                    )}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.1, duration: 0.3 }}
                  >
                    {step.label}
                  </motion.p>
                </div>

                {/* Vertical Line */}
                {!isLast && (
                  <div className="absolute left-5 top-10 h-full w-0.5 -translate-x-1/2 bg-neutral-200">
                    {(isCompleted || isActive) && (
                      <motion.div
                        className="h-full w-full bg-gradient-to-b from-primary-500 to-accent-500"
                        initial={{ height: '0%' }}
                        animate={{ height: isCompleted ? '100%' : '50%' }}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}