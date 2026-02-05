// src/app/api/notifications/email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/services/notificationService';
import { z } from 'zod';

// ============= VALIDATION SCHEMA =============

const sendEmailSchema = z.object({
  to: z.string().email('Valid email address is required'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  html: z.string().min(1, 'Email content is required'),
  text: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============= POST HANDLER =============

/**
 * POST /api/notifications/email
 * Send email via SendGrid
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validated = sendEmailSchema.parse(body);

    // Send email
    const result = await sendEmail(
      validated.to,
      validated.subject,
      validated.html,
      validated.text
    );

    // Check if send was successful
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send email',
        },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          messageId: result.messageId,
          to: validated.to,
          subject: validated.subject,
        },
        message: 'Email sent successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Email API Error:', error);

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
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}