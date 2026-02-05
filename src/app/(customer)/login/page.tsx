'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/validations/auth';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if email belongs to staff
      const checkStaffResponse = await fetch(`/api/staff?email=${encodeURIComponent(data.email)}`);
      const staffData = await checkStaffResponse.json();
      
      if (staffData.success && staffData.data && staffData.data.length > 0) {
        // This is a staff member, redirect to admin login
        setError('Staff accounts must login at the Admin Portal');
        setTimeout(() => {
          router.push(`/admin/login?email=${encodeURIComponent(data.email)}`);
        }, 1500);
        return;
      }
      
      // Regular customer login
      await login(data.email, data.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestCheckout = () => {
    router.push('/menu');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: 'hsl(var(--page-bg))' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white text-center">
              Welcome Back
            </h1>
            <p className="text-primary-100 text-center mt-1 text-sm">
              Sign in to your account
            </p>
          </div>

          <div className="px-8 py-6">
            {error && (
              <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
                <p className="text-sm text-error-600 text-center">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-neutral-700 mb-2"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className={errors.email ? 'border-error-500' : ''}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-error-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-neutral-700"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary-600 hover:text-primary-700 hover:underline transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={errors.password ? 'border-error-500' : ''}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-error-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                    Signing In...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-neutral-500">OR</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-primary-500 text-primary-600 hover:bg-primary-50 font-semibold py-3 rounded-lg transition-all duration-200"
                onClick={handleGuestCheckout}
                disabled={isLoading}
              >
                Continue as Guest
              </Button>
            </form>
          </div>

          <div className="px-8 py-4 bg-neutral-50 border-t border-neutral-200">
            <p className="text-sm text-neutral-600 text-center">
              Don't have an account?{' '}
              <Link
                href="/signup"
                className="text-primary-600 hover:text-primary-700 font-medium hover:underline transition-colors"
              >
                Sign Up
              </Link>
            </p>
            <p className="text-xs text-neutral-500 text-center mt-2">
              Staff member?{' '}
              <Link
                href="/admin/login"
                className="text-primary-600 hover:text-primary-700 font-medium hover:underline transition-colors"
              >
                Login here
              </Link>
            </p>
          </div>
        </div>

        <p className="text-xs text-neutral-500 text-center mt-6">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-neutral-700">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-neutral-700">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}