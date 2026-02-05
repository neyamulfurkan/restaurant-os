// src/app/api/auth/signup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signupSchema } from '@/validations/auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('📝 Signup request received:', { ...body, password: '[REDACTED]' });
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate input
    let validated;
    try {
      validated = signupSchema.parse(body);
      console.log('✅ Validation passed');
    } catch (validationError) {
      console.error('❌ Validation failed:', validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationError.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Check if user already exists
    try {
      const existingUser = await prisma.customer.findUnique({
        where: { email: validated.email },
      });

      if (existingUser) {
        console.log('⚠️ Email already registered:', validated.email);
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        );
      }
      console.log('✅ Email available');
    } catch (dbError) {
      console.error('❌ Database error checking existing user:', dbError);
      throw dbError;
    }

    // Get the first active restaurant
    let restaurant;
    try {
      restaurant = await prisma.restaurant.findFirst({
        where: { isActive: true },
      });

      if (!restaurant) {
        console.error('❌ No active restaurant found');
        return NextResponse.json(
          { error: 'Restaurant not configured. Please contact support.' },
          { status: 500 }
        );
      }
      console.log('✅ Restaurant found:', restaurant.id);
    } catch (dbError) {
      console.error('❌ Database error fetching restaurant:', dbError);
      throw dbError;
    }

    // Hash password
    let passwordHash;
    try {
      passwordHash = await bcrypt.hash(validated.password, 10);
      console.log('✅ Password hashed');
    } catch (hashError) {
      console.error('❌ Password hashing failed:', hashError);
      throw hashError;
    }

    // Create user
    try {
      const customer = await prisma.customer.create({
        data: {
          name: validated.name,
          email: validated.email,
          phone: validated.phone || null,
          passwordHash,
          isGuest: false,
          restaurantId: restaurant.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      });

      console.log('✅ Customer created:', customer.id);

      return NextResponse.json(
        {
          success: true,
          message: 'Account created successfully',
          data: customer,
        },
        { status: 201 }
      );
    } catch (dbError) {
      console.error('❌ Database error creating customer:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('❌ Signup error:', error);

    return NextResponse.json(
      { 
        error: 'Failed to create account',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}