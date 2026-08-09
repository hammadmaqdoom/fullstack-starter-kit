'use client';

import type { ObjectiveKeyResult, OrganizationalObjective } from '@/libs/api/talent';
import {
  createKeyResult,
  createObjective,
  listKeyResults,
  listObjectives,
  updateObjective,
} from '@/libs/api/talent';
import { ApiRequestError } from '@/libs/api/client';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, RefreshCw, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';

export function OkrAdminWorkspace() {
  const t = useTranslations('OkrAdmin');
  const [objectives, setObjectives] = useState<OrganizationalObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<'company' | 'division' | 'department'>('company');
  const year = new Date().getFullYear();
  const [periodStart, setPeriodStart] = useState(`${year}-01-01`);
  const [periodEnd, setPeriodEnd] = useState(`${year}-12-31`);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [keyResults, setKeyResults] = useState<ObjectiveKeyResult[]>([]);
  const [krLoading, setKrLoading] = useState(false);
  const [krTitle, setKrTitle] = useState('');
  const [krTarget, setKrTarget] = useState<number | null>(null);
  const [krUnit, setKrUnit] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await listObjectives();
      setObjectives(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadKeyResults = async (objectiveId: string) => {
    setKrLoading(true);
    try {
      const { data } = await listKeyResults(objectiveId);
      setKeyResults(data);
    } catch {
      setKeyResults([]);
    } finally {
      setKrLoading(false);
    }
  };

  const toggleExpand = async (objectiveId: string) => {
    if (expandedId === objectiveId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(objectiveId);
    await loadKeyResults(objectiveId);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createObjective({
        level,
        title: title.trim(),
        description: description.trim() || undefined,
        periodStart,
        periodEnd,
      });
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (id: string, status: 'active' | 'closed') => {
    setError(null);
    try {
      await updateObjective(id, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    }
  };

  const handleAddKr = async () => {
    if (!expandedId || !krTitle.trim()) return;
    setSubmitting(true);
    try {
      await createKeyResult(expandedId, {
        title: krTitle.trim(),
        targetValue: krTarget ?? undefined,
        unit: krUnit.trim() || undefined,
        weightPercent: 100,
      });
      setKrTitle('');
      setKrTarget(null);
      setKrUnit('');
      await loadKeyResults(expandedId);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton height="2rem" className="w-64" />
        <Skeleton height="12rem" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t('add_objective')}
          </Button>
          <Button type="button" severity="secondary" outlined className="gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      {objectives.length === 0 ? (
        <EmptyState
          icon={Target}
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={t('add_objective')}
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <Card>
          <DataTable value={objectives} size="small">
            <Column field="title" header={t('objective_title')} />
            <Column field="level" header={t('level')} />
            <Column
              header={t('period')}
              body={(row: OrganizationalObjective) =>
                `${row.periodStart} – ${row.periodEnd}`
              }
            />
            <Column
              header={t('status')}
              body={(row: OrganizationalObjective) => (
                <Tag value={row.status} />
              )}
            />
            <Column
              header={t('actions')}
              body={(row: OrganizationalObjective) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="small"
                    outlined
                    onClick={() => void toggleExpand(row.id)}
                  >
                    {t('key_results')}
                  </Button>
                  {row.status === 'draft' && (
                    <Button
                      type="button"
                      size="small"
                      onClick={() => void handleStatus(row.id, 'active')}
                    >
                      {t('activate')}
                    </Button>
                  )}
                  {row.status === 'active' && (
                    <Button
                      type="button"
                      size="small"
                      severity="secondary"
                      onClick={() => void handleStatus(row.id, 'closed')}
                    >
                      {t('close')}
                    </Button>
                  )}
                </div>
              )}
            />
          </DataTable>
        </Card>
      )}

      {expandedId && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t('key_results')}
          </h2>
          {krLoading ? (
            <p className="text-sm text-gray-500">{t('loading_key_results')}</p>
          ) : keyResults.length === 0 ? (
            <p className="text-sm text-gray-500">{t('no_key_results')}</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {keyResults.map((kr) => (
                <li key={kr.id} className="rounded-md border border-gray-100 px-3 py-2 text-sm">
                  <span className="font-medium text-gray-900">{kr.title}</span>
                  {kr.targetValue != null && (
                    <span className="ml-2 text-gray-500">
                      {kr.currentValue}
                      {' / '}
                      {kr.targetValue}
                      {kr.unit ? ` ${kr.unit}` : ''}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            <InputText
              value={krTitle}
              onChange={(e) => setKrTitle(e.target.value)}
              placeholder={t('key_result_title_placeholder')}
              className="w-full"
            />
            <InputNumber
              value={krTarget}
              onValueChange={(e) => setKrTarget(e.value ?? null)}
              placeholder={t('target_value')}
              className="w-full"
            />
            <InputText
              value={krUnit}
              onChange={(e) => setKrUnit(e.target.value)}
              placeholder={t('unit')}
              className="w-full"
            />
          </div>
          <Button
            type="button"
            className="mt-3"
            loading={submitting}
            onClick={() => void handleAddKr()}
          >
            {t('add_key_result')}
          </Button>
        </Card>
      )}

      <Dialog
        header={t('add_objective')}
        visible={createOpen}
        onHide={() => setCreateOpen(false)}
        modal
        className="w-full max-w-md"
      >
        <div className="space-y-4">
          <InputText
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('objective_title')}
            className="w-full"
          />
          <Dropdown
            value={level}
            options={[
              { label: t('level_company'), value: 'company' },
              { label: t('level_division'), value: 'division' },
              { label: t('level_department'), value: 'department' },
            ]}
            onChange={(e) => setLevel(e.value)}
            className="w-full"
          />
          <InputTextarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('description')}
            rows={3}
            className="w-full"
          />
          <div className="grid grid-cols-2 gap-3">
            <InputText
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full"
            />
            <InputText
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full"
            />
          </div>
          <Button type="button" loading={submitting} onClick={() => void handleCreate()}>
            {t('save')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
