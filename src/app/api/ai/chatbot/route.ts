// src/app/api/ai/chatbot/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { chatbotConversation } from '@/services/aiService';
import { z } from 'zod';

// ============= VALIDATION SCHEMA =============

const chatbotMessageSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1, 'Message content is required'),
    })
  ).min(1, 'At least one message is required'),
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  customerId: z.string().optional(),
});

// ============= POST HANDLER =============

/**
 * POST /api/ai/chatbot
 * Handle chatbot conversation for booking assistance
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validated = chatbotMessageSchema.parse(body);
    
    const { messages, restaurantId } = validated;

    // Call AI service
    const response = await chatbotConversation(
      messages,
      restaurantId
    );

    // Save conversation to database if needed
    // This is optional - you can implement conversation persistence here
    // For now, we'll just return the response

    return NextResponse.json({
      message: response.message,
      bookingCreated: response.bookingCreated,
      bookingId: response.bookingId,
      intent: response.intent,
      type: response.type,
      requiresInput: response.requiresInput,
      data: response.data,
    });
  } catch (error) {
    console.error('Chatbot API error:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
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
        error: error instanceof Error ? error.message : 'Failed to process chatbot message',
      },
      { status: 500 }
    );
  }
}