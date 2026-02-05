# RestaurantOS - Complete Restaurant Management Platform

A comprehensive, self-hosted restaurant management platform with QR ordering, table booking, admin dashboard, and AI-powered features.

## 🚀 Features

### Customer-Facing
- **QR Code Ordering** - Contactless menu browsing and ordering
- **Table Booking System** - Real-time availability and instant confirmations
- **Multiple Order Types** - Dine-in, pickup, and delivery
- **Real-Time Order Tracking** - Live status updates and delivery tracking
- **Guest Checkout** - No account required for quick orders
- **Mobile-First Design** - Optimized for 70% mobile traffic
- **PWA Support** - Install as native app on any device

### Admin Panel
- **Order Management** - Real-time order processing and status updates
- **Booking Management** - Calendar view, table assignments, automated reminders
- **Menu Management** - Full CRUD with categories, customizations, and inventory
- **Customer Management** - Order history, insights, and GDPR compliance
- **Staff Management** - Role-based access control
- **Reports & Analytics** - Sales, performance, customer insights, tax reports
- **Inventory Tracking** - Stock management with low-stock alerts
- **Settings** - Payment gateways, notifications, branding, integrations

### AI-Powered Features (Claude Sonnet 4.5)
- **Demand Forecasting** - Predict orders and optimize prep quantities
- **Personalized Upselling** - Smart product recommendations
- **Table Optimization** - AI-suggested table assignments
- **Booking Chatbot** - Natural language booking assistant
- **Menu Recommendations** - Time/weather-based suggestions

### Payment & Notifications
- **Multiple Payment Methods** - Stripe, PayPal, Apple Pay, Google Pay, Cash
- **SMS Notifications** - Order updates via Twilio
- **Email Notifications** - Confirmations and reminders via SendGrid
- **Webhook Support** - Payment confirmation handling

## 🛠 Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Next.js API Routes (serverless)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **Real-Time**: Supabase Realtime
- **State Management**: Zustand, TanStack Query
- **Forms**: React Hook Form + Zod
- **AI**: Anthropic Claude API
- **Payments**: Stripe, PayPal
- **Storage**: Supabase Storage
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Supabase account)
- Vercel account (for deployment)
- API keys for integrations (see Environment Variables)

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd restaurant-os

# Install dependencies
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-key"

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxx"
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"

# PayPal
NEXT_PUBLIC_PAYPAL_CLIENT_ID="xxx"
PAYPAL_CLIENT_SECRET="xxx"

# Anthropic (Claude AI)
ANTHROPIC_API_KEY="sk-ant-xxx"

# Twilio (SMS)
TWILIO_ACCOUNT_SID="ACxxx"
TWILIO_AUTH_TOKEN="xxx"
TWILIO_PHONE_NUMBER="+1234567890"

# SendGrid (Email)
SENDGRID_API_KEY="SG.xxx"
SENDGRID_FROM_EMAIL="noreply@restaurant.com"

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaxxx"

# App Config
NEXT_PUBLIC_APP_NAME="RestaurantOS"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed initial data (optional)
npx prisma db seed
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your application.

### 5. Default Admin Login

After seeding, use these credentials:
- **Email**: admin@restaurant.com
- **Password**: admin123

**⚠️ Change these immediately in production!**

## 🔑 Environment Variables Guide

### Required Variables

#### Database
- `DATABASE_URL` - PostgreSQL connection string
  - Get from: Supabase project settings → Database → Connection string
  - Format: `postgresql://user:password@host:5432/database`

#### Authentication
- `NEXTAUTH_URL` - Your application URL
  - Development: `http://localhost:3000`
  - Production: `https://yourdomain.com`
- `NEXTAUTH_SECRET` - Random secret for session encryption
  - Generate: `openssl rand -base64 32`

#### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
  - Get from: Supabase project settings → API

#### Stripe (Payment)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Public key
- `STRIPE_SECRET_KEY` - Secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
  - Get from: https://dashboard.stripe.com/apikeys
  - Webhook: https://dashboard.stripe.com/webhooks

#### PayPal (Payment)
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID` - Client ID
- `PAYPAL_CLIENT_SECRET` - Secret key
  - Get from: https://developer.paypal.com/

#### Anthropic Claude (AI Features)
- `ANTHROPIC_API_KEY` - API key for Claude
  - Get from: https://console.anthropic.com/

#### Twilio (SMS)
- `TWILIO_ACCOUNT_SID` - Account SID
- `TWILIO_AUTH_TOKEN` - Auth token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number
  - Get from: https://console.twilio.com/

#### SendGrid (Email)
- `SENDGRID_API_KEY` - API key
- `SENDGRID_FROM_EMAIL` - Verified sender email
  - Get from: https://app.sendgrid.com/

#### Google Maps (Optional)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Maps API key
  - Get from: https://console.cloud.google.com/

#### App Configuration
- `NEXT_PUBLIC_APP_NAME` - Your restaurant/app name
- `NEXT_PUBLIC_APP_URL` - Your application URL

### Optional Variables

For advanced features, you can add:
- Analytics tracking IDs
- Additional payment gateways
- Third-party integrations

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. **Push to Git Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your Git repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   - In Vercel project settings → Environment Variables
   - Add ALL variables from your `.env.local`
   - Make sure to update `NEXTAUTH_URL` to your production domain

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Future pushes to main branch auto-deploy

5. **Set Up Webhooks**
   - **Stripe**: Add webhook URL `https://yourdomain.com/api/payments/stripe/webhook`
   - **PayPal**: Configure IPN/webhook in PayPal dashboard

6. **Configure Custom Domain**
   - In Vercel project → Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

