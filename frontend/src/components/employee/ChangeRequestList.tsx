'use client';

import type { TrackerStep } from '@/components/shared/StatusTracker';
import type { ProfileChangeRequest } from '@/libs/api/profile-change';
import { AlertCircle, FilePenLine, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { ApiRequestError } from '@/libs/api/client';
import {
  approveProfileChangeRequest,
  rejectProfileChangeRequest,
} from '@/libs/api/profile-change';
import { formatInTimezone } from '@/libs/datetime/format-in-timezone';

type ChangeRequestListProps = {
  requests: ProfileChangeRequest[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  timezone?: string;
  canApprove?: boolean;
  onChanged?: () => void;
};

const FIELD_LABEL_KEYS: Record<string, 'field_phone' | 'field_personal_email' | 'field_timezone' | 'field_work_mode' | 'field_employee_number'> = {
  phone: 'field_phone',
  personalEmail: 'field_personal_email',
  timezone: 'field_timezone',
  workMode: 'field_work_mode',
  employeeNumber: 'field_employee_number',
};

function trackerSteps(
  request: ProfileChangeRequest,
  t: ReturnType<typeof useTranslations<'ChangeRequests'>>,
): TrackerStep[] {
  if (request.status === 'rejected') {
    return [
      { label: t('tracker_submitted'), state: 'done' },
      { label: t('tracker_review'), state: 'done' },
      { label: t('tracker_rejected'), state: 'current' },
    ];
  }
  if (request.status === 'approved') {
    return [
      { label: t('tracker_submitted'), state: 'done' },
      { label: t('tracker_review'), state: 'done' },
      { label: t('tracker_approved'), state: 'done' },
      { label: t('tracker_done'), state: 'done' },
    ];
  }
  return [
    { label: t('tracker_submitted'), state: 'done' },
    { label: t('tracker_review'), state: 'current', actor: t('tracker_approver') },
    { label: t('tracker_approved'), state: 'todo' },
    { label: t('tracker_done'), state: 'todo' },
  ];
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return String(value);
}

export function ChangeRequestList({
  requests,
  isLoading = false,
  error = null,
  onRetry,
  timezone,
  canApprove = false,
  onChanged,
}: ChangeRequestListProps) {
  const t = useTranslations('ChangeRequests');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ProfileChangeRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = async (request: ProfileChangeRequest) => {
    setBusyId(request.id);
    setActionError(null);
    try {
      await approveProfileChangeRequest(request.id);
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_action'));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || rejectReason.trim().length === 0) {
      return;
    }
    setBusyId(rejectTarget.id);
    setActionError(null);
    try {
      await rejectProfileChangeRequest(rejectTarget.id, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_action'));
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton height="6rem" className="w-full rounded-xl" />
        <Skeleton height="6rem" className="w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </div>
        {onRetry && (
          <Button type="button" severity="secondary" size="small" onClick={onRetry} className="gap-2">
            <RefreshCw className="size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        )}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={FilePenLine}
        title={t('empty_title')}
        description={t('empty_description')}
      />
    );
  }

  return (
    <div className="space-y-3">
      {actionError && <Message severity="error" text={actionError} className="w-full" />}
      {requests.map((request) => {
        const submittedAt = timezone
          ? formatInTimezone(request.createdAt, timezone, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : new Date(request.createdAt).toLocaleString();

        return (
          <article
            key={request.id}
            className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('title')}</h3>
                <p className="mt-0.5 text-xs text-gray-500">{submittedAt}</p>
              </div>
            </div>

            <ul className="space-y-1.5 text-sm text-gray-700">
              {Object.entries(request.fieldChanges).map(([field, change]) => {
                const labelKey = FIELD_LABEL_KEYS[field];
                const label = labelKey ? t(labelKey) : field;
                return (
                  <li key={field}>
                    <span className="font-medium">{label}:</span>{' '}
                    <span className="text-gray-500 line-through">{formatValue(change.old)}</span>
                    {' → '}
                    <span>{formatValue(change.new)}</span>
                  </li>
                );
              })}
            </ul>

            <StatusTracker steps={trackerSteps(request, t)} />

            {request.status === 'rejected' && request.reason && (
              <Message
                severity="warn"
                text={t('reject_reason_shown', { reason: request.reason })}
                className="w-full"
              />
            )}

            {canApprove && request.status === 'submitted' && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="small"
                  label={t('approve')}
                  loading={busyId === request.id}
                  onClick={() => void handleApprove(request)}
                />
                <Button
                  type="button"
                  size="small"
                  severity="danger"
                  outlined
                  label={t('reject')}
                  disabled={busyId === request.id}
                  onClick={() => {
                    setRejectTarget(request);
                    setRejectReason('');
                  }}
                />
              </div>
            )}
          </article>
        );
      })}

      <Dialog
        header={t('reject_dialog_title')}
        visible={rejectTarget !== null}
        onHide={() => setRejectTarget(null)}
        className="w-full max-w-md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              severity="secondary"
              label={t('cancel')}
              onClick={() => setRejectTarget(null)}
            />
            <Button
              type="button"
              severity="danger"
              label={t('reject')}
              disabled={rejectReason.trim().length === 0}
              loading={busyId === rejectTarget?.id}
              onClick={() => void handleReject()}
            />
          </div>
        )}
      >
        <p className="mb-3 text-sm text-gray-600">{t('reject_dialog_body')}</p>
        <label htmlFor="reject-reason" className="mb-1 block text-sm font-medium text-gray-700">
          {t('reject_reason_label')}
        </label>
        <InputTextarea
          id="reject-reason"
          value={rejectReason}
          onChange={event => setRejectReason(event.target.value)}
          rows={3}
          className="w-full"
          autoFocus
        />
      </Dialog>
    </div>
  );
}
