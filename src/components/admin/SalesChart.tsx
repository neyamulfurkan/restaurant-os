// src/components/admin/SalesChart.tsx

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

// ============= TYPES =============

export interface SalesChartData {
  date: string;
  sales: number;
}

interface SalesChartProps {
  data: SalesChartData[];
}

type TimeFilter = 'today' | 'week' | 'month' | 'year';

// ============= CUSTOM TOOLTIP =============

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-neutral-900 mb-1">{label}</p>
      <p className="text-sm text-neutral-600">
        Sales: <span className="font-semibold" style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(payload[0].value as number)}</span>
      </p>
    </div>
  );
}

// ============= COMPONENT =============

export default function SalesChart({ data }: SalesChartProps) {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('month');

  // Filter buttons configuration
  const filters: Array<{ value: TimeFilter; label: string }> = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ];

  return (
    <Card className="rounded-2xl shadow-md p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
      {/* Header with title and filters */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Sales Over Time</h3>
        
        {/* Filter buttons */}
        <div className="flex gap-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
              style={activeFilter === filter.value ? {
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              } : {
                backgroundColor: '#f5f5f5',
                color: '#525252'
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#737373', fontSize: 12 }}
            tickLine={{ stroke: '#e5e5e5' }}
            axisLine={{ stroke: '#e5e5e5' }}
          />
          <YAxis
            tick={{ fill: '#737373', fontSize: 12 }}
            tickLine={{ stroke: '#e5e5e5' }}
            axisLine={{ stroke: '#e5e5e5' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Summary stats below chart */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs mb-1" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>Total Sales</p>
            <p className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              {formatCurrency(data.reduce((sum, item) => sum + item.sales, 0))}
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>Average</p>
            <p className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              {formatCurrency(data.length > 0 ? data.reduce((sum, item) => sum + item.sales, 0) / data.length : 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Peak Day</p>
            <p className="text-lg font-semibold text-neutral-900">
              {formatCurrency(Math.max(...data.map((item) => item.sales)))}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}