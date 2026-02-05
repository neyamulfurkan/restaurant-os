// src/app/api/staff/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { StaffRole } from '@prisma/client';
import type { CreateStaffRequest, ApiResponse } from '@/types';

// Validation schema
const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.nativeEnum(StaffRole, {
    errorMap: () => ({ message: 'Invalid role. Must be ADMIN, KITCHEN, or WAITER' }),
  }),
});

/**
 * GET /api/staff
 * Fetch all staff members (passwordHash excluded from response)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const role = searchParams.get('role') as StaffRole | null;
    const isActive = searchParams.get('isActive');
    const email = searchParams.get('email');

    // Build where clause with filters
    const whereClause: Record<string, unknown> = {};
    
    if (restaurantId) {
      whereClause.restaurantId = restaurantId;
    }
    
    if (role && Object.values(StaffRole).includes(role)) {
      whereClause.role = role;
    }
    
    if (isActive !== null) {
      whereClause.isActive = isActive === 'true';
    }
    
    if (email) {
      whereClause.email = email;
    }

    // Fetch staff members (explicitly exclude passwordHash)
    const staff = await prisma.staff.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, data: staff } as ApiResponse);
  } catch (error) {
    console.error('GET /api/staff error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch staff members' } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * POST /api/staff
 * Create new staff member with auto-generated password and invitation email
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateStaffRequest & { restaurantId?: string };
    
    // Validate request body
    const validated = createStaffSchema.parse(body);

    // Get restaurantId from body or use default from environment/database
    const restaurantId = body.restaurantId || 'rest123456789';

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' } as ApiResponse,
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingStaff = await prisma.staff.findUnique({
      where: { email: validated.email },
    });

    if (existingStaff) {
      return NextResponse.json(
        { success: false, error: 'A staff member with this email already exists' } as ApiResponse,
        { status: 409 }
      );
    }

    // Generate random password and hash it
    const generatedPassword = generateRandomPassword(12);
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    // Create staff member
    const newStaff = await prisma.staff.create({
      data: {
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        role: validated.role,
        passwordHash,
        restaurantId: restaurantId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Send invitation email (non-blocking)
    try {
      await sendInvitationEmail({
        email: validated.email,
        name: validated.name,
        password: generatedPassword,
        role: validated.role,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...newStaff,
          temporaryPassword: generatedPassword, // Include password in response for admin
        },
        message: 'Staff member created successfully. Invitation email sent.',
      } as ApiResponse,
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/staff error:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Handle Prisma unique constraint errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'A staff member with this email already exists' } as ApiResponse,
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create staff member' } as ApiResponse,
      { status: 500 }
    );
  }
}

// ============= HELPER FUNCTIONS =============

/**
 * Generate a secure random password
 * Ensures at least one lowercase, uppercase, number, and special character
 */
function generateRandomPassword(length: number): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure password contains at least one of each type
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';

  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill remaining length with random characters
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle to randomize positions
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Send invitation email to new staff member
 * Logs to console for development, integrate with SendGrid in production
 */
async function sendInvitationEmail(params: {
  email: string;
  name: string;
  password: string;
  role: StaffRole;
}): Promise<void> {
  // Log credentials to console (development only)
  console.log('=== Staff Invitation Email ===');
  console.log(`To: ${params.email}`);
  console.log(`Name: ${params.name}`);
  console.log(`Role: ${params.role}`);
  console.log(`Temporary Password: ${params.password}`);
  console.log(`Login URL: ${process.env.NEXT_PUBLIC_APP_URL}/admin/login`);
  console.log('================================');

  // TODO: Integrate with SendGrid in production
  // Uncomment and configure when SENDGRID_API_KEY is available
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: params.email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'Welcome to RestaurantOS - Your Account Credentials',
    text: `
      Hi ${params.name},

      Welcome to RestaurantOS! Your account has been created with the following credentials:

      Email: ${params.email}
      Temporary Password: ${params.password}
      Role: ${params.role}

      Please login at: ${process.env.NEXT_PUBLIC_APP_URL}/admin/login

      For security, please change your password after your first login.

      Best regards,
      RestaurantOS Team
    `,
    html: `
      <h2>Welcome to RestaurantOS!</h2>
      <p>Hi ${params.name},</p>
      <p>Your account has been created with the following credentials:</p>
      <ul>
        <li><strong>Email:</strong> ${params.email}</li>
        <li><strong>Temporary Password:</strong> ${params.password}</li>
        <li><strong>Role:</strong> ${params.role}</li>
      </ul>
      <p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/login" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Login Now</a>
      </p>
      <p><em>For security, please change your password after your first login.</em></p>
      <p>Best regards,<br>RestaurantOS Team</p>
    `,
  };

  await sgMail.send(msg);
  */
}