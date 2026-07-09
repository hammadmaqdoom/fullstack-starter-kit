'use client';

import { useTranslations } from 'next-intl';
import { SetupWizard } from '@/components/setup/SetupWizard';

export default function AdminSetupPage() {
  const t = useTranslations('SetupWizard');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>
      <SetupWizard />
    </div>
  );
}
