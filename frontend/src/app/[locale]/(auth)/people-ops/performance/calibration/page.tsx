'use client';

import type { CalibrationReview, PerformanceCycle } from '@/libs/api/talent';
import {
  AlertCircle,
  RefreshCw,
  Scale,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ApiRequestError } from '@/libs/api/client';
import {
  finalizeCalibration,
  getCalibrationBoard,
  listCycles,
} from '@/libs/api/talent';

const OUTCOME_SEVERITY: Record<string, 'success' | 'info' | 'warning'> = {
  exceeds: 'success',
  meets: 'info',
  below: 'warning',
};

export default function CalibrationBoardPage() {
  const t = useTranslations('CalibrationBoard');
  const [cycles, setCycles] = useState<PerformanceCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<CalibrationReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [calibrateReview, setCalibrateReview] = useState<CalibrationReview | null>(null);
  const [calibratedOutcome, setCalibratedOutcome] = useState<string | null>(null);
  const [calibrationNotes, setCalibrationNotes] = useState('');

  const loadCycles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listCycles();
      const calibrationCycles = data.filter(c => c.calibrationEnabled);
      setCycles(calibrationCycles);
      setSelectedCycleId(prev => prev ?? calibrationCycles[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCycles();
  }, [loadCycles]);

  const loadBoard = useCallback(async (cycleId: string) => {
    setBoardLoading(true);
    setError(null);
    try {
      const { data } = await getCalibrationBoard(cycleId);
      setReviews(data.reviews);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setReviews([]);
    } finally {
      setBoardLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (selectedCycleId) {
      void loadBoard(selectedCycleId);
    }
  }, [selectedCycleId, loadBoard]);

  const handleFinalize = async () => {
    if (!calibrateReview) {
      return;
    }
    setSubmitting(true);
    try {
      await finalizeCalibration(calibrateReview.id, {
        calibratedOutcome: calibratedOutcome ?? undefined,
        calibrationNotes: calibrationNotes.trim() || undefined,
      });
      setCalibrateReview(null);
      setCalibratedOutcome(null);
      setCalibrationNotes('');
      if (selectedCycleId) {
        await loadBoard(selectedCycleId);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCalibration = reviews.filter(r => r.status === 'pending_calibration');
  const otherReviews = reviews.filter(r => r.status !== 'pending_calibration');

  if (isLoading) {
    return <PageSkeleton variant="table" rows={5} />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      {error && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </div>
          <Button type="button" severity="secondary" size="small" onClick={() => void loadCycles()}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!error && cycles.length === 0 && (
        <EmptyState icon={Scale} title={t('empty_cycles_title')} description={t('empty_cycles_description')} />
      )}

      {cycles.length > 0 && (
        <div className="max-w-sm">
          <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="calibration-cycle">{t('select_cycle')}</label>
          <Dropdown
            inputId="calibration-cycle"
            value={selectedCycleId}
            onChange={e => setSelectedCycleId(e.value)}
            options={cycles.map(c => ({ label: c.name, value: c.id }))}
            className="w-full"
          />
        </div>
      )}

      {boardLoading && <PageSkeleton variant="table" rows={3} showHeader={false} />}

      {!boardLoading && cycles.length > 0 && (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">{t('pending_heading', { count: pendingCalibration.length })}</h2>
            {pendingCalibration.length === 0 && <p className="text-sm text-gray-400">{t('no_pending')}</p>}
            {pendingCalibration.length > 0 && (
              <DataTable value={pendingCalibration} dataKey="id" size="small">
                <Column
                  header={t('col_worker')}
                  body={(row: CalibrationReview) => row.worker ? `${row.worker.firstName} ${row.worker.lastName}` : row.workerId}
                />
                <Column
                  header={t('col_manager_outcome')}
                  body={(row: CalibrationReview) => row.outcome
                    ? <Tag value={t(`outcome_${row.outcome}` as 'outcome_meets')} severity={OUTCOME_SEVERITY[row.outcome]} />
                    : '—'}
                />
                <Column
                  header={t('col_actions')}
                  body={(row: CalibrationReview) => (
                    <Button
                      type="button"
                      size="small"
                      outlined
                      onClick={() => {
                        setCalibrateReview(row);
                        setCalibratedOutcome(row.outcome ?? null);
                      }}
                    >
                      {t('calibrate')}
                    </Button>
                  )}
                />
              </DataTable>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">{t('other_reviews_heading')}</h2>
            {otherReviews.length === 0 && <p className="text-sm text-gray-400">{t('no_other_reviews')}</p>}
            {otherReviews.length > 0 && (
              <DataTable value={otherReviews} dataKey="id" size="small">
                <Column
                  header={t('col_worker')}
                  body={(row: CalibrationReview) => row.worker ? `${row.worker.firstName} ${row.worker.lastName}` : row.workerId}
                />
                <Column field="status" header={t('col_status')} body={(row: CalibrationReview) => t(`review_status_${row.status}` as 'review_status_completed')} />
                <Column
                  header={t('col_manager_outcome')}
                  body={(row: CalibrationReview) => row.outcome
                    ? <Tag value={t(`outcome_${row.outcome}` as 'outcome_meets')} severity={OUTCOME_SEVERITY[row.outcome]} />
                    : '—'}
                />
              </DataTable>
            )}
          </section>
        </>
      )}

      <Dialog
        header={t('calibrate')}
        visible={calibrateReview !== null}
        onHide={() => setCalibrateReview(null)}
        modal
        className="w-full max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="calibrated-outcome">{t('calibrated_outcome')}</label>
            <Dropdown
              inputId="calibrated-outcome"
              value={calibratedOutcome}
              onChange={e => setCalibratedOutcome(e.value)}
              options={[
                { label: t('outcome_exceeds'), value: 'exceeds' },
                { label: t('outcome_meets'), value: 'meets' },
                { label: t('outcome_below'), value: 'below' },
              ]}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="calibration-notes">{t('calibration_notes')}</label>
            <InputTextarea
              id="calibration-notes"
              value={calibrationNotes}
              onChange={e => setCalibrationNotes(e.target.value)}
              rows={3}
              className="w-full"
              placeholder={t('calibration_notes_placeholder')}
            />
          </div>
          <Button type="button" loading={submitting} onClick={() => void handleFinalize()}>
            {t('save')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
