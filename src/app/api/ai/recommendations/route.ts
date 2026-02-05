// src/app/api/ai/recommendations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Groq from 'groq-sdk';

// In-memory cache for recommendations (resets on server restart)
const recommendationsCache = new Map<string, {
  data: any[];
  timestamp: number;
}>();

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * GET /api/ai/recommendations
 * Generate personalized menu recommendations based on time, weather, user history
 * 
 * Query Parameters:
 * - restaurantId (required): Restaurant ID
 * - customerId (optional): Customer ID for personalization
 * 
 * @returns Array of recommended menu items with reasoning
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get('restaurantId');
    const customerId = searchParams.get('customerId');

    console.log('🔵 API: Received restaurantId:', restaurantId);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    // Create cache key (without customerId for shared cache, or with it for personalized)
    const cacheKey = `recommendations_${restaurantId}_${customerId || 'guest'}`;
    
    // Check cache first
    const cached = recommendationsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('✅ Using cached recommendations');
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
      });
    }

    // Get current time context
    const currentHour = new Date().getHours();
    const timeOfDay = 
      currentHour < 11 ? 'breakfast' :
      currentHour < 15 ? 'lunch' :
      currentHour < 18 ? 'afternoon' :
      'dinner';

    // Get customer's order history if available
    let customerHistory = '';
    if (customerId) {
      const pastOrders = await prisma.order.findMany({
        where: {
          customerId,
          status: 'DELIVERED',
        },
        include: {
          orderItems: {
            include: {
              menuItem: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      });

      const itemFrequency: Record<string, number> = {};
      pastOrders.forEach(order => {
        order.orderItems.forEach(item => {
          const name = item.menuItem.name;
          itemFrequency[name] = (itemFrequency[name] || 0) + 1;
        });
      });

      customerHistory = Object.entries(itemFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => `${name}: ordered ${count} times`)
        .join(', ');
    }

    // Get restaurant settings from the settings table
    const groqApiKeySetting = await prisma.setting.findUnique({
      where: {
        restaurantId_key: {
          restaurantId: restaurantId,
          key: 'groqApiKey',
        },
      },
    });

    const enableAiFeaturesSetting = await prisma.setting.findUnique({
      where: {
        restaurantId_key: {
          restaurantId: restaurantId,
          key: 'enableAiFeatures',
        },
      },
    });

    const groqApiKey = groqApiKeySetting?.value ? JSON.parse(groqApiKeySetting.value) : null;
    const enableAiFeatures = enableAiFeaturesSetting?.value ? JSON.parse(enableAiFeaturesSetting.value) : false;

    // Check if AI features are enabled
    if (!enableAiFeatures) {
      console.log('🔴 AI features not enabled for this restaurant');
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Use restaurant's API key or fallback to environment variable
    const apiKey = groqApiKey || process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.log('🔴 No API key configured');
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Initialize Groq client with restaurant's API key
    const groq = new Groq({ apiKey });

    // Get available menu items
    console.log('🔵 API: Querying menu items for restaurantId:', restaurantId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId,
        isAvailable: true,
      },
      include: {
        category: true,
        customizationGroups: {
          include: {
            options: true,
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
      take: 50,
    });

    console.log('🔵 API: Found', menuItems.length, 'menu items');

    if (menuItems.length === 0) {
      console.log('🔴 API: No menu items found - returning empty array');
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Get popular items from order history
    const popularItems = await prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
      SELECT mi.name, COUNT(*) as count
      FROM "OrderItem" oi
      JOIN "MenuItem" mi ON oi."menuItemId" = mi.id
      JOIN "Order" o ON oi."orderId" = o.id
      WHERE mi."restaurantId" = ${restaurantId}
      AND o.status = 'DELIVERED'
      AND o."createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY mi.name
      ORDER BY count DESC
      LIMIT 10
    `;

    // Build prompt for AI
    const prompt = `You are an AI assistant for a restaurant. Recommend 4-6 menu items based on current context.

**Current Context:**
- Time of Day: ${timeOfDay}
- Current Hour: ${currentHour}:00

**Customer History:** ${customerHistory || 'New customer - no history'}

**Popular Items (Last 30 Days):**
${popularItems.map(p => `- ${p.name} (ordered ${p.count} times)`).join('\n')}

**Available Menu Items:**
${menuItems.slice(0, 30).map(item => 
  `- ${item.name} ($${item.price}) - ${item.category.name}${item.isVegetarian ? ' [Vegetarian]' : ''}${item.isVegan ? ' [Vegan]' : ''}`
).join('\n')}

**Recommendation Criteria:**
1. Time-appropriate items (e.g., breakfast items in morning, hearty meals for dinner)
2. Customer's past preferences (if available)
3. Currently popular items
4. Variety across categories
5. Dietary preferences

**Response Format (JSON only, no markdown):**
{
  "recommendations": [
    {
      "itemName": "Exact item name from menu",
      "reason": "Brief reason (1 sentence, under 60 chars)"
    }
  ]
}

Select 4-6 items. Ensure variety.`;

    // Call Groq AI service
    const message = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.choices?.[0]?.message?.content || '';
    
    const cleanJson = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const aiResponse = JSON.parse(cleanJson);

    // Map AI recommendations to full menu items
    const recommendations = aiResponse.recommendations
      .map((rec: { itemName: string; reason: string }) => {
        const menuItem = menuItems.find(
          item => item.name.toLowerCase() === rec.itemName.toLowerCase()
        );
        
        return menuItem || null;
      })
      .filter((item: any) => item !== null)
      .slice(0, 6);

    // Store in cache
    recommendationsCache.set(cacheKey, {
      data: recommendations,
      timestamp: Date.now(),
    });

    console.log('✅ Generated fresh recommendations and cached');

    return NextResponse.json({
      success: true,
      data: recommendations,
      cached: false,
    });

  } catch (error) {
    console.error('Recommendations API error:', error);

    // Try to return stale cache on error
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get('restaurantId');
    const customerId = searchParams.get('customerId');
    const cacheKey = `recommendations_${restaurantId}_${customerId || 'guest'}`;
    const cached = recommendationsCache.get(cacheKey);
    
    if (cached) {
      console.log('⚠️ Error occurred, returning stale cache');
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
        stale: true,
      });
    }

    // Return empty array on error (fail gracefully)
    return NextResponse.json({
      success: true,
      data: [],
    });
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}