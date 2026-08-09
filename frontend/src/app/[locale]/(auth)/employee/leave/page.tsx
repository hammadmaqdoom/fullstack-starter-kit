'use client';

import type { LeaveRequest, LeaveType } from '@/libs/api/leave';
import { AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { Toast } from 'primereact/toast';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusChip } from '@/components/shared/StatusChip';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { ApiRequestError } from '@/libs/api/client';
import { formatDateTimeInTimezone } from '@/libs/datetime/format-in-timezone';
import { useWorkerTimezone } from '@/libs/hooks/useWorkerTimezone';
import {
  createLeaveRequest,
  listLeaveRequests,
  listLeaveTypes,
} from '@/libs/api/leave';
import { getMyCompOffBalance, type CompOffBalance } from '@/libs/api/comp-off';

function trackerStepsForStatus(status: string) {
  const order = ['submitted', 'pending', 'approved'] as const;
  const normalized
    = status === 'rejected' || status === 'cancelled'
      ? status
      : status === 'approved'
        ? 'approved'
        : status === 'submitted'
          ? 'submitted'
          : 'pending';

  if (normalized === 'rejected' || normalized === 'cancelled') {
    return [
      { label: 'Submitted', state: 'done' as const },
      { label: normalized === 'rejected' ? 'Rejected' : 'Cancelled', state: 'current' as const },
    ];
  }

  const currentIndex
    = normalized === 'approved'
      ? 2
      : normalized === 'submitted'
        ? 0
        : 1;

  return order.map((label, index) => ({
    label: label.charAt(0).toUpperCase() + label.slice(1),
    state:
      index < currentIndex
        ? ('done' as const)
        : index === currentIndex
          ? ('current' as const)
          : ('todo' as const),
  }));
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function EmployeeLeavePage() {
  const t = useTranslations('EmployeeLeave');
  const { timezone } = useWorkerTimezone();
  const toast = useRef<Toast>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<Date[] | null>(null);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [compOff, setCompOff] = useState<CompOffBalance | null>(null);

  const typeOptions = useMemo(
    () => types.map(type => ({ label: type.name, value: type.id })),
    [types],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setOffline(typeof navigator !== 'undefined' && !navigator.onLine);

    try {
      const [reqResult, typeResult, compOffResult] = await Promise.allSettled([
        listLeaveRequests(),
        listLeaveTypes(),
        getMyCompOffBalance(),
      ]);

      if (reqResult.status === 'fulfilled') {
        setRequests(reqResult.value.data ?? []);
      } else if (
        reqResult.reason instanceof ApiRequestError
        && reqResult.reason.status === 404
      ) {
        setRequests([]);
      } else {
        throw reqResult.reason;
      }

      if (typeResult.status === 'fulfilled') {
        setTypes(typeResult.value.data ?? []);
      } else {
        setTypes([]);
      }

      if (compOffResult.status === 'fulfilled') {
        setCompOff(compOffResult.value.data);
      } else {
        setCompOff(null);
      }
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : t('error_load');
      setError(message);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDialog = () => {
    setFormError(null);
    setLeaveTypeId(types[0]?.id ?? null);
    setDateRange(null);
    setReason('');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!leaveTypeId) {
      setFormError(t('error_type_required'));
      return;
    }
    if (!dateRange?.[0] || !dateRange?.[1]) {
      setFormError(t('error_dates_required'));
      return;
    }

    setIsSubmitting(true);
    try {
      const startDate = dateRange[0].toISOString().slice(0, 10);
      const endDate = dateRange[1].toISOString().slice(0, 10);
      await createLeaveRequest({
        leaveTypeId,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
      });
      setDialogOpen(false);
      toast.current?.show({
        severity: 'success',
        summary: t('success_title'),
        detail: t('success_detail'),
        life: 3000,
      });
      await load();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setFormError(t('error_api_unavailable'));
      } else {
        const message
          = err instanceof ApiRequestError ? err.message : t('error_submit');
        setFormError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16 lg:pb-0">
      <Toast ref={toast} position="top-center" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Button type="button" onClick={openDialog} className="gap-2">
          <Plus className="size-4" aria-hidden />
          {t('request_leave')}
        </Button>
      </div>

      {offline && (
        <Message severity="warn" text={t('offline_banner')} className="w-full" />
      )}

      {compOff && compOff.availableDays > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p className="font-medium">{t('comp_off_title')}</p>
          <p className="mt-0.5">{t('comp_off_available', { days: compOff.availableDays })}</p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3" aria-busy="true">
          {[1, 2].map(i => (
            <div key={i} className="rounded-xl border border-gray-200 p-4">
              <Skeleton width="40%" height="1rem" className="mb-2" />
              <Skeleton width="60%" height="0.75rem" className="mb-3" />
              <Skeleton height="0.5rem" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </div>
          <Button type="button" severity="secondary" size="small" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!isLoading && !error && requests.length === 0 && (
        <EmptyState
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={t('request_leave')}
          onAction={openDialog}
        />
      )}

      {!isLoading && !error && requests.length > 0 && (
        <ul className="space-y-3">
          {requests.map(req => (
            <li key={req.id}>
              <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-900">
                      {req.leaveTypeName}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDate(req.startDate)}
                      {' – '}
                      {formatDate(req.endDate)}
                    </p>
                    {req.createdAt && (
                      <p className="mt-0.5 text-xs text-gray-400">
                        {t('submitted_at', { time: formatDateTimeInTimezone(req.createdAt, timezone) })}
                      </p>
                    )}
                  </div>
                  <StatusChip status={req.status} />
                </div>
                <div className="mt-3">
                  <StatusTracker
                    steps={trackerStepsForStatus(req.status)}
                    nextStepText={req.nextStepText ?? undefined}
                  />
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        header={t('dialog_title')}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        className="w-full max-w-md"
        modal
        dismissableMask
      >
        <div className="space-y-4 pt-1">
          {formError && (
            <Message severity="error" text={formError} className="w-full" />
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="leave-type" className="text-sm font-medium text-gray-700">
              {t('field_type')}
            </label>
            <Dropdown
              inputId="leave-type"
              value={leaveTypeId}
              options={typeOptions}
              onChange={e => setLeaveTypeId(e.value)}
              placeholder={t('field_type_placeholder')}
              className="w-full"
              disabled={types.length === 0}
            />
            {types.length === 0 && (
              <p className="text-xs text-gray-500">{t('no_types')}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="leave-dates" className="text-sm font-medium text-gray-700">
              {t('field_dates')}
            </label>
            <Calendar
              inputId="leave-dates"
              value={dateRange}
              onChange={e => setDateRange(e.value as Date[] | null)}
              selectionMode="range"
              readOnlyInput
              hideOnRangeSelection
              className="w-full"
              dateFormat="yy-mm-dd"
              placeholder={t('field_dates_placeholder')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="leave-reason" className="text-sm font-medium text-gray-700">
              {t('field_reason')}
            </label>
            <InputTextarea
              id="leave-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="w-full"
              placeholder={t('field_reason_placeholder')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              severity="secondary"
              label={t('cancel')}
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            />
            <Button
              type="button"
              label={isSubmitting ? t('submitting') : t('submit')}
              onClick={() => void handleSubmit()}
              loading={isSubmitting}
              disabled={types.length === 0}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
