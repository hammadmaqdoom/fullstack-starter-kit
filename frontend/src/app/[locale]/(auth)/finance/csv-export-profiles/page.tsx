'use client';

import {
  createCsvExportProfile,
  DEFAULT_CSV_COLUMNS,
  listCsvExportProfiles,
  updateCsvExportProfile,
  type CsvColumn,
  type CsvExportProfile,
} from '@/libs/api/payout-rails';
import { listLegalEntities, type LegalEntity } from '@/libs/api/org-admin';
import { ApiRequestError } from '@/libs/api/client';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ArrowDown, ArrowUp, Plus, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Toast } from 'primereact/toast';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function CsvExportProfilesPage() {
  const t = useTranslations('FinanceCsvProfiles');
  const toast = useRef<Toast>(null);
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [legalEntityId, setLegalEntityId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<CsvExportProfile[]>([]);
  const [name, setName] = useState('PK HBL export');
  const [columns, setColumns] = useState<CsvColumn[]>(DEFAULT_CSV_COLUMNS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const legal = await listLegalEntities();
      setEntities(legal.data);
      const entityId = legalEntityId ?? legal.data[0]?.id ?? null;
      if (!legalEntityId && entityId) setLegalEntityId(entityId);
      if (entityId) {
        const res = await listCsvExportProfiles(entityId);
        setProfiles(res.data);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setLoading(false);
    }
  }, [legalEntityId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function move(index: number, dir: -1 | 1) {
    const next = [...columns].sort((a, b) => a.order - b.order);
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index]!.order;
    next[index]!.order = next[target]!.order;
    next[target]!.order = tmp;
    setColumns([...next].sort((a, b) => a.order - b.order));
  }

  async function createProfile() {
    if (!legalEntityId) return;
    try {
      await createCsvExportProfile({
        legalEntityId,
        name,
        columns,
        isDefault: profiles.length === 0,
      });
      toast.current?.show({ severity: 'success', summary: t('create_success') });
      await load();
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: err instanceof ApiRequestError ? err.message : t('error_create'),
      });
    }
  }

  async function saveExisting(profile: CsvExportProfile) {
    try {
      await updateCsvExportProfile(profile.id, { columns });
      toast.current?.show({ severity: 'success', summary: t('update_success') });
      await load();
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: err instanceof ApiRequestError ? err.message : t('error_update'),
      });
    }
  }

  if (loading) return <PageSkeleton />;

  const ordered = [...columns].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Toast ref={toast} />
      <OfflineBanner />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Button
          type="button"
          outlined
          icon={<RefreshCw className="size-4" />}
          label={t('refresh')}
          onClick={() => void load()}
        />
      </div>
      {error && <Message severity="error" text={error} className="w-full" />}

      <Dropdown
        value={legalEntityId}
        options={entities.map((e) => ({
          label: e.registeredName,
          value: e.id,
        }))}
        onChange={(e) => setLegalEntityId(e.value)}
        className="w-full max-w-md"
      />

      <section className="space-y-3 rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold">{t('field_picker')}</h2>
        <div className="space-y-2">
          {ordered.map((col, index) => (
            <div key={col.key} className="flex items-center gap-3">
              <Checkbox
                inputId={col.key}
                checked={col.enabled}
                onChange={(e) => {
                  setColumns((prev) =>
                    prev.map((c) =>
                      c.key === col.key ? { ...c, enabled: !!e.checked } : c,
                    ),
                  );
                }}
              />
              <label htmlFor={col.key} className="flex-1 text-sm">
                {col.label}
              </label>
              <Button
                type="button"
                text
                icon={<ArrowUp className="size-3.5" />}
                onClick={() => move(index, -1)}
                aria-label={t('move_up')}
              />
              <Button
                type="button"
                text
                icon={<ArrowDown className="size-3.5" />}
                onClick={() => move(index, 1)}
                aria-label={t('move_down')}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <InputText value={name} onChange={(e) => setName(e.target.value)} />
          <Button
            type="button"
            icon={<Plus className="size-4" />}
            label={t('create')}
            onClick={() => void createProfile()}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs text-gray-600">
            <thead>
              <tr>
                {ordered
                  .filter((c) => c.enabled)
                  .map((c) => (
                    <th key={c.key} className="border-b px-2 py-1 font-medium">
                      {c.label}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {ordered
                  .filter((c) => c.enabled)
                  .map((c) => (
                    <td key={c.key} className="px-2 py-1 text-gray-400">
                      …
                    </td>
                  ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <DataTable value={profiles} size="small" emptyMessage={t('empty')}>
        <Column field="name" header={t('col_name')} />
        <Column
          field="isDefault"
          header={t('col_default')}
          body={(r: CsvExportProfile) => (r.isDefault ? t('yes') : t('no'))}
        />
        <Column
          header={t('col_actions')}
          body={(r: CsvExportProfile) => (
            <Button
              type="button"
              text
              label={t('apply_columns')}
              onClick={() => void saveExisting(r)}
            />
          )}
        />
      </DataTable>
    </div>
  );
}
