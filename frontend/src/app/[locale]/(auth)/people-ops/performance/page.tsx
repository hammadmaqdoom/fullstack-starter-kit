'use client';

import { PerformanceDashboardView } from '@/components/performance/PerformanceDashboardView';
import { activateCycle, createCycle, listCycles } from '@/libs/api/talent';
import type { PerformanceCycle } from '@/libs/api/talent';
import { ApiRequestError } from '@/libs/api/client';
import { Link } from '@/libs/I18nNavigation';
import { Calendar, Play, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { useCallback, useEffect, useState } from 'react';

export default function PeopleOpsPerformancePage() {
  const t = useTranslations('Performance');
  const [cycles, setCycles] = useState<PerformanceCycle[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const year = new Date().getFullYear();
  const [name, setName] = useState(`${year} Annual Review`);
  const [cycleType, setCycleType] = useState('annual');
  const [periodStart, setPeriodStart] = useState(`${year}-01-01`);
  const [periodEnd, setPeriodEnd] = useState(`${year}-12-31`);
  const [peerFeedbackEnabled, setPeerFeedbackEnabled] = useState(false);
  const [calibrationEnabled, setCalibrationEnabled] = useState(true);

  const loadCycles = useCallback(async () => {
    setCyclesLoading(true);
    setError(null);
    try {
      const { data } = await listCycles();
      setCycles(data);
    } catch (err) {
      setCycles([]);
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setCyclesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCycles();
  }, [loadCycles]);

  const cycleTypeOptions = [
    { label: t('cycle_type_annual'), value: 'annual' },
    { label: t('cycle_type_semi_annual'), value: 'semi_annual' },
    { label: t('cycle_type_quarterly'), value: 'quarterly' },
    { label: t('cycle_type_probation'), value: 'probation' },
  ];

  const handleCreate = async () => {
    if (!name.trim() || !periodStart || !periodEnd) return;
    setSubmitting(true);
    setError(null);
    try {
      await createCycle({
        name: name.trim(),
        cycleType,
        periodStart,
        periodEnd,
        peerFeedbackEnabled,
        calibrationEnabled,
      });
      setDialogOpen(false);
      await loadCycles();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (id: string) => {
    setError(null);
    try {
      await activateCycle(id);
      await loadCycles();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PerformanceDashboardView showAdminHints />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/people-ops/performance/okrs"
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          <Target className="size-4" aria-hidden />
          {t('okrs_link')}
        </Link>
        <Link
          href="/people-ops/performance/calibration"
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          {t('calibration_link')}
        </Link>
        <Link
          href="/people-ops/performance/pulse"
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          {t('pulse_link')}
        </Link>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('cycles_title')}</h2>
            <p className="text-sm text-gray-500">{t('cycles_subtitle')}</p>
          </div>
          <Button type="button" className="gap-2" onClick={() => setDialogOpen(true)}>
            <Calendar className="size-4" aria-hidden />
            {t('create_cycle')}
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            {error}
          </div>
        )}

        <Card>
          <DataTable
            value={cycles}
            loading={cyclesLoading}
            emptyMessage={t('no_cycles')}
            size="small"
          >
            <Column field="name" header={t('cycle_name')} />
            <Column field="cycleType" header={t('cycle_type')} />
            <Column field="status" header={t('cycle_status')} />
            <Column
              header={t('actions')}
              body={(row: PerformanceCycle) =>
                row.status === 'draft' ? (
                  <Button
                    type="button"
                    size="small"
                    className="gap-1"
                    onClick={() => void handleActivate(row.id)}
                  >
                    <Play className="size-3.5" aria-hidden />
                    {t('activate_cycle')}
                  </Button>
                ) : null
              }
            />
          </DataTable>
        </Card>
      </section>

      <Dialog
        header={t('create_cycle')}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        modal
        className="w-full max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="cycle-name">
              {t('cycle_name')}
            </label>
            <InputText
              id="cycle-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="cycle-type">
              {t('cycle_type')}
            </label>
            <Dropdown
              inputId="cycle-type"
              value={cycleType}
              options={cycleTypeOptions}
              onChange={(e) => setCycleType(e.value as string)}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="period-start">
                {t('period_start')}
              </label>
              <InputText
                id="period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="period-end">
                {t('period_end')}
              </label>
              <InputText
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              inputId="peer-fb"
              checked={peerFeedbackEnabled}
              onChange={(e) => setPeerFeedbackEnabled(Boolean(e.checked))}
            />
            <label htmlFor="peer-fb" className="text-sm text-gray-700">
              {t('peer_feedback_enabled')}
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              inputId="calib"
              checked={calibrationEnabled}
              onChange={(e) => setCalibrationEnabled(Boolean(e.checked))}
            />
            <label htmlFor="calib" className="text-sm text-gray-700">
              {t('calibration_enabled')}
            </label>
          </div>
          <Button type="button" loading={submitting} onClick={() => void handleCreate()}>
            {t('save')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
