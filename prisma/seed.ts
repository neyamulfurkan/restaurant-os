import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'my-restaurant' },
    update: {},
    create: {
      name: 'My Restaurant',
      slug: 'my-restaurant',
      email: 'info@myrestaurant.com',
      phone: '+1234567890',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      description: 'A wonderful restaurant',
      timezone: 'America/New_York',
      currency: 'USD',
      primaryColor: '#0ea5e9',
      secondaryColor: '#f5f5f5',
      accentColor: '#ef4444',
      pageBgColor: '#f5f5f5',
      bodyColor: '#ffffff',
      bodyTextColor: '#171717',
      footerBgColor: '#171717',
      footerTextColor: '#fafafa',
      fontFamily: 'Inter',
      taxRate: 8.5,
      serviceFee: 2.0,
      minOrderValue: 10.0,
      enableDineIn: true,
      enablePickup: true,
      enableDelivery: true,
      enableGuestCheckout: true,
      autoConfirmBookings: false,
      bookingDepositAmount: 0,
      isActive: true,
    },
  });

  console.log('✅ Restaurant created:', restaurant.name);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.staff.upsert({
    where: { email: 'admin@myrestaurant.com' },
    update: {},
    create: {
      email: 'admin@myrestaurant.com',
      name: 'Admin User',
      phone: '+1234567890',
      role: 'ADMIN',
      passwordHash: hashedPassword,
      isActive: true,
      restaurantId: restaurant.id,
    },
  });

  console.log('✅ Admin user created:', admin.email);
  console.log('   Password: admin123');

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });