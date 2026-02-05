import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateTableSchema = z.object({
  number: z.string().min(1).optional(),
  capacity: z.number().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  positionX: z.number().min(0).max(100).optional(),
  positionY: z.number().min(0).max(100).optional(),
  shape: z.enum(['circle', 'rectangle', 'square', 'oval']).optional(),
  width: z.number().min(40).max(200).optional(),
  height: z.number().min(40).max(200).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const table = await prisma.table.findUnique({
      where: { id: params.id },
    });

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: table });
  } catch (error) {
    console.error('GET table error:', error);
    return NextResponse.json({ error: 'Failed to fetch table' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateTableSchema.parse(body);

    const table = await prisma.table.update({
      where: { id: params.id },
      data: validated,
    });

    return NextResponse.json({ success: true, data: table });
  } catch (error) {
    console.error('PATCH table error:', error);
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.table.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Table deleted' });
  } catch (error) {
    console.error('DELETE table error:', error);
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 });
  }
}