'use client';

import { Link } from '@/libs/I18nNavigation';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Plus } from 'lucide-react';

export default function PayoutsIndexPage() {
  const t = useTranslations('FinancePayouts');

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Link href="/finance/payouts/generate">
          <Button type="button" icon={<Plus className="size-4" />} label={t('generate')} />
        </Link>
      </div>
      <p className="text-sm text-gray-600">{t('index_hint')}</p>
    </div>
  );
}
