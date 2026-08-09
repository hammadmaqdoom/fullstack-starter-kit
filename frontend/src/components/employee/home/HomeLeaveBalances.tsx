'use client';

import type { LeaveBalance } from '@/libs/api/leave';
import { ApiRequestError } from '@/libs/api/client';
import { listLeaveBalances } from '@/libs/api/leave';
import { Link } from '@/libs/I18nNavigation';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { useCallback, useEffect, useState } from 'react';

export function HomeLeaveBalances() {
  const t = useTranslations('EmployeeHome');
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await listLeaveBalances();
      setBalances(data);
    } catch (err) {
      setBalances([]);
      setError(err instanceof ApiRequestError ? err.message : t('leave_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      aria-labelledby="leave-balances-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="leave-balances-heading" className="text-sm font-semibold text-gray-900">
          {t('leave_balances_section')}
        </h2>
        <Link href="/employee/leave" className="text-sm font-medium text-blue-700 hover:underline">
          {t('request_leave')}
        </Link>
      </div>

      {loading && (
        <div className="mt-4 space-y-2" aria-busy="true">
          <Skeleton height="2.5rem" />
          <Skeleton height="2.5rem" />
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 text-center">
          <p className="flex items-center justify-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
          <Button type="button" className="mt-3" onClick={() => void load()}>
            {t('retry')}
          </Button>
        </div>
      )}

      {!loading && !error && balances.length === 0 && (
        <p className="mt-3 text-sm text-gray-500">{t('no_balances')}</p>
      )}

      {!loading && !error && balances.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {balances.map(balance => (
            <li
              key={balance.leaveTypeId}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <p className="text-sm font-medium text-gray-900">{balance.leaveTypeName}</p>
              <p className="text-xs text-gray-500">
                {balance.remaining}
                {' '}
                {balance.unit === 'hours' ? t('unit_hours') : t('unit_days')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
