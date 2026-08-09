'use client';

import type { DocumentTemplate, DocumentTemplateAudience } from '@/libs/api/documents';
import { AlertCircle, FileText, Plus, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';
import { DocumentTemplateWorkspace } from '@/components/documents/DocumentTemplateWorkspace';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  createDocumentTemplate,
  listDocumentTemplates,
  publishedVersionNumber,
} from '@/libs/api/documents';

const DOC_TYPES = [
  { labelKey: 'type_offer_letter' as const, value: 'offer_letter' },
  { labelKey: 'type_contract' as const, value: 'contract' },
  { labelKey: 'type_nda' as const, value: 'nda' },
  { labelKey: 'type_sow' as const, value: 'sow' },
  { labelKey: 'type_other' as const, value: 'other' },
];

const AUDIENCES: { labelKey: 'audience_employee' | 'audience_contractor' | 'audience_shared'; value: DocumentTemplateAudience }[] = [
  { labelKey: 'audience_employee', value: 'employee' },
  { labelKey: 'audience_contractor', value: 'contractor' },
  { labelKey: 'audience_shared', value: 'shared' },
];

export default function PeopleOpsTemplatesPage() {
  const t = useTranslations('DocumentTemplates');
  const [items, setItems] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [documentType, setDocumentType] = useState('offer_letter');
  const [audience, setAudience] = useState<DocumentTemplateAudience>('employee');
  const [countryCode, setCountryCode] = useState('');
  const [workspaceTemplate, setWorkspaceTemplate] = useState<DocumentTemplate | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listDocumentTemplates();
      setItems(data ?? []);
    } catch (err) {
      setItems([]);
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setCode('');
    setName('');
    setDocumentType('offer_letter');
    setAudience('employee');
    setCountryCode('');
    setFormError(null);
  };

  const handleCreate = async () => {
    if (!code.trim()) {
      setFormError(t('error_code_required'));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const { data } = await createDocumentTemplate({
        code: code.trim(),
        name: name.trim() || undefined,
        documentType,
        audience,
        countryCode: countryCode.trim() || undefined,
      });
      setDialogOpen(false);
      resetForm();
      await load();
      setWorkspaceTemplate(data);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t('error_create'));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton variant="table" rows={5} />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-16 lg:pb-0">
      <OfflineBanner />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            severity="secondary"
            outlined
            size="small"
            className="gap-2"
            onClick={() => void load()}
          >
            <RefreshCw className="size-3.5" aria-hidden />
            {t('refresh')}
          </Button>
          <Button
            type="button"
            size="small"
            className="gap-2"
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="size-3.5" aria-hidden />
            {t('new_template')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </div>
          <Button type="button" severity="secondary" size="small" onClick={() => void load()}>
            {t('retry')}
          </Button>
        </div>
      )}

      {!error && items.length === 0 && (
        <EmptyState
          icon={FileText}
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={t('new_template')}
          onAction={() => {
            resetForm();
            setDialogOpen(true);
          }}
        />
      )}

      {!error && items.length > 0 && (
        <DataTable value={items} className="text-sm" stripedRows>
          <Column
            header={t('col_name')}
            body={(row: DocumentTemplate) => (
              <div>
                <p className="font-medium text-gray-900">{row.name || row.code}</p>
                <p className="text-xs text-gray-500">{row.code}</p>
              </div>
            )}
          />
          <Column
            header={t('col_type')}
            body={(row: DocumentTemplate) => row.documentType.replaceAll('_', ' ')}
          />
          <Column
            header={t('col_audience')}
            body={(row: DocumentTemplate) => String(row.audience)}
          />
          <Column
            header={t('col_country')}
            body={(row: DocumentTemplate) => row.countryCode ?? t('all_countries')}
          />
          <Column
            header={t('col_status')}
            body={(row: DocumentTemplate) => (
              <Tag value={String(row.status)} />
            )}
          />
          <Column
            header={t('col_version')}
            body={(row: DocumentTemplate) => {
              const version = publishedVersionNumber(row);
              return version
                ? t('published_version', { version })
                : t('no_published_version');
            }}
          />
          <Column
            body={(row: DocumentTemplate) => (
              <Button
                type="button"
                link
                className="p-0 text-sm font-medium"
                onClick={() => setWorkspaceTemplate(row)}
              >
                {t('open_editor')}
              </Button>
            )}
          />
        </DataTable>
      )}

      <Dialog
        header={t('new_template_title')}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        className="w-full max-w-md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button type="button" severity="secondary" label={t('cancel')} onClick={() => setDialogOpen(false)} />
            <Button type="button" label={t('create')} loading={saving} onClick={() => void handleCreate()} />
          </div>
        )}
      >
        <div className="space-y-3">
          {formError && <Message severity="error" text={formError} className="w-full" />}
          <div className="flex flex-col gap-1">
            <label htmlFor="tpl-code" className="text-sm font-medium text-gray-700">{t('field_code')}</label>
            <InputText id="tpl-code" value={code} onChange={e => setCode(e.target.value)} placeholder={t('field_code_placeholder')} className="w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="tpl-name" className="text-sm font-medium text-gray-700">{t('field_name')}</label>
            <InputText id="tpl-name" value={name} onChange={e => setName(e.target.value)} placeholder={t('field_name_placeholder')} className="w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="tpl-type" className="text-sm font-medium text-gray-700">{t('field_type')}</label>
            <Dropdown
              inputId="tpl-type"
              value={documentType}
              options={DOC_TYPES.map(opt => ({ label: t(opt.labelKey), value: opt.value }))}
              onChange={e => setDocumentType(e.value)}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="tpl-audience" className="text-sm font-medium text-gray-700">{t('field_audience')}</label>
            <Dropdown
              inputId="tpl-audience"
              value={audience}
              options={AUDIENCES.map(opt => ({ label: t(opt.labelKey), value: opt.value }))}
              onChange={e => setAudience(e.value)}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="tpl-country" className="text-sm font-medium text-gray-700">{t('field_country')}</label>
            <InputText id="tpl-country" value={countryCode} onChange={e => setCountryCode(e.target.value)} placeholder={t('field_country_placeholder')} className="w-full" />
          </div>
        </div>
      </Dialog>

      <DocumentTemplateWorkspace
        template={workspaceTemplate}
        visible={workspaceTemplate !== null}
        onHide={() => setWorkspaceTemplate(null)}
        onChanged={() => void load()}
      />
    </div>
  );
}
