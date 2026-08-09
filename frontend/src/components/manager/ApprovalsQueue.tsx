'use client';

import type { HubItem } from '@/libs/api/hub';
import type { TrackerStep } from '@/components/shared/StatusTracker';
import { StatusChip } from '@/components/shared/StatusChip';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { approvePunchCorrection } from '@/libs/api/attendance';
import { ApiRequestError } from '@/libs/api/client';
import { hubItemReferenceId } from '@/libs/api/hub';
import { approveLeaveRequest, rejectLeaveRequest } from '@/libs/api/leave';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  FileWarning,
  Plane,
  RefreshCw,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Skeleton } from 'primereact/skeleton';
import { useMemo, useState } from 'react';

type ApprovalsQueueProps = {
  items: HubItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onChanged?: () => void;
};

function typeIcon(type: string) {
  switch (type) {
    case 'leave':
      return Plane;
    case 'punch_correction':
      return FileWarning;
    default:
      return AlertCircle;
  }
}

function isLeaveItem(item: HubItem) {
  return item.type === 'leave';
}

function isPunchCorrection(item: HubItem) {
  return item.type === 'punch_correction';
}

export function ApprovalsQueue({
  items,
  loading = false,
  error = null,
  onRetry,
  onChanged,
}: ApprovalsQueueProps) {
  const t = useTranslations('ManagerCockpit');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<HubItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const leaveItems = useMemo(() => items.filter(isLeaveItem), [items]);
  const selectedLeaveCount = useMemo(
    () => leaveItems.filter(i => selectedIds.has(i.id)).length,
    [leaveItems, selectedIds],
  );

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleSelectAllLeave = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of leaveItems) {
        if (checked) {
          next.add(item.id);
        } else {
          next.delete(item.id);
        }
      }
      return next;
    });
  };

  const approveItem = async (item: HubItem) => {
    setActingId(item.id);
    setActionError(null);
    const referenceId = hubItemReferenceId(item);
    try {
      if (isLeaveItem(item)) {
        await approveLeaveRequest(referenceId);
      } else if (isPunchCorrection(item)) {
        await approvePunchCorrection(referenceId);
      } else {
        throw new Error(t('error_unsupported_type'));
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_action'));
    } finally {
      setActingId(null);
    }
  };

  const rejectItem = async (item: HubItem, reason: string) => {
    setActingId(item.id);
    setActionError(null);
    try {
      if (isLeaveItem(item)) {
        await rejectLeaveRequest(hubItemReferenceId(item), reason);
      } else {
        throw new Error(t('error_reject_unsupported'));
      }
      setRejectTarget(null);
      setRejectReason('');
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_action'));
    } finally {
      setActingId(null);
    }
  };

  const bulkApproveLeave = async () => {
    const targets = leaveItems.filter(i => selectedIds.has(i.id));
    if (targets.length === 0) {
      return;
    }
    setActingId('bulk');
    setActionError(null);
    try {
      for (const item of targets) {
        await approveLeaveRequest(hubItemReferenceId(item));
      }
      setSelectedIds(new Set());
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_action'));
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label={t('approvals_loading')}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height="4.5rem" className="rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-sm text-red-800">
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

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center">
        <Check className="mx-auto size-8 text-green-600" aria-hidden />
        <p className="mt-2 text-sm font-medium text-gray-900">{t('approvals_empty_title')}</p>
        <p className="mt-1 text-xs text-gray-500">{t('approvals_empty_body')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actionError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {actionError}
        </div>
      )}

      {leaveItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <div className="flex items-center gap-2">
            <Checkbox
              inputId="select-all-leave"
              checked={selectedLeaveCount > 0 && selectedLeaveCount === leaveItems.length}
              onChange={e => toggleSelectAllLeave(Boolean(e.checked))}
            />
            <label htmlFor="select-all-leave" className="text-xs font-medium text-gray-700">
              {t('select_leave')}
            </label>
          </div>
          <Button
            type="button"
            size="small"
            disabled={selectedLeaveCount === 0 || actingId === 'bulk'}
            loading={actingId === 'bulk'}
            onClick={() => void bulkApproveLeave()}
            className="gap-1.5"
          >
            <Check className="size-3.5" aria-hidden />
            {t('bulk_approve', { count: selectedLeaveCount })}
          </Button>
        </div>
      )}

      <ul className="space-y-2" aria-label={t('approvals_title')}>
        {items.map((item) => {
          const Icon = typeIcon(item.type);
          const expanded = expandedId === item.id;
          const busy = actingId === item.id;

          return (
            <li
              key={item.id}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex items-start gap-2 p-3 sm:gap-3">
                {isLeaveItem(item) && (
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onChange={e => toggleSelect(item.id, Boolean(e.checked))}
                    className="mt-1"
                    aria-label={t('select_item', { title: item.title })}
                  />
                )}

                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                  <Icon className="size-4" aria-hidden />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
                    <StatusChip status={item.status} />
                  </div>
                  {item.subtitle && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">{item.subtitle}</p>
                  )}
                  {item.requesterName && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {t('from_requester', { name: item.requesterName })}
                    </p>
                  )}
                  {item.nextStepText && !expanded && (
                    <p className="mt-1 text-xs text-gray-600">{item.nextStepText}</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    size="small"
                    severity="success"
                    disabled={busy}
                    loading={busy}
                    onClick={() => void approveItem(item)}
                    className="min-h-11 gap-1 px-3"
                    aria-label={t('approve')}
                  >
                    <Check className="size-3.5" aria-hidden />
                    <span className="hidden sm:inline">{t('approve')}</span>
                  </Button>
                  {isLeaveItem(item) && (
                    <Button
                      type="button"
                      size="small"
                      severity="danger"
                      outlined
                      disabled={busy}
                      onClick={() => {
                        setRejectTarget(item);
                        setRejectReason('');
                      }}
                      className="min-h-11 gap-1 px-3"
                      aria-label={t('reject')}
                    >
                      <X className="size-3.5" aria-hidden />
                      <span className="hidden sm:inline">{t('reject')}</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="small"
                    text
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                    className="min-h-11 px-2"
                    aria-expanded={expanded}
                    aria-label={expanded ? t('collapse_detail') : t('expand_detail')}
                  >
                    {expanded
                      ? <ChevronUp className="size-4" aria-hidden />
                      : <ChevronDown className="size-4" aria-hidden />}
                  </Button>
                </div>
              </div>

              {expanded && (
                <div className="border-t border-gray-100 bg-gray-50/80 px-3 py-3 sm:px-4">
                  <StatusTracker
                    steps={(item.steps ?? [
                      { label: t('tracker_submitted'), state: 'done' as const },
                      { label: t('tracker_manager'), state: 'current' as const, actor: t('tracker_you') },
                      { label: t('tracker_done'), state: 'todo' as const },
                    ]) satisfies TrackerStep[]}
                    nextStepText={item.nextStepText ?? undefined}
                  />
                  {(item.startDate || item.endDate) && (
                    <p className="mt-2 text-xs text-gray-600">
                      {t('leave_dates', {
                        start: item.startDate ?? '—',
                        end: item.endDate ?? '—',
                      })}
                      {item.leaveTypeName ? ` · ${item.leaveTypeName}` : ''}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog
        header={t('reject_dialog_title')}
        visible={rejectTarget !== null}
        onHide={() => {
          setRejectTarget(null);
          setRejectReason('');
        }}
        className="w-full max-w-md"
        modal
        dismissableMask
      >
        <p className="mb-3 text-sm text-gray-600">
          {rejectTarget
            ? t('reject_dialog_body', { title: rejectTarget.title })
            : null}
        </p>
        <label htmlFor="reject-reason" className="mb-1 block text-xs font-medium text-gray-700">
          {t('reject_reason_label')}
        </label>
        <InputTextarea
          id="reject-reason"
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          rows={3}
          className="w-full"
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            severity="secondary"
            outlined
            onClick={() => {
              setRejectTarget(null);
              setRejectReason('');
            }}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            severity="danger"
            disabled={!rejectReason.trim() || !rejectTarget}
            loading={actingId === rejectTarget?.id}
            onClick={() => {
              if (rejectTarget) {
                void rejectItem(rejectTarget, rejectReason.trim());
              }
            }}
          >
            {t('reject')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
