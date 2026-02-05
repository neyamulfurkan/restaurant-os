// src/services/aiService.ts

import { anthropic, DEFAULT_MODEL } from '@/lib/anthropic';
import { prisma } from '@/lib/prisma';
import {
  CartItem,
  ForecastResponse,
  UpsellResponse,
  TableOptimizationResponse,
  ChatbotResponse,
  Booking,
  Table,
} from '@/types';

// ============= DEMAND FORECASTING =============

/**
 * Generate demand forecast for a specific date
 * Uses historical sales data and Claude AI to predict future demand
 * 
 * @param restaurantId - Restaurant ID
 * @param date - Date to forecast (ISO string)
 * @returns Forecast with predicted orders, revenue, and prep recommendations
 */
export async function generateForecast(
  restaurantId: string,
  date: Date
): Promise<ForecastResponse> {
  console.log('🤖 AI FORECAST - Starting generation for date:', date.toISOString());
  
  try {
    // Fetch historical data (last 30 days)
    const thirtyDaysAgo = new Date(date);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log('📊 Fetching historical orders from', thirtyDaysAgo.toISOString(), 'to', date.toISOString());

    const historicalOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: {
          gte: thirtyDaysAgo,
          lt: date,
        },
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
        createdAt: 'asc',
      },
    });

    console.log(`📦 Found ${historicalOrders.length} completed orders in last 30 days`);

    // Check if we have enough data (minimum 2 orders for testing, 5+ for production)
    const MIN_ORDERS_FOR_FORECAST = 2; // Lower threshold for testing
    
    if (historicalOrders.length < MIN_ORDERS_FOR_FORECAST) {
      console.error('❌ Insufficient data: only', historicalOrders.length, 'orders (need', MIN_ORDERS_FOR_FORECAST, '+)');
      throw new Error(`Insufficient historical data for AI forecasting. Found ${historicalOrders.length} completed (DELIVERED) orders, need at least ${MIN_ORDERS_FOR_FORECAST}. Please complete more orders first.`);
    }
    
    if (historicalOrders.length < 5) {
      console.warn('⚠️ Limited data: Only', historicalOrders.length, 'orders available. Forecast accuracy will be lower.');
    }

    // Aggregate data for Claude

    const dailyStats = historicalOrders.reduce((acc, order) => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const hour = order.createdAt.getHours();
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          orders: 0,
          revenue: 0,
          items: {} as Record<string, number>,
          hourlyOrders: {} as Record<number, number>,
        };
      }
      
      acc[dateKey].orders += 1;
      acc[dateKey].revenue += order.totalAmount;
      acc[dateKey].hourlyOrders[hour] = (acc[dateKey].hourlyOrders[hour] || 0) + 1;
      
      (order as { orderItems?: Array<{ menuItem: { name: string }; quantity: number }> }).orderItems?.forEach((item: { menuItem: { name: string }; quantity: number }) => {
        acc[dateKey].items[item.menuItem.name] = 
          (acc[dateKey].items[item.menuItem.name] || 0) + item.quantity;
      });
      
      return acc;
    }, {} as Record<string, { orders: number; revenue: number; items: Record<string, number>; hourlyOrders: Record<number, number> }>);

    const targetDayOfWeek = date.getDay();
    const targetDateStr = date.toISOString().split('T')[0];

    // Build prompt for Claude
    const prompt = `You are an AI assistant for a restaurant management system. Analyze the following historical sales data and generate a demand forecast.

**Historical Data (Last 30 Days):**
${JSON.stringify(dailyStats, null, 2)}

**Forecast Target:**
- Date: ${targetDateStr}
- Day of Week: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][targetDayOfWeek]}

**Task:**
1. Predict the number of orders for the target date
2. Predict the total revenue
3. Identify peak hours (start and end time in HH:mm format)
4. Recommend preparation quantities for top 5 items

**Response Format (JSON only, no markdown):**
{
  "predictedOrders": <number>,
  "predictedRevenue": <number>,
  "peakHourStart": "HH:mm",
  "peakHourEnd": "HH:mm",
  "recommendations": [
    {
      "itemName": "Item Name",
      "suggestedQuantity": <number>,
      "reasoning": "Brief explanation"
    }
  ],
  "confidence": <0.0-1.0>
}`;

    // Get Groq API key
    console.log('🔑 Checking Groq API configuration...');
    
    const apiKeySetting = await prisma.setting.findUnique({
      where: {
        restaurantId_key: {
          restaurantId: restaurantId,
          key: 'groqApiKey',
        },
      },
    });

    const apiKey = apiKeySetting?.value ? JSON.parse(apiKeySetting.value) : process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.error('❌ No Groq API key found in settings or environment');
      throw new Error('Groq API key not configured. Please add it in Settings > AI Features.');
    }

    console.log('✅ Groq API key found, length:', apiKey.length);

    const Groq = (await import('groq-sdk')).default;
    const groqClient = new Groq({ apiKey });

    console.log('🚀 Sending prompt to Groq AI...');
    console.log('📝 Prompt length:', prompt.length, 'characters');

    const message = await groqClient.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    console.log('✅ Received response from Groq AI');

    // Parse Groq's response
    const responseText = message.choices?.[0]?.message?.content || '';
    
    console.log('📄 Raw AI response:', responseText.substring(0, 200) + '...');
    
    if (!responseText) {
      throw new Error('Empty response from Groq AI service');
    }
    
    // Remove markdown code blocks if present
    const cleanJson = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    console.log('🧹 Cleaned JSON for parsing');
    
    const forecastData = JSON.parse(cleanJson);
    
    console.log('✅ Successfully parsed forecast data:', {
      predictedOrders: forecastData.predictedOrders,
      predictedRevenue: forecastData.predictedRevenue,
      confidence: forecastData.confidence,
      recommendationsCount: forecastData.recommendations?.length || 0
    });

    // Get menu item IDs for recommendations
    const itemNames = forecastData.recommendations.map((r: any) => r.itemName);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId,
        name: {
          in: itemNames,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const itemNameToId = Object.fromEntries(
      menuItems.map(item => [item.name, item.id])
    );

    // Save forecast to database
    await prisma.demandForecast.upsert({
      where: {
        restaurantId_date: {
          restaurantId,
          date,
        },
      },
      create: {
        restaurantId,
        date,
        dayOfWeek: targetDayOfWeek,
        predictedOrders: forecastData.predictedOrders,
        predictedRevenue: forecastData.predictedRevenue,
        peakHourStart: forecastData.peakHourStart,
        peakHourEnd: forecastData.peakHourEnd,
        recommendations: forecastData.recommendations,
        confidence: forecastData.confidence,
      },
      update: {
        predictedOrders: forecastData.predictedOrders,
        predictedRevenue: forecastData.predictedRevenue,
        peakHourStart: forecastData.peakHourStart,
        peakHourEnd: forecastData.peakHourEnd,
        recommendations: forecastData.recommendations,
        confidence: forecastData.confidence,
      },
    });

    // Format response
    return {
      date: targetDateStr,
      predictedOrders: forecastData.predictedOrders,
      predictedRevenue: forecastData.predictedRevenue,
      peakHourStart: forecastData.peakHourStart,
      peakHourEnd: forecastData.peakHourEnd,
      recommendations: forecastData.recommendations.map((rec: any) => ({
        itemId: itemNameToId[rec.itemName] || '',
        itemName: rec.itemName,
        suggestedQuantity: rec.suggestedQuantity,
      })),
      confidence: forecastData.confidence,
    };
  } catch (error) {
    console.error('❌ FORECAST GENERATION ERROR:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Re-throw the error so it shows in the UI
    throw error;
  }
}

