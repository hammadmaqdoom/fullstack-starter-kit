'use client';

import type { Worker } from '@/libs/api/workers';
import { ApiRequestError } from '@/libs/api/client';
import { getMyWorker } from '@/libs/api/workers';
import {
  anniversaryYears,
  firstNameFromDisplayName,
  isMonthDayMatch,
} from '@/libs/employee/home-today.util';
import { useAuth } from '@/libs/hooks/useAuth';
import { Cake, PartyPopper } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function HomeCelebration() {
  const t = useTranslations('HumanMoments');
  const { data: session } = useAuth();
  const [worker, setWorker] = useState<Worker | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await getMyWorker();
      setWorker(data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setWorker(null);
        return;
      }
      setWorker(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = useMemo(() => {
    if (!worker) {
      return [];
    }
    const now = new Date();
    const tz = worker.timezone;
    const name
      = firstNameFromDisplayName(session?.user?.name)
        || firstNameFromDisplayName(`${worker.firstName} ${worker.lastName}`)
        || t('fallback_name');
    const result: Array<{ key: string; title: string; description: string; icon: 'birthday' | 'anniversary' }> = [];

    if (isMonthDayMatch(worker.dateOfBirth, now, tz)) {
      result.push({
        key: 'birthday',
        title: t('birthday_title', { name }),
        description: t('birthday_description'),
        icon: 'birthday',
      });
    }

    const years = anniversaryYears(worker.startDate, now, tz);
    if (years != null) {
      result.push({
        key: 'anniversary',
        title: t('anniversary_title', { years }),
        description: t('anniversary_description'),
        icon: 'anniversary',
      });
    }

    return result;
  }, [session?.user?.name, t, worker]);

  if (cards.length === 0) {
    return null;
  }

  return (
    <section aria-label={t('section_label')} className="space-y-3">
      {cards.map((card) => {
        const Icon = card.icon === 'birthday' ? Cake : PartyPopper;
        return (
          <div
            key={card.key}
            className="rounded-xl border border-amber-200 bg-amber-50 p-5"
          >
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-amber-950">{card.title}</p>
                <p className="mt-1 text-sm text-amber-900/80">{card.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
