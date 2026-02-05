/**
 * Groq API Client Configuration
 * 
 * Initializes the Groq SDK client for AI-powered features:
 * - Demand forecasting
 * - Personalized upselling
 * - Smart table optimization
 * - Booking chatbot
 */

import Groq from 'groq-sdk';
import { prisma } from '@/lib/prisma';

/**
 * Get Groq API key from database settings or environment variable
 */
async function getGroqApiKey(): Promise<string | null> {
  try {
    // Try to get API key from database first
    const restaurant = await prisma.restaurant.findFirst({
      select: { id: true },
    });

    if (restaurant) {
      const apiKeySetting = await prisma.setting.findUnique({
        where: {
          restaurantId_key: {
            restaurantId: restaurant.id,
            key: 'groqApiKey',
          },
        },
      });

      if (apiKeySetting?.value) {
        const parsedValue = JSON.parse(apiKeySetting.value);
        if (parsedValue) {
          return parsedValue;
        }
      }
    }

    // Fallback to environment variable
    return process.env.GROQ_API_KEY || null;
  } catch (error) {
    console.error('Error getting Groq API key:', error);
    return process.env.GROQ_API_KEY || null;
  }
}

/**
 * Create Groq client instance with API key from settings or env
 */
export async function getGroqClient(): Promise<Groq | null> {
  const apiKey = await getGroqApiKey();
  
  if (!apiKey) {
    console.warn('GROQ_API_KEY not configured. AI features will be disabled.');
    return null;
  }

  return new Groq({ apiKey });
}

/**
 * Groq client singleton instance (uses env var only)
 * For backward compatibility - prefer using getGroqClient()
 */
export const anthropic = process.env.GROQ_API_KEY 
  ? new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  : null;

/**
 * Default model configuration
 * Use this constant in services for consistency
 */
export const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

/**
 * Default max tokens for responses
 * Adjust based on use case in services
 */
export const DEFAULT_MAX_TOKENS = 4096;

/**
 * Helper to check if API key is configured
 * Useful for conditional feature rendering
 */
export const isAnthropicConfigured = (): boolean => {
  return !!process.env.GROQ_API_KEY;
};