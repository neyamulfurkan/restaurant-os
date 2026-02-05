// src/app/api/settings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { settingsSchema } from '@/validations/settings';
import { z } from 'zod';

/**
 * GET /api/settings
 * Fetch all restaurant settings
 */
export async function GET(_request: NextRequest) {
  try {
    await prisma.$connect();

    const restaurant = await prisma.restaurant.findFirst({
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        logoUrl: true,
        heroImageUrl: true,
        heroMediaType: true,
        heroVideoUrl: true,
        heroImages: true,
        heroSlideshowEnabled: true,
        heroSlideshowInterval: true,
        floorPlanImageUrl: true,
        description: true,
        timezone: true,
        currency: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        pageBgColor: true,
        bodyColor: true,
        bodyTextColor: true,
        footerBgColor: true,
        footerTextColor: true,
        fontFamily: true,
        operatingHours: true,
        taxRate: true,
        serviceFee: true,
        minOrderValue: true,
        enableDineIn: true,
        enablePickup: true,
        enableDelivery: true,
        enableGuestCheckout: true,
        autoConfirmBookings: true,
        bookingDepositAmount: true,
        galleryImages: true,
        showGalleryOnHome: true,
        galleryCategories: true,
        aboutStory: true,
        aboutMission: true,
        aboutValues: true,
        aboutStoryImage: true,
        aboutMissionImage: true,
        aboutValuesImage: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Get additional settings from Setting model
    const additionalSettings = await prisma.setting.findMany({
      where: {
        restaurantId: restaurant.id,
      },
    });

    // Convert settings array to object
    const settingsObject = additionalSettings.reduce((acc, setting) => {
      try {
        acc[setting.key] = JSON.parse(setting.value);
      } catch {
        acc[setting.key] = setting.value;
      }
      return acc;
    }, {} as Record<string, unknown>);

    // Merge restaurant data with custom settings
    // IMPORTANT: Hero fields come from Restaurant table ONLY
    const allSettings = {
      ...restaurant,
      restaurantName: restaurant.name,
      // Custom settings (NOT in Restaurant table)
      floorPlanImageUrl: settingsObject.floorPlanImageUrl || null,
      headerBgColor: settingsObject.headerBgColor || '#ffffff',
      headerTextColor: settingsObject.headerTextColor || '#171717',
      headerTransparentOverMedia: settingsObject.headerTransparentOverMedia || false,
      groqApiKey: settingsObject.groqApiKey || null,
      enableAiFeatures: settingsObject.enableAiFeatures || false,
    };

    return NextResponse.json(
      {
        success: true,
        data: allSettings,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch settings',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Update restaurant settings
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Admin role verification
    const staff = await prisma.staff.findUnique({
      where: { email: session.user.email || '' },
      select: { role: true, restaurantId: true },
    });

    if (!staff || staff.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validated = settingsSchema.parse(body);
    
    // Get current restaurant data
    const restaurant = await prisma.restaurant.findFirst({
      where: { id: staff.restaurantId },
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Build update data object - Direct approach without filtering
    const updateData: any = {};

    // Basic Information
    if (validated.restaurantName !== undefined) updateData.name = validated.restaurantName;
    if (validated.name !== undefined && !validated.restaurantName) updateData.name = validated.name;
    if (validated.email !== undefined) updateData.email = validated.email;
    if (validated.phone !== undefined) updateData.phone = validated.phone;
    if (validated.address !== undefined) updateData.address = validated.address;
    if (validated.city !== undefined) updateData.city = validated.city;
    if (validated.state !== undefined) updateData.state = validated.state;
    if (validated.zipCode !== undefined) updateData.zipCode = validated.zipCode;
    if (validated.country !== undefined) updateData.country = validated.country;
    if (validated.logoUrl !== undefined) updateData.logoUrl = validated.logoUrl;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.timezone !== undefined) updateData.timezone = validated.timezone;
    if (validated.currency !== undefined) updateData.currency = validated.currency;

    // Colors & Branding
    if (validated.primaryColor !== undefined) updateData.primaryColor = validated.primaryColor;
    if (validated.secondaryColor !== undefined) updateData.secondaryColor = validated.secondaryColor;
    if (validated.accentColor !== undefined) updateData.accentColor = validated.accentColor;
    if (validated.pageBgColor !== undefined) updateData.pageBgColor = validated.pageBgColor;
    if (validated.bodyColor !== undefined) updateData.bodyColor = validated.bodyColor;
    if (validated.bodyTextColor !== undefined) updateData.bodyTextColor = validated.bodyTextColor;
    if (validated.footerBgColor !== undefined) updateData.footerBgColor = validated.footerBgColor;
    if (validated.footerTextColor !== undefined) updateData.footerTextColor = validated.footerTextColor;
    if (validated.fontFamily !== undefined) updateData.fontFamily = validated.fontFamily;

    // Operating Settings
    if (validated.operatingHours !== undefined) updateData.operatingHours = validated.operatingHours;
    if (validated.taxRate !== undefined) updateData.taxRate = validated.taxRate;
    if (validated.serviceFee !== undefined) updateData.serviceFee = validated.serviceFee;
    if (validated.minOrderValue !== undefined) updateData.minOrderValue = validated.minOrderValue;
    if (validated.enableDineIn !== undefined) updateData.enableDineIn = validated.enableDineIn;
    if (validated.enablePickup !== undefined) updateData.enablePickup = validated.enablePickup;
    if (validated.enableDelivery !== undefined) updateData.enableDelivery = validated.enableDelivery;
    if (validated.enableGuestCheckout !== undefined) updateData.enableGuestCheckout = validated.enableGuestCheckout;
    if (validated.autoConfirmBookings !== undefined) updateData.autoConfirmBookings = validated.autoConfirmBookings;
    if (validated.bookingDepositAmount !== undefined) updateData.bookingDepositAmount = validated.bookingDepositAmount;

    // Gallery & About
    if (validated.galleryImages !== undefined) updateData.galleryImages = validated.galleryImages;
    if (validated.showGalleryOnHome !== undefined) updateData.showGalleryOnHome = validated.showGalleryOnHome;
    if (validated.galleryCategories !== undefined) updateData.galleryCategories = validated.galleryCategories;
    if (validated.aboutStory !== undefined) updateData.aboutStory = validated.aboutStory;
    if (validated.aboutMission !== undefined) updateData.aboutMission = validated.aboutMission;
    if (validated.aboutValues !== undefined) updateData.aboutValues = validated.aboutValues;
    if (validated.aboutStoryImage !== undefined) updateData.aboutStoryImage = validated.aboutStoryImage;
    if (validated.aboutMissionImage !== undefined) updateData.aboutMissionImage = validated.aboutMissionImage;
    if (validated.aboutValuesImage !== undefined) updateData.aboutValuesImage = validated.aboutValuesImage;

    // HERO SECTION - Critical fix: Handle explicitly based on media type
    if (validated.heroMediaType !== undefined) {
      updateData.heroMediaType = validated.heroMediaType;
      updateData.heroSlideshowEnabled = (validated.heroMediaType === 'slideshow');

      // Clear unused fields and set active ones based on media type
      if (validated.heroMediaType === 'image') {
        updateData.heroImageUrl = validated.heroImageUrl || null;
        updateData.heroVideoUrl = null;
        updateData.heroImages = [];
        updateData.heroSlideshowInterval = 5000;
      } else if (validated.heroMediaType === 'video') {
        updateData.heroVideoUrl = validated.heroVideoUrl || null;
        updateData.heroImageUrl = null;
        updateData.heroImages = [];
        updateData.heroSlideshowInterval = 5000;
      } else if (validated.heroMediaType === 'slideshow') {
        updateData.heroImages = validated.heroImages || [];
        updateData.heroSlideshowInterval = validated.heroSlideshowInterval || 5000;
        updateData.heroImageUrl = null;
        updateData.heroVideoUrl = null;
      }
    }

    // Perform database update
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        logoUrl: true,
        heroImageUrl: true,
        heroMediaType: true,
        heroVideoUrl: true,
        heroImages: true,
        heroSlideshowEnabled: true,
        heroSlideshowInterval: true,
        floorPlanImageUrl: true,
        description: true,
        timezone: true,
        currency: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        pageBgColor: true,
        bodyColor: true,
        bodyTextColor: true,
        footerBgColor: true,
        footerTextColor: true,
        fontFamily: true,
        operatingHours: true,
        taxRate: true,
        serviceFee: true,
        minOrderValue: true,
        enableDineIn: true,
        enablePickup: true,
        enableDelivery: true,
        enableGuestCheckout: true,
        autoConfirmBookings: true,
        bookingDepositAmount: true,
        galleryImages: true,
        showGalleryOnHome: true,
        galleryCategories: true,
        aboutStory: true,
        aboutMission: true,
        aboutValues: true,
        aboutStoryImage: true,
        aboutMissionImage: true,
        aboutValuesImage: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Handle custom settings (stored in Setting table)
    const customSettingsKeys = [
      'headerBgColor',
      'headerTextColor', 
      'headerTransparentOverMedia',
      'floorPlanImageUrl',
      'groqApiKey',
      'enableAiFeatures'
    ];
    
    for (const key of customSettingsKeys) {
      if (body[key] !== undefined) {
        await prisma.setting.upsert({
          where: {
            restaurantId_key: {
              restaurantId: restaurant.id,
              key,
            },
          },
          create: {
            restaurantId: restaurant.id,
            key,
            value: JSON.stringify(body[key]),
          },
          update: {
            value: JSON.stringify(body[key]),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedRestaurant,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
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

    console.error('Settings POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update settings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * Handle contact form submission
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!body.email || !body.email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (!body.subject || body.subject.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!body.message || body.message.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Message must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Send notification
    const { sendContactFormNotification } = await import('@/services/notificationService');

    const result = await sendContactFormNotification({
      name: body.name,
      email: body.email,
      phone: body.phone,
      subject: body.subject,
      message: body.message,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send message');
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully! We'll get back to you soon.",
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      },
      { status: 500 }
    );
  }
}