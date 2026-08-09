'use client';

import type { TodayAttendance } from '@/libs/api/attendance';
import type { ShellCheckInCtaModel } from '@/libs/shell/shell-topbar.util';
import { LogIn, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';
import { useEffect, useState } from 'react';
import { ApiRequestError } from '@/libs/api/client';
import { checkIn, checkOut } from '@/libs/api/attendance';
import { notifyAttendanceUpdated } from '@/libs/shell/attendance-events';
import {
  computeDayWorkedMinutes,
  formatPunchClock,
  formatWorkedMinutes,
} from '@/libs/shell/attendance-day.util';

type Props = {
  visible: boolean;
  onHide: () => void;
  today: TodayAttendance | null;
  ctaKind: ShellCheckInCtaModel['kind'];
  onRefetch: () => void;
};

export function ShellAttendanceModal({
  visible,
  onHide,
  today,
  ctaKind,
  onRefetch,
}: Props) {
  const t = useTranslations('AuthenticatedShell');
  const [isPunching, setIsPunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!visible || ctaKind !== 'checked_in') {
      return;
    }
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [visible, ctaKind]);

  useEffect(() => {
    if (visible) {
      setError(null);
      setNow(new Date());
    }
  }, [visible]);

  const punches = today?.punches ?? [];
  const workedMinutes = computeDayWorkedMinutes(punches, now);
  const canCheckIn = ctaKind === 'check_in' || ctaKind === 'checked_out';
  const canCheckOut = ctaKind === 'checked_in';
  const wasCheckedOut = ctaKind === 'checked_out';

  const handlePunch = async (action: 'in' | 'out') => {
    setIsPunching(true);
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (action === 'in') {
        await checkIn({ timezone, source: 'web' });
      } else {
        await checkOut({ timezone, source: 'web' });
      }
      notifyAttendanceUpdated();
      onRefetch();
    } catch (err) {
      const alreadyIn
        = err instanceof ApiRequestError
          && (err.errors.some(e => e.code === 'ALREADY_CHECKED_IN')
            || /already exists for today/i.test(err.message));
      if (alreadyIn) {
        notifyAttendanceUpdated();
        onRefetch();
        setError(null);
      } else {
        setError(err instanceof ApiRequestError ? err.message : t('punch_error'));
      }
    } finally {
      setIsPunching(false);
    }
  };

  return (
    <Dialog
      header={t('attendance_modal_title')}
      visible={visible}
      onHide={onHide}
      className="w-full max-w-md"
      modal
      dismissableMask
    >
      <div className="space-y-4 pt-1">
        {error && <Message severity="error" className="w-full" text={error} />}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {t('attendance_timeline')}
          </p>
          {punches.length === 0
            ? (
                <p className="mt-2 text-sm text-gray-500">{t('attendance_no_punches')}</p>
              )
            : (
                <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {punches.map(punch => (
                    <li
                      key={punch.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-gray-900">
                        {punch.punchType === 'check_in'
                          ? t('attendance_punch_in')
                          : t('attendance_punch_out')}
                      </span>
                      <span className="tabular-nums text-gray-600">
                        {formatPunchClock(punch.punchedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
          <span className="text-sm text-gray-600">{t('attendance_total')}</span>
          <span className="text-sm font-semibold tabular-nums text-gray-900">
            {formatWorkedMinutes(workedMinutes)}
            {canCheckOut ? ` ${t('attendance_in_progress')}` : ''}
          </span>
        </div>

        {canCheckIn && (
          <Button
            type="button"
            className="w-full gap-2"
            loading={isPunching}
            disabled={isPunching}
            onClick={() => void handlePunch('in')}
          >
            <LogIn className="size-4" aria-hidden />
            {wasCheckedOut ? t('check_in_again') : t('check_in')}
          </Button>
        )}

        {canCheckOut && (
          <Button
            type="button"
            className="w-full gap-2"
            loading={isPunching}
            disabled={isPunching}
            onClick={() => void handlePunch('out')}
          >
            <LogOut className="size-4" aria-hidden />
            {t('check_out')}
          </Button>
        )}

        {wasCheckedOut && (
          <p className="text-center text-sm text-gray-500">{t('attendance_can_resume')}</p>
        )}
      </div>
    </Dialog>
  );
}
