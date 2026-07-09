'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import {
  signInSchema,
  type SignInFormData,
} from '@/validations/auth.validation';
import {
  authClient,
  sendContractorMagicLink,
  signInWithMicrosoft,
} from '@/libs/BetterAuth';

type SignInTab = 'employee' | 'contractor';

export function SignInForm() {
  const t = useTranslations('SignIn');
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const [activeTab, setActiveTab] = useState<SignInTab>('employee');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      emailOrUsername: '',
      password: '',
      rememberMe: true,
    },
  });

  const handleMicrosoftSignIn = async () => {
    try {
      setError(null);
      setInfo(null);
      setIsLoading(true);

      const result = await signInWithMicrosoft(redirectTo);
      if (result.error) {
        setError(result.error.message || t('entra_error'));
        setIsLoading(false);
        return;
      }

      if (result.data?.url) {
        window.location.href = result.data.url;
        return;
      }

      setError(t('entra_error'));
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('entra_error'));
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SignInFormData) => {
    try {
      setError(null);
      setInfo(null);
      setIsLoading(true);

      const result = await authClient.signIn.email({
        email: data.emailOrUsername,
        password: data.password,
      });

      if (result.error) {
        setError(result.error.message || t('contractor_error'));
        setIsLoading(false);
        return;
      }

      if (result.data?.token) {
        window.location.href = redirectTo;
        return;
      }

      setError(t('contractor_error'));
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('contractor_error'));
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    const email = getValues('emailOrUsername');
    if (!email) {
      setError(t('email_required'));
      return;
    }

    try {
      setError(null);
      setInfo(null);
      setIsLoading(true);

      const result = await sendContractorMagicLink(email, redirectTo);
      if (result.error) {
        setError(result.error.message || t('magic_link_error'));
        setIsLoading(false);
        return;
      }

      setInfo(t('magic_link_sent'));
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('magic_link_error'));
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('title')}
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab('employee');
            setError(null);
            setInfo(null);
          }}
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            activeTab === 'employee'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600'
          }`}
        >
          {t('employee_tab')}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('contractor');
            setError(null);
            setInfo(null);
          }}
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            activeTab === 'contractor'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600'
          }`}
        >
          {t('contractor_tab')}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {info && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          {info}
        </div>
      )}

      {activeTab === 'employee' ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('employee_help')}</p>
          <button
            type="button"
            onClick={handleMicrosoftSignIn}
            disabled={isLoading}
            className="w-full rounded-md bg-[#2f2f2f] px-4 py-2 text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? t('signing_in') : t('microsoft_button')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="emailOrUsername"
              className="block text-sm font-medium text-gray-700"
            >
              {t('email_label')}
            </label>
            <input
              id="emailOrUsername"
              type="email"
              {...register('emailOrUsername')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder={t('email_placeholder')}
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
              {t('password_label')}
            </label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder={t('password_placeholder')}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? t('signing_in') : t('contractor_sign_in')}
          </button>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={isLoading}
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('magic_link_button')}
          </button>
        </form>
      )}
    </div>
  );
}
