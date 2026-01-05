/**
 * Reset Password Form Component
 * 
 * Allows users to reset their password using a token from email.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/validations/auth.validation';
import { usePasswordReset } from '@/libs/hooks';
import Link from 'next/link';

interface ResetPasswordFormProps {
  locale: string;
  token?: string;
}

export function ResetPasswordForm({ locale, token }: ResetPasswordFormProps) {
  const router = useRouter();
  
  const { resetPassword, isLoading, error: resetError } = usePasswordReset();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || undefined,
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError(null);

    if (!token && !data.token) {
      setError('Invalid or missing reset token');
      return;
    }

    try {
      const { confirmPassword, ...resetData } = data;
      await resetPassword({
        ...resetData,
        token: token || data.token,
      });
      setSuccess(true);
      
      // Redirect to sign in after 2 seconds
      setTimeout(() => {
        router.push(`/${locale}/sign-in`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    }
  };

  const displayError = error || resetError?.message;

  if (success) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-green-600">
            Password reset successful!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Redirecting you to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your new password below.
        </p>
      </div>
      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {displayError && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{displayError}</p>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="sr-only">
              New Password
            </label>
            <input
              {...register('newPassword')}
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className="relative block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="New password"
            />
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="sr-only">
              Confirm Password
            </label>
            <input
              {...register('confirmPassword')}
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="relative block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Confirm password"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {isLoading ? 'Resetting...' : 'Reset password'}
          </button>
        </div>

        <div className="text-center text-sm">
          <Link
            href={`/${locale}/sign-in`}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

