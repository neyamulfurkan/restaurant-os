// src/components/admin/KPICard.tsx

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  change: number; // Percentage change (positive or negative)
  trendData: number[]; // Array of 7 values for sparkline
  isCurrency?: boolean;
  className?: string;
}

export default function KPICard({
  title,
  value,
  change,
  trendData,
  isCurrency = false,
  className,
}: KPICardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const isPositiveChange = change >= 0;

  // Animated count-up effect on mount
  useEffect(() => {
    const duration = 1000; // 1 second
    const steps = 60;
    const increment = value / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(increment * currentStep));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  // Generate SVG sparkline path
  const generateSparklinePath = () => {
    if (trendData.length === 0) return '';

    const width = 80;
    const height = 24;
    const max = Math.max(...trendData);
    const min = Math.min(...trendData);
    const range = max - min || 1; // Prevent division by zero

    const points = trendData.map((value, index) => {
      const x = (index / (trendData.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  return (
    <Card className="rounded-2xl shadow-md" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
      <div className="p-6">
        {/* Title */}
        <h3 className="text-sm font-medium mb-4 text-muted-foreground">{title}</h3>

        {/* Value and Change */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-4xl font-bold mb-1 text-foreground">
              {isCurrency ? formatCurrency(displayValue) : displayValue.toLocaleString()}
            </p>
            
            {/* Percentage Change */}
            <div className="flex items-center gap-1">
              {isPositiveChange ? (
                <svg
                  className="w-4 h-4"
                  style={{ color: 'hsl(var(--success))' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  style={{ color: 'hsl(var(--destructive))' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              )}
              <span
                className="text-sm font-medium"
                style={{ color: isPositiveChange ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}
              >
                {isPositiveChange ? '+' : ''}
                {change.toFixed(1)}%
              </span>
              <span className="text-xs ml-1 text-muted-foreground">vs yesterday</span>
            </div>
          </div>
        </div>

        {/* Sparkline Chart */}
        <div className="mt-4">
          <svg
            width="80"
            height="24"
            className="w-full h-6"
            preserveAspectRatio="none"
          >
            <path
              d={generateSparklinePath()}
              fill="none"
              stroke={isPositiveChange ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <p className="text-xs mt-1 text-muted-foreground">Last 7 days</p>
        </div>
      </div>
    </Card>
  );
}