// ============= PERSONALIZED UPSELLING =============

/**
 * Generate personalized upsell suggestions based on cart items
 * 
 * @param cartItems - Current items in cart
 * @param customerId - Optional customer ID for personalization
 * @param restaurantId - Restaurant ID
 * @returns Upsell suggestions with reasoning
 */
export async function getUpsellSuggestions(
  cartItems: CartItem[],
  restaurantId: string,
  customerId?: string
): Promise<UpsellResponse> {
  try {
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
        (order as { orderItems?: Array<{ menuItem: { name: string }; quantity: number }> }).orderItems?.forEach((item: { menuItem: { name: string }; quantity: number }) => {
          itemFrequency[item.menuItem.name] = 
            (itemFrequency[item.menuItem.name] || 0) + 1;
        });
      });

      customerHistory = Object.entries(itemFrequency)
        .map(([name, count]) => `${name}: ${count} times`)
        .join(', ');
    }

    // Get all available menu items
    const allMenuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId,
        isAvailable: true,
      },
      include: {
        category: true,
      },
    });

    // Get popular pairings from historical data
    const cartItemNames = cartItems.map(item => item.name);
    const popularPairings = await prisma.$queryRaw<Array<{ item_name: string; count: bigint }>>`
      SELECT mi.name as item_name, COUNT(*) as count
      FROM "OrderItem" oi1
      JOIN "OrderItem" oi2 ON oi1."orderId" = oi2."orderId" AND oi1.id != oi2.id
      JOIN "MenuItem" mi ON oi2."menuItemId" = mi.id
      WHERE oi1.name IN (${cartItemNames.join(',')})
      AND mi."restaurantId" = ${restaurantId}
      AND mi."isAvailable" = true
      GROUP BY mi.name
      ORDER BY count DESC
      LIMIT 10
    `;

    const currentTime = new Date().getHours();
    const timeOfDay = 
      currentTime < 11 ? 'breakfast' :
      currentTime < 15 ? 'lunch' :
      currentTime < 18 ? 'afternoon' :
      'dinner';

    // Build prompt for Claude
    const prompt = `You are an AI assistant for a restaurant. Suggest 3 complementary menu items to upsell based on the customer's current cart.

**Current Cart:**
${cartItems.map(item => `- ${item.name} (${item.quantity}x, $${item.price})`).join('\n')}

**Customer History:** ${customerHistory || 'No history (new customer)'}

**Time of Day:** ${timeOfDay}

**Popular Pairings:**
${popularPairings.map((p: { item_name: string; count: bigint }) => `- ${p.item_name} (ordered together ${p.count} times)`).join('\n')}

**Available Menu Items:**
${allMenuItems.slice(0, 20).map(item => 
  `- ${item.name} ($${item.price}) - ${item.category.name}${item.isVegetarian ? ' [V]' : ''}`
).join('\n')}

**Task:**
Suggest 3 items that would complement the current cart. Consider:
1. Flavor pairings and meal completion
2. Customer's past preferences (if available)
3. Time of day appropriateness
4. Popular combinations from data

**Response Format (JSON only, no markdown):**
{
  "suggestions": [
    {
      "itemName": "Exact item name from menu",
      "reason": "Brief compelling reason (1 sentence)",
      "confidence": <0.0-1.0>
    }
  ]
}`;

    // Get Groq client with API key
    const groqClient = await (async () => {
      // First check if AI features are enabled
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true },
      });

      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const enabledSetting = await prisma.setting.findUnique({
        where: {
          restaurantId_key: {
            restaurantId: restaurant.id,
            key: 'enableAiFeatures',
          },
        },
      });

      const enabled = enabledSetting?.value ? JSON.parse(enabledSetting.value) : false;
      if (!enabled) {
        throw new Error('AI features not enabled for this restaurant');
      }

      const apiKeySetting = await prisma.setting.findUnique({
        where: {
          restaurantId_key: {
            restaurantId: restaurant.id,
            key: 'groqApiKey',
          },
        },
      });

      const apiKey = apiKeySetting?.value ? JSON.parse(apiKeySetting.value) : process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('AI service not configured. Please add your Groq API key in Settings.');
      }

      const Groq = (await import('groq-sdk')).default;
      return new Groq({ apiKey });
    })();

    if (!groqClient) {
      throw new Error('Failed to initialize AI service');
    }

    const message = await groqClient.chat.completions.create({
      model: DEFAULT_MODEL,
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
    
    const suggestionsData = JSON.parse(cleanJson);

    // Map suggestions to full menu items
    const suggestions = await Promise.all(
      suggestionsData.suggestions.map(async (sugg: { itemName: string; reason: string; confidence: number }) => {
        const menuItem = allMenuItems.find(
          item => item.name.toLowerCase() === sugg.itemName.toLowerCase()
        );
        
        if (!menuItem) return null;
        
        return {
          menuItem,
          reason: sugg.reason,
          confidence: sugg.confidence,
        };
      })
    );

    return {
      suggestions: suggestions.filter((s): s is { menuItem: typeof allMenuItems[number]; reason: string; confidence: number } => s !== null),
    };
  } catch (error) {
    console.error('Upsell generation error:', error);
    // Return empty suggestions on error
    return { suggestions: [] };
  }
}

