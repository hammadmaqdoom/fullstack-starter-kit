'use client';

import type { PulseSurvey, PulseSurveyResults } from '@/libs/api/talent';
import {
  createPulseSurvey,
  getPulseResults,
  listPulseSurveys,
  updatePulseSurvey,
} from '@/libs/api/talent';
import { ApiRequestError } from '@/libs/api/client';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardList, Plus, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';

export default function PeopleOpsPulsePage() {
  const t = useTranslations('PulseAdmin');
  const [surveys, setSurveys] = useState<PulseSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsSurvey, setResultsSurvey] = useState<PulseSurvey | null>(null);
  const [results, setResults] = useState<PulseSurveyResults | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await listPulseSurveys();
      setSurveys(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await createPulseSurvey({
        title: title.trim(),
        description: description.trim() || undefined,
        questions: [
          {
            id: `q-${Date.now()}`,
            text: 'I feel supported to do my best work.',
            scaleMin: 1,
            scaleMax: 5,
          },
        ],
      });
      setDialogOpen(false);
      setTitle('');
      setDescription('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await updatePulseSurvey(id, { status: 'active' });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    }
  };

  const handleViewResults = async (survey: PulseSurvey) => {
    setResultsSurvey(survey);
    setResults(null);
    setResultsOpen(true);
    setResultsLoading(true);
    try {
      const { data } = await getPulseResults(survey.id);
      setResults(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_results'));
      setResultsOpen(false);
    } finally {
      setResultsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t('create')}
          </Button>
          <Button type="button" severity="secondary" outlined className="gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" aria-hidden />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      <Card>
        <DataTable
          value={surveys}
          loading={loading}
          emptyMessage={
            <EmptyState icon={ClipboardList} title={t('empty')} />
          }
          size="small"
        >
          <Column field="title" header={t('survey_title')} />
          <Column
            header={t('status')}
            body={(row: PulseSurvey) => <Tag value={row.status} />}
          />
          <Column field="anonymityThreshold" header={t('anonymity')} />
          <Column
            header={t('actions')}
            body={(row: PulseSurvey) => (
              <div className="flex flex-wrap gap-2">
                {row.status === 'draft' ? (
                  <Button type="button" size="small" onClick={() => void handleActivate(row.id)}>
                    {t('activate')}
                  </Button>
                ) : null}
                {row.status !== 'draft' ? (
                  <Button
                    type="button"
                    size="small"
                    outlined
                    onClick={() => void handleViewResults(row)}
                  >
                    {t('view_results')}
                  </Button>
                ) : null}
              </div>
            )}
          />
        </DataTable>
      </Card>

      <Dialog
        header={t('create')}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        modal
        className="w-full max-w-md"
      >
        <div className="space-y-4">
          <InputText
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('survey_title')}
            className="w-full"
          />
          <InputTextarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('description')}
            rows={3}
            className="w-full"
          />
          <Button type="button" loading={submitting} onClick={() => void handleCreate()}>
            {t('save')}
          </Button>
        </div>
      </Dialog>

      <Dialog
        header={resultsSurvey ? t('results_title', { title: resultsSurvey.title }) : t('view_results')}
        visible={resultsOpen}
        onHide={() => setResultsOpen(false)}
        modal
        className="w-full max-w-lg"
      >
        {resultsLoading ? (
          <p className="text-sm text-gray-500">{t('results_loading')}</p>
        ) : results?.aggregates == null ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t('anonymity_blocked', {
              count: results?.responseCount ?? 0,
              threshold: resultsSurvey?.anonymityThreshold ?? 0,
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {t('response_count', { count: results.responseCount })}
            </p>
            {(resultsSurvey?.questions ?? []).map((q) => {
              const agg = results.aggregates?.[q.id];
              return (
                <div key={q.id} className="rounded-md border border-gray-100 p-3">
                  <p className="text-sm font-medium text-gray-900">{q.text}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {t('question_average', {
                      average: agg ? agg.average.toFixed(2) : '—',
                      count: agg?.count ?? 0,
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Dialog>
    </div>
  );
}
