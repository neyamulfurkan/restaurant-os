// src/app/api/staff/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import { StaffRole } from '@prisma/client';

// GET - Fetch single staff member by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Remove password hash from response
    const { passwordHash: _passwordHash, ...staffWithoutPassword } = staff;

    return NextResponse.json({
      success: true,
      data: staffWithoutPassword,
    });
  } catch (error) {
    console.error('GET /api/staff/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch staff member' },
      { status: 500 }
    );
  }
}

// PATCH - Update staff member
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body: {
      name?: string;
      email?: string;
      phone?: string | null;
      role?: StaffRole;
      isActive?: boolean;
    } = await request.json();

    // Check if staff exists
    const existingStaff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!existingStaff) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Validate role if provided
    if (body.role && !Object.values(StaffRole).includes(body.role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid staff role' },
        { status: 400 }
      );
    }

    // Check if email is being changed and if it's already taken
    if (body.email && body.email !== existingStaff.email) {
      const emailExists = await prisma.staff.findUnique({
        where: { email: body.email },
      });

      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email already in use' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: {
      name?: string;
      email?: string;
      phone?: string | null;
      role?: StaffRole;
      isActive?: boolean;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Update staff member
    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: updateData,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Remove password hash from response
    const { passwordHash: _passwordHash2, ...staffWithoutPassword } = updatedStaff;

    return NextResponse.json({
      success: true,
      data: staffWithoutPassword,
      message: 'Staff member updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/staff/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update staff member' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete staff member (set isActive to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get current user's session to check if they're deleting themselves
    const session = await fetch(new URL('/api/auth/session', request.url).toString(), {
      headers: request.headers,
    }).then(res => res.json());

    // Prevent self-deletion
    if (session?.user?.id === id) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete your own account. Please contact another admin.' },
        { status: 403 }
      );
    }

    // Check if staff exists
    const existingStaff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!existingStaff) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    const deletedStaff = await prisma.staff.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: deletedStaff,
      message: 'Staff member deactivated successfully',
    });
  } catch (error) {
    console.error('DELETE /api/staff/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete staff member' },
      { status: 500 }
    );
  }
}