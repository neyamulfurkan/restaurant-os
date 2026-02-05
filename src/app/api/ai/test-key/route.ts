// src/app/api/ai/test-key/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

/**
 * POST /api/ai/test-key
 * Test if a Groq API key is valid
 * 
 * Body:
 * - apiKey: string (required) - The Groq API key to test
 * 
 * @returns { success: boolean, message?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    // Initialize Groq client with the provided API key
    const groq = new Groq({ apiKey });

    // Make a simple API call to test the key
    // Using a very minimal request to just validate the key
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
      max_tokens: 5,
    });

    // If we get here, the API key is valid
    if (completion && completion.choices && completion.choices.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'API key is valid',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid API response' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Test API key error:', error);

    // Check if it's an authentication error
    if (error?.status === 401 || error?.message?.includes('authentication')) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key - authentication failed' },
        { status: 401 }
      );
    }

    // Check if it's a rate limit error
    if (error?.status === 429) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded - please try again later' },
        { status: 429 }
      );
    }

    // Generic error
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to validate API key' 
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}