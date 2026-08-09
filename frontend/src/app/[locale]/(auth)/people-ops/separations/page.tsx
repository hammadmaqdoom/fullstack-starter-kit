'use client';

import type { TrackerStep } from '@/components/shared/StatusTracker';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusChip } from '@/components/shared/StatusChip';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import type {
  ClearanceBoardCard,
  ClearanceCategory,
  SeparationCase,
  SeparationCaseStatus,
} from '@/libs/api/separation';
import {
  CLEARANCE_CATEGORIES,
  clearClearanceItem,
  flattenSeparationCases,
  getSeparation,
  getSeparationBoard,
  groupClearanceByCategory,
  initiateSeparation,
  separationWorkerName,
} from '@/libs/api/separation';
import { listWorkers, type Worker } from '@/libs/api/workers';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Check,
  DoorOpen,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { useCallback, useEffect, useMemo, useState } from 'react';

function separationTrackerSteps(
  separation: SeparationCase,
  labels: Record<SeparationCaseStatus, string>,
): TrackerStep[] {
  const order: SeparationCaseStatus[] = [
    'initiated',
    'in_progress',
    'cleared',
    'archived',
  ];
  const current = separation.status as SeparationCaseStatus;
  const currentIdx = order.indexOf(current);

  return order.map((status) => {
    const idx = order.indexOf(status);
    let state: TrackerStep['state'] = 'todo';
    if (status === current) {
      state = 'current';
    } else if (idx < currentIdx) {
      state = 'done';
    }
    return { label: labels[status], state };
  });
}

function ClearanceCard({
  card,
  onOpen,
}: {
  card: ClearanceBoardCard;
  onOpen: (separationId: string) => void;
}) {
  const t = useTranslations('Separations');
  const name = separationWorkerName(card.separation.worker, card.separation.workerId);

  return (
    <button
      type="button"
      onClick={() => onOpen(card.separation.id)}
      className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        <StatusChip
          status={card.item.status === 'pending' ? 'pending' : 'approved'}
          label={t(`item_status_${card.item.status}` as 'item_status_pending')}
        />
      </div>
      <p className="mt-1 text-xs text-gray-700">{card.item.title}</p>
      <p className="mt-2 text-xs text-gray-500">
        {t('last_day', { date: card.separation.lastWorkingDay })}
      </p>
    </button>
  );
}

