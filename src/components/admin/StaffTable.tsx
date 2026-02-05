// src/components/admin/StaffTable.tsx

import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

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
import { Staff, StaffRole } from '@/types';

interface StaffTableProps {
  staff: (Staff & { lastLogin?: Date | null })[];
  onEdit: (staff: Staff) => void;
  onDelete: (staffId: string) => void;
}

export default function StaffTable({ staff, onEdit, onDelete }: StaffTableProps) {
  const formatLastActive = (lastLogin: Date | null | undefined): string => {
    if (!lastLogin) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - new Date(lastLogin).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return new Date(lastLogin).toLocaleDateString();
  };

  const getRoleBadgeVariant = (role: StaffRole): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'ADMIN':
        return 'default';
      case 'KITCHEN':
        return 'secondary';
      case 'WAITER':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (isActive: boolean): 'success' | 'error' => {
    return isActive ? 'success' : 'error';
  };

  return (
    <div className="rounded-lg border" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>
                No staff members found
              </TableCell>
            </TableRow>
          ) : (
            staff.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>{member.name}</TableCell>
                <TableCell style={{ color: 'hsl(var(--muted-foreground))' }}>{member.email}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(member.isActive)}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {formatLastActive(member.lastLogin)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(member)}
                      className=""
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'hsl(var(--muted) / 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      aria-label={`Edit ${member.name}`}
                    >
                      <Pencil className="h-4 w-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(member.id)}
                      className="hover:bg-error/10"
                      aria-label={`Delete ${member.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-error" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}