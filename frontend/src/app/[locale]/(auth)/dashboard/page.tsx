'use client';

import { usePolarisShell } from '@/libs/hooks/usePolarisShell';
import { useRouter } from '@/libs/I18nNavigation';
import { useTranslations } from 'next-intl';
import { Skeleton } from 'primereact/skeleton';
import { useEffect } from 'react';

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const { shell, isLoading, error } = usePolarisShell();
  const router = useRouter();

  useEffect(() => {
    if (shell?.homePath) {
      router.replace(shell.homePath);
    }
  }, [shell, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-lg font-semibold text-gray-900">{t('meta_title')}</h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-3 px-4 py-12" aria-busy="true">
      <Skeleton height="2rem" className="mb-2" />
      <Skeleton height="1rem" width="70%" />
      <Skeleton height="8rem" />
    </div>
  );
}