export default function PeopleOpsSeparationsPage() {
  const t = useTranslations('Separations');
  const [cases, setCases] = useState<SeparationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SeparationCase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [createWorkerId, setCreateWorkerId] = useState('');
  const [lastWorkingDay, setLastWorkingDay] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const statusLabels = useMemo(
    () => ({
      initiated: t('case_status_initiated'),
      in_progress: t('case_status_in_progress'),
      cleared: t('case_status_cleared'),
      archived: t('case_status_archived'),
    }),
    [t],
  );

  const categoryLabels = useMemo(
    () => ({
      hr: t('category_hr'),
      it: t('category_it'),
      finance: t('category_finance'),
      manager: t('category_manager'),
    }),
    [t],
  );

  const workerOptions = useMemo(
    () =>
      workers.map(w => ({
        label: `${w.firstName} ${w.lastName}`.trim() || w.email,
        value: w.id,
      })),
    [workers],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getSeparationBoard();
      setCases(flattenSeparationCases(data));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadWorkers = useCallback(async () => {
    try {
      const { data } = await listWorkers({ status: 'active', limit: 200 });
      setWorkers(data ?? []);
    } catch {
      setWorkers([]);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadWorkers();
  }, [load, loadWorkers]);

  const grouped = useMemo(
    () => groupClearanceByCategory(cases, { includeDone: false }),
    [cases],
  );

  const pendingCount = CLEARANCE_CATEGORIES.reduce(
    (sum, category) => sum + grouped[category].length,
    0,
  );

  const openSeparation = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    setSuccessMessage(null);
    try {
      const { data } = await getSeparation(id);
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof ApiRequestError ? err.message : t('error_detail'));
    } finally {
      setDetailLoading(false);
    }
  }, [t]);

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    setSuccessMessage(null);
  };

  const handleClearItem = async (itemId: string, waive = false) => {
    if (!selectedId) {
      return;
    }
    setClearingId(itemId);
    setDetailError(null);
    try {
      const { data } = await clearClearanceItem(selectedId, itemId, { waive });
      setDetail(data);
      setSuccessMessage(waive ? t('waive_success') : t('clear_success'));
      await load();
    } catch (err) {
      setDetailError(err instanceof ApiRequestError ? err.message : t('error_clear'));
    } finally {
      setClearingId(null);
    }
  };

  const openCreate = () => {
    setCreateError(null);
    setCreateWorkerId('');
    setLastWorkingDay(null);
    setReason('');
    setCreateOpen(true);
  };

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleInitiate = async () => {
    if (!createWorkerId || !lastWorkingDay) {
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const { data } = await initiateSeparation({
        workerId: createWorkerId,
        lastWorkingDay: formatDate(lastWorkingDay),
        reason: reason.trim() || undefined,
      });
      setCreateOpen(false);
      await load();
      void openSeparation(data.id);
    } catch (err) {
      setCreateError(
        err instanceof ApiRequestError ? err.message : t('error_initiate'),
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <OfflineBanner />

      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        action={(
          <div className="flex gap-2">
            <Button
              type="button"
              severity="secondary"
              outlined
              className="gap-2"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className="size-4" aria-hidden />
              {t('refresh')}
            </Button>
            <Button type="button" className="gap-2" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              {t('initiate_cta')}
            </Button>
          </div>
        )}
      />

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {CLEARANCE_CATEGORIES.map(category => (
            <div key={category} className="space-y-3 rounded-xl border border-gray-200 p-3">
              <Skeleton width="40%" height="1rem" />
              <Skeleton height="4.5rem" />
              <Skeleton height="4.5rem" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <Button type="button" className="mt-4 gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!loading && !error && pendingCount === 0 && (
        <EmptyState
          icon={DoorOpen}
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={t('initiate_cta')}
          onAction={openCreate}
        />
      )}

      {!loading && !error && pendingCount > 0 && (
        <>
          <div className="hidden gap-4 xl:grid xl:grid-cols-4">
            {CLEARANCE_CATEGORIES.map((category) => {
              const items = grouped[category];
              return (
                <section
                  key={category}
                  className="flex min-h-[16rem] flex-col rounded-xl border border-gray-200 bg-gray-50/60"
                >
                  <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2.5">
                    <h2 className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      {categoryLabels[category]}
                    </h2>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 tabular-nums shadow-sm">
                      {items.length}
                    </span>
                  </header>
                  <div className="flex flex-1 flex-col gap-2 p-2">
                    {items.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-gray-400">
                        {t('column_empty')}
                      </p>
                    ) : (
                      items.map(card => (
                        <ClearanceCard
                          key={card.item.id}
                          card={card}
                          onOpen={id => void openSeparation(id)}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="xl:hidden">
            <Accordion multiple>
              {CLEARANCE_CATEGORIES.map((category: ClearanceCategory) => {
                const items = grouped[category];
                return (
                  <AccordionTab
                    key={category}
                    header={`${categoryLabels[category]} (${items.length})`}
                  >
                    <div className="flex flex-col gap-2">
                      {items.length === 0 ? (
                        <p className="py-4 text-center text-xs text-gray-400">
                          {t('column_empty')}
                        </p>
                      ) : (
                        items.map(card => (
                          <ClearanceCard
                            key={card.item.id}
                            card={card}
                            onOpen={id => void openSeparation(id)}
                          />
                        ))
                      )}
                    </div>
                  </AccordionTab>
                );
              })}
            </Accordion>
          </div>
        </>
      )}

      <Dialog
        header={detail
          ? separationWorkerName(detail.worker, detail.workerId)
          : t('detail_title')}
        visible={selectedId !== null}
        onHide={closeDetail}
        modal
        className="w-full max-w-lg"
        dismissableMask
      >
        {detailLoading && (
          <div className="space-y-3 py-2">
            <Skeleton height="1.5rem" />
            <Skeleton height="4rem" />
            <Skeleton height="8rem" />
          </div>
        )}

        {!detailLoading && detailError && !detail && (
          <div className="py-4 text-center">
            <p className="text-sm text-red-700">{detailError}</p>
            {selectedId && (
              <Button
                type="button"
                className="mt-3 gap-2"
                onClick={() => void openSeparation(selectedId)}
              >
                <RefreshCw className="size-4" aria-hidden />
                {t('retry')}
              </Button>
            )}
          </div>
        )}

        {!detailLoading && detail && (
          <div className="space-y-4">
            {successMessage && (
              <Message severity="success" text={successMessage} className="w-full" />
            )}
            {detailError && (
              <Message severity="error" text={detailError} className="w-full" />
            )}

            <StatusTracker steps={separationTrackerSteps(detail, statusLabels)} />

            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <p>{t('last_day', { date: detail.lastWorkingDay })}</p>
              {detail.reason && (
                <p className="mt-0.5">{t('reason', { reason: detail.reason })}</p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                {t('clearance_title')}
              </h3>
              <ul className="space-y-2">
                {(detail.clearanceItems ?? []).map((item) => {
                  const done = item.status === 'cleared' || item.status === 'waived';
                  return (
                    <li
                      key={item.id}
                      className="rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {categoryLabels[item.category as ClearanceCategory]
                              ?? item.category}
                            {' · '}
                            {t(`item_status_${item.status}` as 'item_status_pending')}
                          </p>
                        </div>
                        {!done && (
                          <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                            <Button
                              type="button"
                              size="small"
                              className="gap-1"
                              disabled={clearingId === item.id}
                              onClick={() => void handleClearItem(item.id, false)}
                            >
                              <Check className="size-3.5" aria-hidden />
                              {clearingId === item.id ? t('clearing') : t('clear_item')}
                            </Button>
                            <Button
                              type="button"
                              size="small"
                              severity="secondary"
                              outlined
                              disabled={clearingId === item.id}
                              onClick={() => void handleClearItem(item.id, true)}
                            >
                              {t('waive_item')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        header={t('initiate_title')}
        visible={createOpen}
        onHide={() => setCreateOpen(false)}
        modal
        dismissableMask
        className="w-full max-w-md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              severity="secondary"
              outlined
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void handleInitiate()}
              disabled={creating || !createWorkerId || !lastWorkingDay}
              loading={creating}
            >
              {t('initiate_submit')}
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          {createError && <Message severity="error" text={createError} className="w-full" />}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sep-worker" className="text-sm font-medium text-gray-700">
              {t('field_worker')}
            </label>
            <Dropdown
              inputId="sep-worker"
              value={createWorkerId || null}
              options={workerOptions}
              onChange={e => setCreateWorkerId(e.value ?? '')}
              placeholder={t('field_worker_placeholder')}
              className="w-full"
              filter
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sep-lwd" className="text-sm font-medium text-gray-700">
              {t('field_last_working_day')}
            </label>
            <Calendar
              inputId="sep-lwd"
              value={lastWorkingDay}
              onChange={e => setLastWorkingDay(e.value as Date | null)}
              dateFormat="yy-mm-dd"
              showIcon
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sep-reason" className="text-sm font-medium text-gray-700">
              {t('field_reason')}
            </label>
            <InputText
              id="sep-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full"
              placeholder={t('field_reason_placeholder')}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
