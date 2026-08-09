'use client';

import { useAuth } from '@/libs/hooks/useAuth';
import {
  firstNameFromDisplayName,
  greetingPeriod,
} from '@/libs/employee/home-today.util';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

export function HomeGreeting() {
  const t = useTranslations('EmployeeHome');
  const { data: session } = useAuth();

  const { title, dateLabel } = useMemo(() => {
    const now = new Date();
    const period = greetingPeriod(now);
    const rawName = firstNameFromDisplayName(session?.user?.name);
    const name = rawName || t('greeting_fallback_name');
    const greetingKey
      = period === 'morning'
        ? 'greeting_morning'
        : period === 'afternoon'
          ? 'greeting_afternoon'
          : 'greeting_evening';
    return {
      title: t(greetingKey, { name }),
      dateLabel: new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(now),
    };
  }, [session?.user?.name, t]);

  return (
    <header>
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">{dateLabel}</p>
    </header>
  );
}
