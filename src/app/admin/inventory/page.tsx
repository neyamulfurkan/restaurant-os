// src/app/admin/inventory/page.tsx

'use client';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import InventoryTable from '@/components/admin/InventoryTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { MenuItem } from '@/types';
import { toast } from 'sonner';
import { Search, Filter, AlertTriangle, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryItem extends MenuItem {
  category: {
    name: string;
  };
}

interface UpdateStockData {
  itemId: string;
  adjustment: 'add' | 'remove' | 'set';
  quantity: number;
  reason?: string;
}

export default function AdminInventoryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // Kitchen can view, Waiter cannot access
  React.useEffect(() => {
    if (session?.user?.role === 'WAITER') {
      router.push('/admin/orders');
    }
  }, [session, router]);
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'set'>('add');
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch inventory items (only tracked items by default)
  const { data: inventoryData, isLoading } = useQuery<{
    items: InventoryItem[];
    categories: Array<{ id: string; name: string }>;
    stats?: {
      totalItems: number;
      trackedItems: number;
      outOfStock: number;
      lowStock: number;
      inStock: number;
    };
  }>({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await fetch('/api/inventory?trackInventoryOnly=true');
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      // Ensure categories array exists
      return {
        items: data.items || [],
        categories: data.categories || [],
        stats: data.stats,
      };
    },
  });

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: async (data: UpdateStockData) => {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update stock');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Stock updated successfully');
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update stock');
    },
  });

  // Calculate low stock count for alert
  const lowStockCount = useMemo(() => {
    if (!inventoryData?.items) return 0;
    return inventoryData.items.filter(item => {
      if (!item.trackInventory) return false;
      const stock = item.stockQuantity || 0;
      const minStock = item.minStockLevel || 0;
      return stock > 0 && stock <= minStock;
    }).length;
  }, [inventoryData]);

  // Calculate out of stock count for alert
  const outOfStockCount = useMemo(() => {
    if (!inventoryData?.items) return 0;
    return inventoryData.items.filter(item => {
      if (!item.trackInventory) return false;
      return (item.stockQuantity || 0) === 0;
    }).length;
  }, [inventoryData]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!inventoryData?.items) return [];
    
    return inventoryData.items.filter(item => {
      // Search filter
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.category.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category filter
      const matchesCategory = categoryFilter === 'all' || item.category.name === categoryFilter;
      
      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (!item.trackInventory) {
          matchesStatus = false;
        } else {
          const stock = item.stockQuantity || 0;
          const minStock = item.minStockLevel || 0;
          
          if (statusFilter === 'in-stock') {
            matchesStatus = stock > minStock;
          } else if (statusFilter === 'low-stock') {
            matchesStatus = stock > 0 && stock <= minStock;
          } else if (statusFilter === 'out-of-stock') {
            matchesStatus = stock === 0;
          }
        }
      }
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventoryData?.items, searchQuery, categoryFilter, statusFilter]);

  // Handlers
  const handleUpdateClick = (itemId: string) => {
    const item = inventoryData?.items.find(i => i.id === itemId);
    if (item) {
      setSelectedItem(item);
      setUpdateModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setUpdateModalOpen(false);
    setSelectedItem(null);
    setAdjustmentType('add');
    setQuantity('');
    setReason('');
  };

  const handleSubmitUpdate = () => {
    if (!selectedItem) return;
    
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    updateStockMutation.mutate({
      itemId: selectedItem.id,
      adjustment: adjustmentType,
      quantity: qty,
      reason: reason.trim() || undefined,
    });
  };

  const calculateNewStock = (): number => {
    if (!selectedItem) return 0;
    
    const currentStock = selectedItem.stockQuantity || 0;
    const qty = parseInt(quantity) || 0;
    
    switch (adjustmentType) {
      case 'add':
        return currentStock + qty;
      case 'remove':
        return Math.max(0, currentStock - qty);
      case 'set':
        return qty;
      default:
        return currentStock;
    }
  };

  // Handle CSV import
  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Processing CSV file...');
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

          if (jsonData.length === 0) {
            toast.dismiss();
            toast.error('CSV file is empty');
            return;
          }

          // Process updates
          const updates: Array<{ itemId: string; quantity: number }> = [];
          
          for (const row of jsonData) {
            const itemName = row['Item Name'] || row.itemName || row.name || '';
            const stock = parseInt(row['Current Stock'] || row.currentStock || row.stock || '0');
            
            const item = inventoryData?.items.find(
              i => i.name.toLowerCase() === itemName.toLowerCase()
            );
            
            if (item && item.trackInventory && !isNaN(stock)) {
              updates.push({
                itemId: item.id,
                quantity: stock,
              });
            }
          }

          if (updates.length === 0) {
            toast.dismiss();
            toast.error('No matching items found in CSV');
            return;
          }

          // Send bulk update request
          const response = await fetch('/api/inventory', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates }),
          });

          if (!response.ok) throw new Error('Failed to import CSV');
          
          const result = await response.json();
          
          toast.dismiss();
          toast.success(`Successfully imported ${result.successful} items${result.failed > 0 ? `. Failed: ${result.failed}` : ''}`);
          
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
        } catch (error) {
          toast.dismiss();
          toast.error(error instanceof Error ? error.message : 'Failed to process CSV');
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to read file');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle CSV export
  const handleExportCSV = () => {
    if (!inventoryData?.items || inventoryData.items.length === 0) {
      toast.error('No inventory data to export');
      return;
    }

    try {
      const exportData = inventoryData.items.map(item => {
        const stock = item.stockQuantity || 0;
        const minStock = item.minStockLevel || 0;
        let status = 'Not Tracked';
        
        if (item.trackInventory) {
          if (stock === 0) status = 'Out of Stock';
          else if (stock <= minStock) status = 'Low Stock';
          else status = 'In Stock';
        }

        return {
          'Item Name': item.name,
          'Category': item.category?.name || '',
          'Current Stock': item.trackInventory ? stock : '',
          'Min Stock': item.trackInventory && item.minStockLevel !== null ? item.minStockLevel : '',
          'Status': status,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

      XLSX.writeFile(workbook, `inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success('Inventory exported successfully');
    } catch (error) {
      toast.error('Failed to export inventory');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" style={{ backgroundColor: 'hsl(var(--background))' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Inventory Management</h1>
          <p className="mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Track and manage stock levels</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleImportCSV}
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleExportCSV}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <Alert style={{ borderColor: 'hsl(var(--warning) / 0.3)', backgroundColor: 'hsl(var(--warning) / 0.1)' }}>
          <AlertTriangle className="h-4 w-4" style={{ color: 'hsl(var(--warning))' }} />
          <AlertDescription style={{ color: 'hsl(var(--warning))' }}>
            {outOfStockCount > 0 && (
              <span className="font-semibold">
                {outOfStockCount} item{outOfStockCount !== 1 ? 's' : ''} out of stock
              </span>
            )}
            {outOfStockCount > 0 && lowStockCount > 0 && <span> • </span>}
            {lowStockCount > 0 && (
              <span className="font-semibold">
                {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} low on stock
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 rounded-lg border" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by item or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(inventoryData?.categories || []).map((category) => (
              <SelectItem key={category.id} value={category.name}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Inventory Table */}
      <InventoryTable items={filteredItems} onUpdate={handleUpdateClick} />

      {/* Update Stock Modal */}
      <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              Adjust inventory for {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Stock Display */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--muted))' }}>
              <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Current Stock</div>
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                {selectedItem?.stockQuantity ?? 0}
              </div>
              {selectedItem?.minStockLevel && (
                <div className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Min Stock: {selectedItem.minStockLevel}
                </div>
              )}
            </div>

            {/* Adjustment Type */}
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select value={adjustmentType} onValueChange={(value: any) => setAdjustmentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock</SelectItem>
                  <SelectItem value="remove">Remove Stock</SelectItem>
                  <SelectItem value="set">Set Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                placeholder="Enter quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            {/* New Stock Preview */}
            {quantity && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', borderWidth: '1px', borderColor: 'hsl(var(--primary) / 0.2)' }}>
                <div className="text-sm" style={{ color: 'hsl(var(--primary))' }}>New Stock Level</div>
                <div className="text-2xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
                  {calculateNewStock()}
                </div>
              </div>
            )}

            {/* Reason (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Received shipment, Waste, Inventory correction"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitUpdate}
              disabled={!quantity || updateStockMutation.isPending}
            >
              {updateStockMutation.isPending ? 'Updating...' : 'Update Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}