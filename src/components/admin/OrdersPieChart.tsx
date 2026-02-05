// src/components/admin/OrdersPieChart.tsx

'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card } from '@/components/ui/card';
import { OrderType } from '@/types';

interface OrderTypeData {
  type: OrderType;
  count: number;
}

interface OrdersPieChartProps {
  data: OrderTypeData[];
}

export default function OrdersPieChart({ data }: OrdersPieChartProps) {
  // Calculate total and percentages
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  const chartData = data.map(item => ({
    name: formatOrderType(item.type),
    value: item.count,
    percentage: total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0',
  }));

  // Theme colors for each order type
  const COLORS: Record<OrderType, string> = {
    DINE_IN: 'hsl(var(--primary))',
    PICKUP: 'hsl(var(--success))',
    DELIVERY: 'hsl(var(--warning))',
  };

  // Custom label renderer showing percentage
  const renderLabel = (entry: any) => {
    return `${entry.percentage}%`;
  };

  // Custom legend formatter
  const renderLegend = (props: any) => {
    const { payload } = props;
    
    return (
      <ul className="flex flex-col gap-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <li key={`legend-${index}`} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-neutral-700">{entry.value}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-neutral-500">
                {chartData[index].value} orders
              </span>
              <span className="font-semibold text-neutral-900 min-w-[3rem] text-right">
                {chartData[index].percentage}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-neutral-200">
          <p className="font-semibold text-neutral-900">{data.name}</p>
          <p className="text-sm text-neutral-600">
            {data.value} orders ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Check if data is empty or all zeros
  if (data.length === 0 || data.every(item => item.count === 0)) {
    return (
      <Card className="rounded-2xl shadow-md p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
          Orders by Type
        </h3>
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4"
              style={{ color: 'hsl(var(--muted-foreground))' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>No order data available</p>
            <p className="text-xs mt-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Start taking orders to see order type distribution</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
        Orders by Type
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={90}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {chartData.map((_entry, index) => {
              const orderType = data[index].type;
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[orderType]} 
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              );
            })}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

// Helper function to format order type for display
function formatOrderType(type: OrderType): string {
  const typeMap: Record<OrderType, string> = {
    DINE_IN: 'Dine-In',
    PICKUP: 'Pickup',
    DELIVERY: 'Delivery',
  };
  return typeMap[type] || type;
}