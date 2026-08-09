'use client';

import { PerformanceDashboardView } from '@/components/performance/PerformanceDashboardView';
import { activateCycle, createCycle, listCycles } from '@/libs/api/talent';
import type { PerformanceCycle } from '@/libs/api/talent';
import { ApiRequestError } from '@/libs/api/client';
import { Calendar, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useCallback, useEffect, useState } from 'react';

export default function PeopleOpsPerformancePage() {
  const t = useTranslations('Performance');
  const [cycles, setCycles] = useState<PerformanceCycle[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(true);

  const loadCycles = useCallback(async () => {
    setCyclesLoading(true);
    try {
      const { data } = await listCycles();
      setCycles(data);
    } catch {
      setCycles([]);
    } finally {
      setCyclesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCycles();
  }, [loadCycles]);

  const handleCreateAnnualCycle = async () => {
    const year = new Date().getFullYear();
    try {
      await createCycle({
        name: `${year} Annual Review`,
        cycleType: 'annual',
        periodStart: `${year}-01-01`,
        periodEnd: `${year}-12-31`,
        peerFeedbackEnabled: false,
      });
      await loadCycles();
    } catch (err) {
      console.error(err instanceof ApiRequestError ? err.message : err);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activateCycle(id);
      await loadCycles();
    } catch (err) {
      console.error(err instanceof ApiRequestError ? err.message : err);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PerformanceDashboardView showAdminHints />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('cycles_title')}</h2>
            <p className="text-sm text-gray-500">{t('cycles_subtitle')}</p>
          </div>
          <Button type="button" className="gap-2" onClick={() => void handleCreateAnnualCycle()}>
            <Calendar className="size-4" aria-hidden />
            {t('create_annual_cycle')}
          </Button>
        </div>

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
                ) : null}
            />
          </DataTable>
        </Card>
      </section>
    </div>
  );
}
