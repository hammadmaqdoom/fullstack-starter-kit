'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { signInSchema, type SignInFormData } from '@/validations/auth.validation';
import { authClient } from '@/libs/BetterAuth';
import { useRouter } from '@/libs/I18nNavigation';

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      emailOrUsername: '',
      password: '',
      rememberMe: true,
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      setError(null);
      setIsLoading(true);

      // For now, we only support email sign-in
      // Username sign-in requires the usernameClient plugin
      const result = await authClient.signIn.email({
        email: data.emailOrUsername,
        password: data.password,
      });

      if (result.error) {
        setError(result.error.message || 'Sign in failed');
        setIsLoading(false);
        return;
      }

      // Check if we got a token (successful sign-in)
      if (result.data?.token) {
        // Success - use window.location for a full page reload
        // This ensures the session cookie is properly set before the middleware check
        window.location.href = redirectTo;
      } else {
        setError('Sign in failed - no token received');
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="emailOrUsername"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="emailOrUsername"
          type="email"
          {...register('emailOrUsername')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="Enter your email"
        />
        {errors.emailOrUsername && (
          <p className="mt-1 text-sm text-red-600">
            {errors.emailOrUsername.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          {...register('password')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="Enter your password"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
