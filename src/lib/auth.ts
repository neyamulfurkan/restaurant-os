// src/lib/auth.ts

import type { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { StaffRole } from '@prisma/client';


// Extend NextAuth types
declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    role?: StaffRole;
    restaurantId?: string;
    phone?: string;
    image?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role?: StaffRole;
      restaurantId?: string;
      phone?: string;
      image?: string;
      isAdmin?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role?: StaffRole;
    restaurantId?: string;
    image?: string;
  }
}

// Session cache
const sessionCache = new Map<string, { data: any; timestamp: number }>();
const SESSION_CACHE_TTL = 60000; // 1 minute

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update every 24 hours instead of every request
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      id: 'customer-login',
      name: 'Customer Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const customer = await prisma.customer.findUnique({
          where: { email: credentials.email as string },
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        });

        if (!customer || !customer.passwordHash) {
          throw new Error('Invalid email or password');
        }

        if (!customer.restaurant.isActive) {
          throw new Error('Restaurant is currently inactive');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          customer.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          restaurantId: customer.restaurantId,
        };
      },
    }),
    CredentialsProvider({
      id: 'admin-login',
      name: 'Admin Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const staff = await prisma.staff.findUnique({
          where: { email: credentials.email as string },
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        });

        if (!staff || !staff.isActive) {
          throw new Error('Invalid email or password');
        }

        if (!staff.restaurant.isActive) {
          throw new Error('Restaurant is currently inactive');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          staff.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        // Update last login
        await prisma.staff.update({
          where: { id: staff.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: staff.id,
          email: staff.email,
          name: staff.name,
          role: staff.role,
          restaurantId: staff.restaurantId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.restaurantId = user.restaurantId;
      }

      // Handle session update from client
      if (trigger === 'update' && session) {
        if (session.name) {
          token.name = session.name;
        }
        if (session.email) {
          token.email = session.email;
        }
      }

      return token;
    },
    async session({ session, token }) {
      const cacheKey = `session_${token.id}`;
      const cached = sessionCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < SESSION_CACHE_TTL) {
        return cached.data;
      }

      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as StaffRole;
        session.user.restaurantId = token.restaurantId as string;
        session.user.isAdmin = token.role === StaffRole.ADMIN;
        session.user.image = token.image as string;
      }

      sessionCache.set(cacheKey, { data: session, timestamp: Date.now() });

      if (process.env.NODE_ENV === 'development') {
        console.log('📤 Session callback: Returning session with user:', session.user);
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      // Cleanup logic if needed
      if (token?.id && token?.role) {
        // Could log admin logout events here
        console.log(`User ${token.id} signed out`);
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
};