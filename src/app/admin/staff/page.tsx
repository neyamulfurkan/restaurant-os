// src/app/admin/staff/page.tsx

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import StaffTable from '@/components/admin/StaffTable';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Staff, StaffRole } from '@/types';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface AddStaffFormData {
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
}

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<AddStaffFormData>({
    name: '',
    email: '',
    phone: '',
    role: 'WAITER',
  });
  const [generatedPassword, setGeneratedPassword] = useState<string>('');

  // Fetch staff
  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const response = await fetch('/api/staff');
      if (!response.ok) throw new Error('Failed to fetch staff');
      const result = await response.json();
      return result.data as (Staff & { lastLogin?: Date | null })[];
    },
  });

  // Add staff mutation
  const addStaffMutation = useMutation({
    mutationFn: async (data: AddStaffFormData) => {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add staff');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setGeneratedPassword(data.data.temporaryPassword);
      toast.success('Staff member added successfully! Invite email sent.');
      // Don't auto-close modal, let admin manually close after copying password
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update staff mutation
  const updateStaffMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Staff> }) => {
      const response = await fetch(`/api/staff/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update staff');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member updated successfully!');
      setIsEditModalOpen(false);
      setSelectedStaff(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete staff');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedStaff(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    addStaffMutation.mutate(formData);
  };

  const handleEditStaff = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStaff) return;

    updateStaffMutation.mutate({
      id: selectedStaff.id,
      updates: formData,
    });
  };

  const handleEdit = (staff: Staff) => {
    setSelectedStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || '',
      role: staff.role,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (staffId: string) => {
    const foundStaff = staff?.find((s: any) => s.id === staffId);
    if (foundStaff) {
      setSelectedStaff(foundStaff);
      setIsDeleteModalOpen(true);
    }
  };

  const confirmDelete = () => {
    if (selectedStaff) {
      deleteStaffMutation.mutate(selectedStaff.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" style={{ backgroundColor: 'hsl(var(--background))' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Staff Management</h1>
          <p className="mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Manage your restaurant staff and their roles
          </p>
        </div>
        <Button
          onClick={() => {
            setFormData({ name: '', email: '', phone: '', role: 'WAITER' });
            setIsAddModalOpen(true);
          }}
          style={{ background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary) / 0.9))' }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
          <div className="text-sm mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Total Staff</div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            {staff?.length || 0}
          </div>
        </div>
        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
          <div className="text-sm mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Active</div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--success))' }}>
            {staff?.filter((s) => s.isActive).length || 0}
          </div>
        </div>
        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
          <div className="text-sm mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Inactive</div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--destructive))' }}>
            {staff?.filter((s) => !s.isActive).length || 0}
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <StaffTable
        staff={staff || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Add Staff Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Enter the staff member details. An invite email will be sent with login credentials.
            </DialogDescription>
          </DialogHeader>
          
          {generatedPassword ? (
            <div className="space-y-4">
              <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--success) / 0.1)', borderWidth: '1px', borderColor: 'hsl(var(--success) / 0.2)' }}>
                <p className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--success))' }}>
                  ✓ Staff member added successfully!
                </p>
                <p className="text-sm mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  An invite email has been sent. Here are the login credentials:
                </p>
                <div className="bg-card rounded border border-border p-3 space-y-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Email:</span>
                    <p className="text-sm font-mono" style={{ color: 'hsl(var(--foreground))' }}>{formData.email}</p>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Password:</span>
                    <p className="text-sm font-mono font-bold" style={{ color: 'hsl(var(--foreground))' }}>{generatedPassword}</p>
                  </div>
                </div>
                <p className="text-xs mt-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  ⚠️ This password will only be shown once. Make sure to save it before closing.
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPassword);
                    toast.success('Password copied to clipboard!');
                  }}
                  variant="outline"
                >
                  Copy Password
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setGeneratedPassword('');
                    setFormData({ name: '', email: '', phone: '', role: 'WAITER' });
                  }}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as StaffRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="KITCHEN">Kitchen</SelectItem>
                    <SelectItem value="WAITER">Waiter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={addStaffMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addStaffMutation.isPending}>
                  {addStaffMutation.isPending ? 'Adding...' : 'Add Staff'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Staff Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update the staff member details.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditStaff} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as StaffRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="KITCHEN">Kitchen</SelectItem>
                  <SelectItem value="WAITER">Waiter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={updateStaffMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateStaffMutation.isPending}>
                {updateStaffMutation.isPending ? 'Updating...' : 'Update Staff'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Delete Staff Member"
        message={`Are you sure you want to delete ${selectedStaff?.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteStaffMutation.isPending}
      />
    </div>
  );
}