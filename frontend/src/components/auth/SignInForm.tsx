'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInEmailSchema, type SignInEmailFormData } from '@/validations/auth.validation';
import { useSignIn } from '@/libs/hooks';
import Link from 'next/link';

export function SignInForm({ locale }: { locale: string }) {
  const router = useRouter();
  const { signInWithEmail, isLoading, error: signInError } = useSignIn();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SignInEmailFormData>({
    resolver: zodResolver(signInEmailSchema),
    defaultValues: {
      rememberMe: true,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = async (data: SignInEmailFormData) => {
    setError(null);

    try {
      await signInWithEmail(data);
      // Redirect to dashboard
      const dashboardUrl = locale === 'en' ? '/dashboard' : `/${locale}/dashboard`;
      router.push(dashboardUrl);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    }
  };

  const displayError = error || signInError?.message;

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
          Sign in to your account
        </h2>
      </div>
      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {displayError && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{displayError}</p>
          </div>
        )}
        <div className="space-y-4 rounded-md shadow-sm">
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              {...register('email')}
              id="email"
              type="email"
              autoComplete="email"
              className="relative block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Email address"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              {...register('password')}
              id="password"
              type="password"
              autoComplete="current-password"
              className="relative block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              {...register('rememberMe')}
              id="rememberMe"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <Link
              href={`/${locale}/forgot-password`}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        <div className="text-center text-sm space-y-2">
          <div>
            <span className="text-gray-600">Don't have an account? </span>
            <Link
              href={`/${locale}/sign-up`}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign up
            </Link>
          </div>
          <div>
            <Link
              href={`/${locale}/magic-link`}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign in with magic link
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

