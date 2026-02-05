import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';

export async function getServerSession(): Promise<Session | null> {
  const { getServerSession } = await import('next-auth');
  return getServerSession(authOptions);
}

export async function getCurrentSession(): Promise<Session | null> {
  return getServerSession();
}