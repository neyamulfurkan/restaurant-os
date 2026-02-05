'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useRouter } from 'next/navigation';

// Validation schema
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().or(z.literal('')),
  profileImage: z.string().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, isLoading: authLoading, requireAuth } = useAuth();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [updateError, setUpdateError] = React.useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      profileImage: '',
    },
  });

  const profileImage = watch('profileImage');

  // Require authentication
  React.useEffect(() => {
    if (!authLoading && !user) {
      requireAuth();
    }
  }, [authLoading, user, requireAuth]);

  // Load user data into form
  React.useEffect(() => {
    if (user) {
      // Fetch full user profile data
      const loadProfile = async () => {
        try {
          console.log('📥 Loading profile for user:', user.id);
          const response = await fetch(`/api/customers/${user.id}`);
          if (!response.ok) throw new Error('Failed to load profile');
          
          const result = await response.json();
          console.log('📥 Profile data received:', result);
          
          const data = result.data || result;
          
          console.log('Setting form values:', {
            name: data.name,
            email: data.email,
            phone: data.phone,
            profileImage: data.profileImage
          });
          
          setValue('name', data.name || '', { shouldDirty: false });
          setValue('email', data.email || '', { shouldDirty: false });
          setValue('phone', data.phone || '', { shouldDirty: false });
          setValue('profileImage', data.profileImage || '', { shouldDirty: false });
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      };

      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onSubmit = async (data: ProfileFormData) => {
    console.log('✅ onSubmit called with data:', data);
    
    if (!user) {
      console.log('❌ No user, returning');
      return;
    }

    console.log('👤 User ID:', user.id);
    
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        profileImage: data.profileImage || null,
      };
      
      console.log('📤 Sending PATCH request with payload:', payload);
      
      const response = await fetch(`/api/customers/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Response status:', response.status, response.statusText);
      
      const responseData = await response.json();
      console.log('📥 Response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update profile');
      }

      console.log('✅ Update successful!');
      setUpdateSuccess(true);

      // Dispatch custom event to notify Header and Sidebar
      window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: {
          profileImage: responseData.data.profileImage,
          name: responseData.data.name,
          email: responseData.data.email,
          phone: responseData.data.phone,
        }
      }));

      // Update form values immediately
      setValue('name', responseData.data.name || '', { shouldDirty: false });
      setValue('email', responseData.data.email || '', { shouldDirty: false });
      setValue('phone', responseData.data.phone || '', { shouldDirty: false });
      setValue('profileImage', responseData.data.profileImage || '', { shouldDirty: false });

      // Hide success message after 2 seconds
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('❌ Update error:', error);
      setUpdateError(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" style={{ minHeight: '100vh' }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Profile Settings</h1>
        <p className="mt-2 text-neutral-600">
          Manage your personal information and preferences
        </p>
      </div>

      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(onSubmit)(e);
        }} 
        className="space-y-6"
      >
        {/* Profile Image */}
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            Profile Picture
          </label>
          <ImageUpload
            currentImage={profileImage || null}
            onUpload={(url) => setValue('profileImage', url, { shouldDirty: true })}
            onRemove={() => setValue('profileImage', '', { shouldDirty: true })}
            bucket="images"
            folder="profiles"
            maxSizeMB={2}
            acceptedFormats={['image/jpeg', 'image/png', 'image/webp']}
            disabled={isUpdating}
          />
        </div>

        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-neutral-700"
          >
            Full Name
          </label>
          <Input
            id="name"
            type="text"
            placeholder="Enter your full name"
            {...register('name')}
            disabled={isUpdating}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-neutral-700"
          >
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            {...register('email')}
            disabled={isUpdating}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="mb-2 block text-sm font-medium text-neutral-700"
          >
            Phone Number <span className="text-neutral-400">(Optional)</span>
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1234567890"
            {...register('phone')}
            disabled={isUpdating}
            className={errors.phone ? 'border-destructive' : ''}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {errors.phone.message}
            </p>
          )}
          <p className="mt-1 text-xs text-neutral-500">
            Include country code (e.g., +1 for US)
          </p>
        </div>

        {/* Error Message */}
        {updateError && (
          <div
            className="rounded-lg border border-destructive bg-destructive/10 p-4"
            role="alert"
          >
            <p className="text-sm text-destructive">{updateError}</p>
          </div>
        )}

        {/* Success Message */}
        {updateSuccess && (
          <div
            className="rounded-lg border border-green-500 bg-green-50 p-4"
            role="alert"
          >
            <p className="text-sm text-green-700">
              Profile updated successfully!
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4 border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isUpdating || !isDirty}
            className="min-w-32"
            onClick={(e) => {
              e.preventDefault();
              console.log('Button clicked, calling handleSubmit');
              console.log('Form errors:', errors);
              console.log('Form is dirty:', isDirty);
              handleSubmit(
                (data) => {
                  console.log('✅ Validation passed, calling onSubmit');
                  onSubmit(data);
                },
                (errors) => {
                  console.log('❌ Validation failed:', errors);
                }
              )();
            }}
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}