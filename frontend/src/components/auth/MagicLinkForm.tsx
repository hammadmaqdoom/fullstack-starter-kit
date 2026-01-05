/**
 * Magic Link Authentication Form Component
 * 
 * Allows users to sign in using a magic link sent to their email.
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInMagicLinkSchema, type SignInMagicLinkFormData } from '@/validations/auth.validation';
import { useMagicLink } from '@/libs/hooks';
import Link from 'next/link';

interface MagicLinkFormProps {
  locale: string;
}

export function MagicLinkForm({ locale }: MagicLinkFormProps) {
  const { sendMagicLink, isLoading, error: magicLinkError, emailSent } = useMagicLink();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInMagicLinkFormData>({
    resolver: zodResolver(signInMagicLinkSchema),
  });

  const onSubmit = async (data: SignInMagicLinkFormData) => {
    setError(null);

    try {
      await sendMagicLink({
        ...data,
        callbackURL: `/${locale}/dashboard`,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
    }
  };

  const displayError = error || magicLinkError?.message;

  if (emailSent) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
            Check your email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent you a magic link. Click the link in your email to sign in.
          </p>
        </div>
        <div className="text-center">
          <Link
            href={`/${locale}/sign-in`}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
          Sign in with Magic Link
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email and we'll send you a magic link to sign in.
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
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              {...register('email')}
              id="email"
              type="email"
              autoComplete="email"
              className="relative block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Email address"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="name" className="sr-only">
              Name (optional)
            </label>
            <input
              {...register('name')}
              id="name"
              type="text"
              autoComplete="name"
              className="relative block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Name (optional, for new users)"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send magic link'}
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

