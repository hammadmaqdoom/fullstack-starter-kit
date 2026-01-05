/**
 * Change Password Form Component
 * 
 * Allows authenticated users to change their password.
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordFormData } from '@/validations/auth.validation';
import { usePasswordReset } from '@/libs/hooks';

export function ChangePasswordForm() {
  const { changePassword, isLoading, error: changeError } = usePasswordReset();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      revokeOtherSessions: false,
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  const onSubmit = async (data: ChangePasswordFormData) => {
    setError(null);
    setSuccess(false);

    try {
      const { confirmPassword, ...changeData } = data;
      await changePassword(changeData);
      setSuccess(true);
      reset();
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    }
  };

  const displayError = error || changeError?.message;

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="text-lg font-semibold">Change Password</h3>
      <p className="mt-2 text-sm text-gray-600">
        Update your password to keep your account secure.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">Password changed successfully!</p>
          </div>
        )}

        {displayError && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{displayError}</p>
          </div>
        )}

        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
            Current Password
          </label>
          <input
            {...register('currentPassword')}
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.currentPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <input
            {...register('newPassword')}
            id="newPassword"
            type="password"
            autoComplete="new-password"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.newPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <input
            {...register('confirmPassword')}
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="flex items-center">
          <input
            {...register('revokeOtherSessions')}
            id="revokeOtherSessions"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
          />
          <label htmlFor="revokeOtherSessions" className="ml-2 block text-sm text-gray-900">
            Sign out from all other devices
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}