// ============= SMART TABLE OPTIMIZATION =============

/**
 * Optimize table assignments for bookings
 * 
 * @param bookings - Array of bookings to assign
 * @param tables - Available tables
 * @returns Optimized table assignments
 */
export async function optimizeTables(
  bookings: Array<Booking & { guests: number; time: string }>,
  tables: Table[]
): Promise<TableOptimizationResponse> {
  try {
    // Build prompt for Claude
    const prompt = `You are an AI assistant for restaurant table management. Optimize table assignments to maximize seating efficiency.

**Bookings:**
${bookings.map((b, i) => 
  `${i + 1}. ${b.guests} guests at ${b.time} (ID: ${b.id})`
).join('\n')}

**Available Tables:**
${tables.map(t => 
  `- Table ${t.number}: ${t.capacity} seats`
).join('\n')}

**Optimization Goals:**
1. Match party size to table capacity (avoid oversized tables for small groups)
2. Leave larger tables available for larger parties
3. Minimize gaps between bookings for same table
4. Maximize utilization rate

**Response Format (JSON only, no markdown):**
{
  "assignments": [
    {
      "bookingId": "booking_id",
      "tableNumber": "table_number",
      "reason": "Brief explanation"
    }
  ],
  "utilizationRate": <0.0-1.0>
}`;

    // Get restaurant ID from bookings
    if (bookings.length === 0) {
      throw new Error('No bookings provided');
    }

    // Extract restaurantId from first booking (all bookings should be from same restaurant)
    const firstBooking = bookings[0] as any;
    const restaurantId = firstBooking.restaurantId || (await (async () => {
      // If restaurantId not in booking object, fetch from database
      const booking = await prisma.booking.findUnique({
        where: { id: firstBooking.id },
        select: { restaurantId: true },
      });
      return booking?.restaurantId;
    })());

    if (!restaurantId) {
      throw new Error('Could not determine restaurant ID');
    }

    // Get Groq client with API key
    const groqClient = await (async () => {
      // First check if AI features are enabled
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true },
      });

      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const enabledSetting = await prisma.setting.findUnique({
        where: {
          restaurantId_key: {
            restaurantId: restaurant.id,
            key: 'enableAiFeatures',
          },
        },
      });

      const enabled = enabledSetting?.value ? JSON.parse(enabledSetting.value) : false;
      if (!enabled) {
        throw new Error('AI features not enabled for this restaurant');
      }

      const apiKeySetting = await prisma.setting.findUnique({
        where: {
          restaurantId_key: {
            restaurantId: restaurant.id,
            key: 'groqApiKey',
          },
        },
      });

      const apiKey = apiKeySetting?.value ? JSON.parse(apiKeySetting.value) : process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('AI service not configured. Please add your Groq API key in Settings.');
      }

      const Groq = (await import('groq-sdk')).default;
      return new Groq({ apiKey });
    })();

    if (!groqClient) {
      throw new Error('Failed to initialize AI service');
    }

    const message = await groqClient.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
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
    
    const optimizationData = JSON.parse(cleanJson);

    // Map table numbers to IDs
    const tableNumberToId = Object.fromEntries(
      tables.map(t => [t.number, t.id])
    );

    return {
      assignments: optimizationData.assignments.map((a: { bookingId: string; tableNumber: string; reason: string }) => ({
        bookingId: a.bookingId,
        tableId: tableNumberToId[a.tableNumber] || '',
        tableName: a.tableNumber,
        reason: a.reason,
      })),
      utilizationRate: optimizationData.utilizationRate,
    };
  } catch (error) {
    console.error('Table optimization error:', error);
    throw new Error('Failed to optimize table assignments');
  }
}