### Database Production Setup

If using Supabase:
1. Create production project at https://supabase.com
2. Copy connection string to `DATABASE_URL`
3. Run migrations: `npx prisma migrate deploy`
4. Configure Row Level Security (optional)

### Post-Deployment Checklist

- [ ] Test all pages load correctly
- [ ] Verify admin login works
- [ ] Test order flow end-to-end
- [ ] Test booking flow
- [ ] Test payment processing (small amount)
- [ ] Verify webhooks are receiving events
- [ ] Test email notifications
- [ ] Test SMS notifications
- [ ] Check all API routes return correctly
- [ ] Verify PWA installs on mobile
- [ ] Test real-time updates work

## 🎨 White-Label Customization (For Resellers)

### 1. Change App Name

**Method 1: Environment Variable**
```env
NEXT_PUBLIC_APP_NAME="Your Restaurant Name"
```

**Method 2: Admin Settings**
- Login to admin panel
- Go to Settings → General
- Update restaurant name

### 2. Upload Custom Logo

1. Login to admin panel
2. Go to Settings → Branding
3. Upload your logo (recommended: SVG or PNG, max 500KB)
4. Logo appears in header automatically

### 3. Customize Colors

1. Login to admin panel
2. Go to Settings → Branding
3. Use color pickers to set:
   - Primary Color (main brand color)
   - Secondary Color
   - Accent Color (highlights, CTAs)
4. Changes apply immediately to customer interface

### 4. Customize Fonts

1. Go to Settings → Branding
2. Select from Google Fonts dropdown
3. Preview updates in real-time

### 5. Update Content

**Landing Page Hero**
- Edit `src/app/page.tsx`
- Update hero text and tagline

**Footer Links**
- Go to Settings → General
- Update contact info, address, social media links

### 6. Configure Payment Gateways

1. Go to Settings → Payment Settings
2. Toggle payment methods on/off
3. Enter API keys for Stripe/PayPal
4. Set tax rate and service fees

### 7. Set Operating Hours

1. Go to Settings → General
2. Click "Operating Hours"
3. Set hours for each day
4. Define closed days

### 8. Configure Delivery Zones

1. Go to Settings → Ordering Settings
2. Click "Delivery Zones"
3. Add zones by:
   - Zip codes (enter comma-separated)
   - Or radius from restaurant
4. Set delivery fee per zone

### 9. Email/SMS Templates

1. Go to Settings → Notifications
2. Customize templates:
   - Order confirmation
   - Booking confirmation
   - Order ready
   - Booking reminder
3. Use variables: `{customerName}`, `{orderNumber}`, `{totalAmount}`

### 10. Deploy to Custom Domain

1. In Vercel project settings
2. Add your client's domain
3. Update DNS records
4. Update `NEXTAUTH_URL` environment variable
5. Redeploy

## 📱 PWA Installation

The app works as a Progressive Web App:

**On Mobile (iOS/Android)**
1. Open in Safari (iOS) or Chrome (Android)
2. Tap share button
3. Select "Add to Home Screen"
4. App installs like native app

**On Desktop**
1. Open in Chrome
2. Click install icon in address bar
3. App installs as desktop application

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Generate Prisma Client
npx prisma generate

# Create database migration
npx prisma migrate dev --name description

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (delete all data)
npx prisma migrate reset

# Seed database
npx prisma db seed
```

## 📊 Database Schema

The application uses PostgreSQL with the following main tables:
- `Restaurant` - Restaurant information and settings
- `Customer` - Customer accounts and profiles
- `MenuItem` - Menu items with categories and customizations
- `Order` - Orders with items and status tracking
- `Booking` - Table reservations
- `Table` - Restaurant tables
- `Staff` - Admin and staff accounts
- `Notification` - Email/SMS queue
- `DemandForecast` - AI forecast data
- `ChatbotConversation` - Chatbot sessions

See `prisma/schema.prisma` for complete schema.

## 🔐 Security

- All passwords hashed with bcrypt
- CSRF protection via NextAuth
- XSS prevention via input sanitization
- SQL injection prevented by Prisma
- API rate limiting
- Environment variables for secrets
- Webhook signature verification
- HTTPS enforced in production

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Verify connection string
npx prisma db pull

# If fails, check DATABASE_URL format
# Should be: postgresql://user:password@host:5432/database
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma Client
npx prisma generate
```

### Stripe Webhook Not Working
1. Verify webhook endpoint: `https://yourdomain.com/api/payments/stripe/webhook`
2. Check webhook secret matches `STRIPE_WEBHOOK_SECRET`
3. Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/payments/stripe/webhook`

### Real-Time Updates Not Working
1. Verify Supabase credentials
2. Check browser console for WebSocket errors
3. Ensure Realtime is enabled in Supabase dashboard

## 📞 Support

For issues or questions:
1. Check documentation in this README
2. Review code comments in relevant files
3. Check Prisma schema for database structure
4. Review API routes in `src/app/api/`

## 📄 License

This project is provided as-is for commercial use by resellers and restaurant owners.

## 🎯 Roadmap

Potential future features:
- [ ] Loyalty program
- [ ] Gift cards
- [ ] Marketing campaigns
- [ ] Multi-location support
- [ ] Kitchen display system
- [ ] Advanced analytics
- [ ] Social media integration
- [ ] Review management
- [ ] Advanced reporting

## 🙏 Acknowledgments

Built with:
- Next.js and React
- Tailwind CSS and shadcn/ui
- Prisma and Supabase
- Anthropic Claude API
- Stripe and PayPal
- And many other amazing open-source tools

---

**Made with ❤️ for restaurants worldwide**