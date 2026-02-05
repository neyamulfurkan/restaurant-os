// src/components/admin/InventoryTable.tsx

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MenuItem } from '@/types';
import { formatDate } from '@/lib/utils';

interface InventoryItem extends MenuItem {
  category: {
    name: string;
  };
}

interface InventoryTableProps {
  items: InventoryItem[];
  onUpdate: (itemId: string) => void;
}

export default function InventoryTable({ items, onUpdate }: InventoryTableProps) {
  const getStockStatus = (item: InventoryItem): 'in-stock' | 'low-stock' | 'out-of-stock' => {
    if (!item.trackInventory) return 'in-stock';
    
    const stock = item.stockQuantity || 0;
    const minStock = item.minStockLevel || 0;
    
    if (stock === 0) return 'out-of-stock';
    if (stock <= minStock) return 'low-stock';
    return 'in-stock';
  };

  const getStatusBadge = (status: 'in-stock' | 'low-stock' | 'out-of-stock') => {
    switch (status) {
      case 'in-stock':
        return (
          <Badge variant="success" className="bg-green-500">
            In Stock
          </Badge>
        );
      case 'low-stock':
        return (
          <Badge variant="warning" className="bg-orange-500">
            Low Stock
          </Badge>
        );
      case 'out-of-stock':
        return (
          <Badge variant="error" className="bg-red-500">
            Out of Stock
          </Badge>
        );
    }
  };

  return (
    <div className="rounded-md border" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Item Name</TableHead>
            <TableHead className="font-semibold">Category</TableHead>
            <TableHead className="font-semibold text-center">Current Stock</TableHead>
            <TableHead className="font-semibold text-center">Min Stock</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Last Updated</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                No inventory items found.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const status = getStockStatus(item);
              
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>{item.name}</TableCell>
                  <TableCell style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {item.category.name}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.trackInventory ? (
                      <span className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                        {item.stockQuantity ?? 0}
                      </span>
                    ) : (
                      <span style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}>—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.trackInventory && item.minStockLevel !== null ? (
                      <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {item.minStockLevel}
                      </span>
                    ) : (
                      <span style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}>—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.trackInventory ? (
                      getStatusBadge(status)
                    ) : (
                      <Badge variant="outline" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Not Tracked
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {formatDate(item.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdate(item.id)}
                    >
                      Update Stock
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}