// ============= BOOKING CHATBOT =============

/**
 * Handle chatbot conversation for bookings
 * 
 * @param messages - Conversation history
 * @param restaurantId - Restaurant ID
 * @returns Chatbot response
 */
export async function chatbotConversation(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  restaurantId: string
): Promise<ChatbotResponse> {
  try {
    // Get restaurant info for context
    const restaurant = await prisma.restaurant.findFirst({
      select: {
        id: true,
        name: true,
        operatingHours: true,
        bookingDepositAmount: true,
        address: true,
        phone: true,
        email: true,
      },
    });

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Use the found restaurant's ID for subsequent queries
    restaurantId = restaurant.id;

    // Get menu items for context
    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId,
        isAvailable: true,
      },
      include: {
        category: true,
      },
      orderBy: {
        category: {
          sortOrder: 'asc',
        },
      },
      take: 50, // Limit to prevent token overflow
    });

    // Group menu by category
    const menuByCategory = menuItems.reduce((acc, item) => {
      const categoryName = item.category.name;
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push({
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description,
        isVegetarian: item.isVegetarian,
        isVegan: item.isVegan,
      });
      return acc;
    }, {} as Record<string, Array<{ id: string; name: string; price: number; description: string | null; isVegetarian: boolean; isVegan: boolean }>>);

    // Build system prompt
    const systemPrompt = `You are a friendly assistant for ${restaurant.name}. You can help with:
1. **Table Bookings** - Your primary function
2. **Menu Questions** - Answer questions about our menu
3. **General Information** - Restaurant hours, location, contact

**Restaurant Information:**
- Name: ${restaurant.name}
- Address: ${restaurant.address}
- Phone: ${restaurant.phone}
- Email: ${restaurant.email}

**Operating Hours:**
${JSON.stringify(restaurant.operatingHours, null, 2)}

**Our Menu (with IDs for reference):**
${Object.entries(menuByCategory).map(([category, items]) => `
**${category}:**
${items.slice(0, 10).map(item => `- ID: ${item.id} | ${item.name} - $${item.price}${item.isVegetarian ? ' (V)' : ''}${item.isVegan ? ' (Vegan)' : ''}
  ${item.description || ''}`).join('\n')}
