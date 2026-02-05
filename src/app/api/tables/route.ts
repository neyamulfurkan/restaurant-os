import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const tableSchema = z.object({
  number: z.string().min(1),
  capacity: z.number().min(1).max(50),
  isActive: z.boolean().default(true),
  shape: z.enum(['circle', 'rectangle', 'square', 'oval']).default('circle'),
  width: z.number().min(40).max(200).default(80),
  height: z.number().min(40).max(200).default(80),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tables = await prisma.table.findMany({
      orderBy: { number: 'asc' },
    });

    return NextResponse.json({ success: true, tables: tables });
  } catch (error) {
    console.error('GET tables error:', error);
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = tableSchema.parse(body);

    const restaurant = await prisma.restaurant.findFirst({
      where: { isActive: true },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'No active restaurant' }, { status: 404 });
    }

    const table = await prisma.table.create({
      data: {
        ...validated,
        restaurantId: restaurant.id,
      },
    });

    return NextResponse.json({ success: true, data: table }, { status: 201 });
  } catch (error) {
    console.error('POST table error:', error);
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 });
  }
}