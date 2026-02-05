// src/app/admin/menu/page.tsx

'use client';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import * as React from 'react';
import { Plus, Search, Grid3x3, List, Pencil, Trash2, MoreVertical, ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  
} from '@/components/ui/sheet';
import { MenuItemForm } from '@/components/admin/MenuItemForm';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn, formatCurrency } from '@/lib/utils';
import type { MenuItemWithRelations, Category } from '@/types';

type ViewMode = 'grid' | 'table';

export default function AdminMenuPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Redirect non-admin users
  React.useEffect(() => {
    if (session?.user?.role && session.user.role !== 'ADMIN') {
      router.push('/admin/orders');
    }
  }, [session, router]);

  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<MenuItemWithRelations | null>(null);
  const [deletingItemId, setDeletingItemId] = React.useState<string | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState('');
  const [categoryDescription, setCategoryDescription] = React.useState('');
  const [isCategoriesOpen, setIsCategoriesOpen] = React.useState(false);

  const queryClient = useQueryClient();

  // Fetch categories directly
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/menu?type=categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  // Fetch menu items
  const { data: menuItemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['menu-items', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory
        ? `/api/menu?categoryId=${selectedCategory}`
        : '/api/menu';
      console.log('Fetching menu items from:', url);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch menu items');
      const result = await response.json();
      console.log('Menu items response:', result);
      return Array.isArray(result) ? result : (result.data || []);
    },
  });

  const menuItems = menuItemsData || [];

  // Toggle availability mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const response = await fetch(`/api/menu/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable }),
      });
      if (!response.ok) throw new Error('Failed to update availability');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('Availability updated');
    },
    onError: () => {
      toast.error('Failed to update availability');
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting item:', id);
      const response = await fetch(`/api/menu/${id}`, {
        method: 'DELETE',
      });
      console.log('Delete response status:', response.status);
      const data = await response.json();
      console.log('Delete response data:', data);
      if (!response.ok) throw new Error('Failed to delete item');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('Item deleted successfully');
      setDeletingItemId(null);
    },
    onError: () => {
      toast.error('Failed to delete item');
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await fetch('/api/menu?type=category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully');
      setIsCategoryFormOpen(false);
      setCategoryName('');
      setCategoryDescription('');
    },
    onError: () => {
      toast.error('Failed to create category');
    },
  });

  // Create/Update item mutation
  const saveItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/menu/${editingItem.id}` : '/api/menu';
      const method = editingItem ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to save item');
      }
      
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(editingItem ? 'Item updated successfully' : 'Item created successfully');
      setIsFormOpen(false);
      setEditingItem(null);
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['menu-items'] });
      }, 100);
    },
    onError: () => {
      toast.error('Failed to save item');
    },
  });

  // Filter items by search query
  const filteredItems = React.useMemo(() => {
    if (!menuItems || !Array.isArray(menuItems)) return [];
    return menuItems.filter((item: MenuItemWithRelations) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [menuItems, searchQuery]);

  const handleAddItem = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleEditItem = (item: MenuItemWithRelations) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    setDeletingItemId(id);
  };

  const handleToggleAvailability = (id: string, currentState: boolean) => {
    toggleAvailabilityMutation.mutate({ id, isAvailable: !currentState });
  };

  const handleAddCategory = () => {
    setIsCategoryFormOpen(true);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toast.error('Category name is required');
      return;
    }
    createCategoryMutation.mutate({
      name: categoryName.trim(),
      description: categoryDescription.trim() || undefined,
    });
  };

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setIsCategoriesOpen(false);
  };

  if (categoriesLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const CategorySidebar = () => (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Categories</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddCategory}
          title="Add category"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1">
        <button
          onClick={() => handleCategorySelect(null)}
          className={cn(
            'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
            selectedCategory === null
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-neutral-100'
          )}
        >
          All Items
        </button>
        {categories.map((category: Category) => (
          <button
            key={category.id}
            onClick={() => handleCategorySelect(category.id)}
            className={cn(
              'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
              selectedCategory === category.id
                ? ''
                : 'hover:bg-neutral-100'
            )}
            style={selectedCategory === category.id ? {
              backgroundColor: 'hsl(var(--primary))',
              color: 'white'
            } : {}}
          >
            {category.name}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      {/* Desktop Sidebar - Categories */}
      <div className="hidden lg:block w-64 border-r p-4 overflow-y-auto" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
        <CategorySidebar />
      </div>

      {/* Mobile Categories Sheet */}
      <Sheet open={isCategoriesOpen} onOpenChange={setIsCategoriesOpen}>
        <SheetContent side="left" className="w-64 p-4">
          <SheetHeader>
            <SheetTitle>Categories</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CategorySidebar />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 overflow-auto" style={{ backgroundColor: 'hsl(var(--page-bg))' }}>
        <div className="p-4 md:p-6">
          {/* Top Bar */}
          <div className="mb-4 md:mb-6 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between">
            {/* Search and Mobile Category Button */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Mobile Category Button */}
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden shrink-0"
                onClick={() => setIsCategoriesOpen(true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Search */}
              <div className="relative flex-1 md:w-96">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* View Mode and Add Button */}
            <div className="flex items-center gap-3">
              {/* View Mode Toggle - Hidden on mobile when in grid view */}
              <div className="hidden md:flex items-center gap-1 rounded-lg border p-1" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <Button onClick={handleAddItem} className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Content */}
          {itemsLoading ? (
            <div className="flex h-96 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex h-96 flex-col items-center justify-center">
              <p className="text-lg text-muted-foreground">No items found</p>
              <Button onClick={handleAddItem} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add your first item
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredItems.map((item: MenuItemWithRelations) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onToggleAvailability={handleToggleAvailability}
                />
              ))}
            </div>
          ) : (
            <div className="hidden md:block">
              <MenuItemsTable
                items={filteredItems}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                onToggleAvailability={handleToggleAvailability}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Item Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 py-4 flex-1">
            <MenuItemForm
              item={editingItem}
              categories={categories}
              onSubmit={(data) => saveItemMutation.mutate(data)}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingItem(null);
              }}
              isLoading={saveItemMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deletingItemId}
        onOpenChange={(open) => !open && setDeletingItemId(null)}
        title="Delete Menu Item"
        message="Are you sure you want to delete this menu item? This action cannot be undone."
        onConfirm={() => {
          if (deletingItemId) {
            deleteItemMutation.mutate(deletingItemId);
          }
        }}
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteItemMutation.isPending}
      />

      {/* Add Category Dialog */}
      <Dialog open={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div>
              <Label htmlFor="categoryName">
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="categoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Main Course"
                disabled={createCategoryMutation.isPending}
                className="mt-2"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="categoryDescription">Description (Optional)</Label>
              <Textarea
                id="categoryDescription"
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Brief description of this category..."
                rows={3}
                disabled={createCategoryMutation.isPending}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCategoryFormOpen(false);
                  setCategoryName('');
                  setCategoryDescription('');
                }}
                disabled={createCategoryMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCategoryMutation.isPending}>
                {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Menu Item Card Component
interface MenuItemCardProps {
  item: MenuItemWithRelations;
  onEdit: (item: MenuItemWithRelations) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: (id: string, currentState: boolean) => void;
}

function MenuItemCard({ item, onEdit, onDelete, onToggleAvailability }: MenuItemCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}>
      {/* Image */}
      <div className="relative aspect-[4/3]" style={{ backgroundColor: 'hsl(var(--muted))' }}>
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl text-neutral-300">🍽️</span>
          </div>
        )}
        {!item.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Badge variant="secondary" className="text-base font-semibold">
              Out of Stock
            </Badge>
          </div>
        )}
        {item.isVegetarian && (
          <Badge className="absolute left-2 top-2" style={{ backgroundColor: '#10b981', color: 'white' }}>Vegetarian</Badge>
        )}
        {item.isVegan && (
          <Badge className="absolute left-2 top-2" style={{ backgroundColor: '#10b981', color: 'white' }}>Vegan</Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate" style={{ color: 'hsl(var(--card-foreground))' }}>{item.name}</h3>
            <p className="mt-1 text-sm line-clamp-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {item.description || 'No description'}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(item.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold" style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(item.price)}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Available</span>
            <Switch
              checked={item.isAvailable}
              onCheckedChange={() => onToggleAvailability(item.id, item.isAvailable)}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

// Menu Items Table Component
interface MenuItemsTableProps {
  items: MenuItemWithRelations[];
  onEdit: (item: MenuItemWithRelations) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: (id: string, currentState: boolean) => void;
}

function MenuItemsTable({ items, onEdit, onDelete, onToggleAvailability }: MenuItemsTableProps) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Image</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="w-28">Price</TableHead>
            <TableHead className="w-28">Availability</TableHead>
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item: MenuItemWithRelations) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="relative h-14 w-14 overflow-hidden rounded-lg" style={{ backgroundColor: 'hsl(var(--muted))' }}>
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl">
                      🍽️
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm line-clamp-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {item.description || 'No description'}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{item.category.name}</Badge>
              </TableCell>
              <TableCell className="font-semibold">{formatCurrency(item.price)}</TableCell>
              <TableCell>
                <Switch
                  checked={item.isAvailable}
                  onCheckedChange={() => onToggleAvailability(item.id, item.isAvailable)}
                />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(item.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}