`).join('\n')}

**Guidelines for Booking:**
1. Be warm, conversational, and helpful
2. Collect required information: date, time, number of guests, name, email, phone
3. Confirm availability before finalizing
4. If deposit required ($${restaurant.bookingDepositAmount}), mention it
5. Keep responses brief (2-3 sentences max)
6. Use natural language, not robotic
7. NEVER accept food orders - bookings only
8. If user tries to order food, redirect: "I can only help with table bookings. To order food, please visit our menu page."

**Guidelines for Menu Questions:**
- When user asks about menu, dishes, food, or says "show me" → Set type to "menu_items" and include menuItemIds
- Extract 3-5 relevant menu item IDs from the menu above
- DO NOT take orders or add items to cart
- ALWAYS tell users: "To order, please visit our menu page where you can add items to your cart"
- Recommend dishes based on preferences
- Mention dietary options (vegetarian, vegan)
- Suggest popular items
- Answer pricing questions

**Response Format (JSON only, no markdown):**
{
  "message": "Your response to the user",
  "intent": "booking|menu_inquiry|general_info|greeting",
  "type": "text|menu_items|booking_success|quick_replies",
  "requiresInput": true/false,
  "extractedData": {
    "date": "YYYY-MM-DD or null",
    "time": "HH:mm or null",
    "guests": <number or null>,
    "name": "string or null",
    "email": "string or null",
    "phone": "string or null"
  },
  "readyToBook": true/false,
  "data": {
    "menuItemIds": [/* REQUIRED when type is menu_items: array of item IDs from menu above, e.g. ["id1", "id2", "id3"] */],
    "quickReplies": [/* suggested quick reply buttons */]
  }
}

**CRITICAL: When showing menu items:**
- Set "type": "menu_items"
- Include "menuItemIds": ["actual-id-1", "actual-id-2"] in data object
- Use real menu item IDs from the menu list above`;

    // Get Groq client with settings-based API key
    const groqClient = await (async () => {
      const apiKeySetting = await prisma.setting.findUnique({
        where: {
          restaurantId_key: {
            restaurantId: restaurantId,
            key: 'groqApiKey',
          },
        },
      });

      const enabledSetting = await prisma.setting.findUnique({
        where: {
          restaurantId_key: {
            restaurantId: restaurantId,
            key: 'enableAiFeatures',
          },
        },
      });

      const enabled = enabledSetting?.value ? JSON.parse(enabledSetting.value) : false;
      if (!enabled) {
        throw new Error('AI features not enabled for this restaurant');
      }

      const apiKey = apiKeySetting?.value ? JSON.parse(apiKeySetting.value) : process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('AI service not configured');
      }

      const Groq = (await import('groq-sdk')).default;
      return new Groq({ apiKey });
    })();

    // Format messages for Groq API
    const formattedMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const message = await groqClient.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...formattedMessages,
      ],
    });

    const responseText = message.choices?.[0]?.message?.content || '';
    
    const cleanJson = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const botData = JSON.parse(cleanJson);

    // If ready to book, create the booking
    let bookingId: string | undefined;
    let bookingCreated = false;

    if (botData.readyToBook && botData.extractedData) {
      const { date, time, guests, name, email, phone } = botData.extractedData;
      
      if (date && time && guests && name && email) {
        try {
          // Check if time slot is available
          const bookingDate = new Date(date);
          const existingBookings = await prisma.booking.findMany({
            where: {
              restaurantId,
              date: bookingDate,
              time,
              status: {
                in: ['PENDING', 'CONFIRMED']
              }
            },
            include: {
              table: true
            }
          });

          // Get total available capacity
          const allTables = await prisma.table.findMany({
            where: {
              restaurantId,
              isActive: true
            }
          });

          const totalCapacity = allTables.reduce((sum, t) => sum + t.capacity, 0);
          const bookedCapacity = existingBookings.reduce((sum, b) => sum + b.guests, 0);
          const availableCapacity = totalCapacity - bookedCapacity;

          // Check if enough capacity
          if (parseInt(guests) > availableCapacity) {
            return {
              message: `I'm sorry, we don't have enough capacity for ${guests} guests at ${time} on ${date}. Would you like to try a different time?`,
              intent: 'booking',
              requiresInput: true,
              bookingCreated: false,
            };
          }
          // Check if customer exists
          let customer = await prisma.customer.findFirst({
            where: { email, restaurantId },
          });

          // Create customer if doesn't exist
          if (!customer) {
            customer = await prisma.customer.create({
              data: {
                email,
                name,
                phone: phone || undefined,
                restaurantId,
                isGuest: true,
              },
            });
          }

          // Create booking
          const booking = await prisma.booking.create({
            data: {
              bookingNumber: `BKG-${Date.now()}`,
              customerId: customer.id,
              restaurantId,
              date: new Date(date),
              time,
              guests: parseInt(guests),
              status: restaurant.bookingDepositAmount > 0 ? 'PENDING' : 'CONFIRMED',
              specialRequests: messages[messages.length - 1]?.content || undefined,
            },
          });

          bookingId = booking.id;
          bookingCreated = true;
        } catch (error) {
          console.error('Booking creation error:', error);
        }
      }
    }

    // Prepare response data
    const responseData: ChatbotResponse = {
      message: botData.message,
      intent: botData.intent,
      requiresInput: botData.requiresInput,
      bookingCreated,
      bookingId,
      type: botData.type || 'text',
      data: {},
    };

    // If menu inquiry, fetch and include menu items
    if ((botData.type === 'menu_items' || botData.intent === 'menu_inquiry') && botData.data?.menuItemIds && Array.isArray(botData.data.menuItemIds) && botData.data.menuItemIds.length > 0) {
      console.log('🍽️ Fetching menu items with IDs:', botData.data.menuItemIds);
      
      const fetchedItems = await prisma.menuItem.findMany({
        where: {
          id: { in: botData.data.menuItemIds },
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
        take: 5,
      });

      console.log('✅ Fetched', fetchedItems.length, 'menu items');

      if (fetchedItems.length > 0) {
        responseData.type = 'menu_items';
        responseData.data!.menuItems = fetchedItems;
      }
    }

    // If quick replies suggested
    if (botData.data?.quickReplies) {
      responseData.data!.quickReplies = botData.data.quickReplies;
    }

    // If booking created, include booking details
    if (bookingCreated && bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          bookingNumber: true,
          date: true,
          time: true,
          guests: true,
        },
      });

      if (booking) {
        responseData.type = 'booking_success';
        responseData.data!.bookingDetails = {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          date: booking.date.toISOString().split('T')[0],
          time: booking.time,
          guests: booking.guests,
        };
      }
    }

    console.log('📤 Chatbot response:', { type: responseData.type, hasMenuItems: !!responseData.data?.menuItems });

    return responseData;
  } catch (error) {
    console.error('Chatbot error:', error);
    return {
      message: "I'm sorry, I'm having trouble processing your request. Could you please try again or speak with our staff?",
      intent: 'general',
      requiresInput: true,
      bookingCreated: false,
    };
  }
}