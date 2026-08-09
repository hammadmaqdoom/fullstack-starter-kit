'use client';

import type {
  DocumentRegisterItem,
  GeneratedDocument,
  GeneratedDocumentStatus,
  LegalEntity,
} from '@/libs/api/documents';
import type { DirectoryEntry } from '@/libs/api/org';
import {
  AlertCircle,
  Download,
  Eye,
  FileText,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { WorkerPicker } from '@/components/shared/WorkerPicker';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  exportDocument,
  formatLegalEntityPreviewBlock,
  getGeneratedDocument,
  issueDocument,
  listDocumentRegister,
  listDocumentTemplates,
  listLegalEntities,
  resolveDocumentPreviewBody,
} from '@/libs/api/documents';

const STATUSES: GeneratedDocumentStatus[] = ['draft', 'issued', 'sent_for_signature', 'signed', 'archived'];
const ROWS_PER_PAGE = 20;

const STATUS_SEVERITY: Record<string, 'secondary' | 'success' | 'info' | 'warning'> = {
  draft: 'secondary',
  issued: 'success',
  sent_for_signature: 'info',
  signed: 'success',
  archived: 'warning',
};

export default function DocumentRegisterPage() {
  const t = useTranslations('DocumentRegister');

  const [items, setItems] = useState<DocumentRegisterItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [templateCodes, setTemplateCodes] = useState<string[]>([]);

  const [filterLegalEntityId, setFilterLegalEntityId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<GeneratedDocumentStatus | null>(null);
  const [filterTemplateCode, setFilterTemplateCode] = useState<string | null>(null);
  const [filterWorker, setFilterWorker] = useState<DirectoryEntry | null>(null);

  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<GeneratedDocument | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{
    templateLabel: string;
    legalEntityLabel: string;
  } | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, meta } = await listDocumentRegister({
        page: targetPage,
        limit: ROWS_PER_PAGE,
        legalEntityId: filterLegalEntityId ?? undefined,
        status: filterStatus ?? undefined,
        templateCode: filterTemplateCode ?? undefined,
        workerId: filterWorker?.id ?? undefined,
      });
      setItems(data);
      setTotalRecords(Number(meta.total ?? data.length));
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setItems([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filterLegalEntityId, filterStatus, filterTemplateCode, filterWorker, t]);

  useEffect(() => {
    void load(1);
  }, [load]);

  useEffect(() => {
    async function loadFilters() {
      try {
        const [entitiesRes, templatesRes] = await Promise.all([
          listLegalEntities(),
          listDocumentTemplates(),
        ]);
        setLegalEntities(entitiesRes.data);
        setTemplateCodes([...new Set(templatesRes.data.map(tpl => tpl.code))]);
      } catch {
        setLegalEntities([]);
        setTemplateCodes([]);
      }
    }
    void loadFilters();
  }, []);

  const legalEntityLabel = useCallback((id?: string | null) => {
    if (!id) {
      return t('no_legal_entity');
    }
    const entity = legalEntities.find(e => e.id === id);
    return entity ? (entity.tradingName?.trim() || entity.registeredName) : id.slice(0, 8);
  }, [legalEntities, t]);

  const previewBody = useMemo(() => {
    if (!previewDoc) {
      return '';
    }
    const body
      = typeof previewDoc.templateSnapshot?.body === 'string'
        ? previewDoc.templateSnapshot.body
        : '';
    const entity = previewDoc.legalEntityId
      ? legalEntities.find(e => e.id === previewDoc.legalEntityId)
      : undefined;
    const legalMerge: Record<string, unknown> = {};
    if (entity) {
      legalMerge['legal_entity.registered_name'] = entity.registeredName;
      legalMerge['legal_entity.trading_name'] = entity.tradingName ?? '';
      legalMerge['legal_entity.country_code'] = entity.countryCode;
      legalMerge['legal_entity.address_line_1'] = entity.addressLine1 ?? '';
      legalMerge['legal_entity.address_line_2'] = entity.addressLine2 ?? '';
      legalMerge['legal_entity.city'] = entity.city ?? '';
      legalMerge['legal_entity.state_province'] = entity.stateProvince ?? '';
      legalMerge['legal_entity.postal_code'] = entity.postalCode ?? '';
      legalMerge['legal_entity.phone'] = entity.phone ?? '';
      legalMerge['legal_entity.email'] = entity.email ?? '';
      legalMerge['legal_entity.website'] = entity.website ?? '';
      legalMerge['legal_entity.footer_text'] = entity.footerText ?? '';
      legalMerge['legal_entity.address_block'] = [
        entity.addressLine1,
        entity.addressLine2,
        [entity.city, entity.stateProvince, entity.postalCode].filter(Boolean).join(', '),
        entity.countryCode,
      ].filter(Boolean).join('\n');
      legalMerge['legal_entity.statutory_ids_block'] = (entity.statutoryIds ?? [])
        .map((row) => {
          const labels: Record<string, string> = {
            ntn: 'NTN',
            secp_registration: 'SECP Registration',
            eobi_employer_number: 'EOBI Employer No.',
            trade_licence_number: 'Trade Licence',
            mohre_establishment_id: 'MOHRE Establishment ID',
            vat_trn: 'VAT TRN',
            uen: 'UEN',
            cpf_employer_ref: 'CPF Employer Ref',
            gst_registration: 'GST Registration',
          };
          return `${labels[row.fieldKey] ?? row.fieldKey}: ${row.fieldValue}`;
        })
        .join('\n');
      for (const row of entity.statutoryIds ?? []) {
        legalMerge[`legal_entity.${row.fieldKey}`] = row.fieldValue;
      }
    }
    return resolveDocumentPreviewBody(body, {
      ...legalMerge,
      ...(previewDoc.mergeData ?? {}),
    });
  }, [previewDoc, legalEntities]);

  const previewCompanyBlock = useMemo(() => {
    if (!previewDoc?.legalEntityId) {
      return null;
    }
    const entity = legalEntities.find(e => e.id === previewDoc.legalEntityId);
    return entity ? formatLegalEntityPreviewBlock(entity) : null;
  }, [previewDoc, legalEntities]);

  const handlePreview = async (row: DocumentRegisterItem) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewDoc(null);
    setPreviewMeta({
      templateLabel: row.templateVersion?.template?.name
        ?? row.templateVersion?.template?.code
        ?? '—',
      legalEntityLabel: legalEntityLabel(row.legalEntityId),
    });
    try {
      const { data } = await getGeneratedDocument(row.id);
      setPreviewDoc(data);
    } catch (err) {
      if (row.templateSnapshot?.body) {
        setPreviewDoc(row);
      } else {
        setPreviewError(err instanceof ApiRequestError ? err.message : t('error_preview'));
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleIssue = async (row: DocumentRegisterItem | GeneratedDocument) => {
    setActioningId(row.id);
    setActionError(null);
    try {
      await issueDocument(row.id);
      setPreviewOpen(false);
      await load(page);
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_issue'));
    } finally {
      setActioningId(null);
    }
  };

  const handleExport = async (row: DocumentRegisterItem) => {
    setActioningId(row.id);
    setActionError(null);
    try {
      const { data } = await exportDocument(row.id, 'full_digital');
      if (typeof window !== 'undefined' && data.blobUrl) {
        window.open(data.blobUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_export'));
    } finally {
      setActioningId(null);
    }
  };

  if (isLoading && items.length === 0 && page === 1 && !error) {
    return <PageSkeleton variant="table" rows={5} />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <OfflineBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Button
          type="button"
          severity="secondary"
          outlined
          className="gap-2 self-start"
          disabled={isLoading}
          onClick={() => void load(page)}
        >
          <RefreshCw className="size-4" aria-hidden />
          {t('refresh')}
        </Button>
      </div>

      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="filter-legal-entity" className="mb-1 block text-xs font-medium text-gray-600">{t('filter_legal_entity')}</label>
          <Dropdown
            inputId="filter-legal-entity"
            value={filterLegalEntityId}
            options={legalEntities.map(entity => ({ label: entity.tradingName?.trim() || entity.registeredName, value: entity.id }))}
            onChange={e => setFilterLegalEntityId(e.value)}
            showClear
            placeholder={t('filter_all')}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="filter-status" className="mb-1 block text-xs font-medium text-gray-600">{t('filter_status')}</label>
          <Dropdown
            inputId="filter-status"
            value={filterStatus}
            options={STATUSES.map(value => ({ label: t(`status_${value}`), value }))}
            onChange={e => setFilterStatus(e.value)}
            showClear
            placeholder={t('filter_all')}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="filter-template" className="mb-1 block text-xs font-medium text-gray-600">{t('filter_template')}</label>
          <Dropdown
            inputId="filter-template"
            value={filterTemplateCode}
            options={templateCodes.map(code => ({ label: code, value: code }))}
            onChange={e => setFilterTemplateCode(e.value)}
            showClear
            placeholder={t('filter_all')}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="filter-worker" className="mb-1 block text-xs font-medium text-gray-600">{t('filter_worker')}</label>
          <WorkerPicker
            inputId="filter-worker"
            value={filterWorker}
            onChange={setFilterWorker}
            placeholder={t('filter_worker_placeholder')}
          />
        </div>
      </div>

      {actionError && (
        <Message severity="error" text={actionError} className="w-full" />
      )}

      {error && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </div>
          <Button type="button" severity="secondary" size="small" onClick={() => void load(page)}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!error && !isLoading && items.length === 0 && (
        <EmptyState
          icon={FileText}
          title={t('empty_title')}
          description={t('empty_description')}
        />
      )}

      {!error && items.length > 0 && (
        <DataTable
          value={items}
          dataKey="id"
          className="text-sm"
          stripedRows
          loading={isLoading}
          paginator
          lazy
          first={(page - 1) * ROWS_PER_PAGE}
          rows={ROWS_PER_PAGE}
          totalRecords={totalRecords}
          onPage={e => void load((e.first ?? 0) / ROWS_PER_PAGE + 1)}
        >
          <Column
            header={t('col_document_number')}
            body={(row: DocumentRegisterItem) => (
              <span className="font-mono text-xs text-gray-700">{row.documentNumber ?? t('not_issued_yet')}</span>
            )}
          />
          <Column
            header={t('col_template')}
            body={(row: DocumentRegisterItem) => row.templateVersion?.template?.name ?? row.templateVersion?.template?.code ?? '—'}
          />
          <Column
            header={t('col_legal_entity')}
            body={(row: DocumentRegisterItem) => legalEntityLabel(row.legalEntityId)}
          />
          <Column
            header={t('col_status')}
            body={(row: DocumentRegisterItem) => (
              <Tag value={t(`status_${row.status}` as 'status_draft')} severity={STATUS_SEVERITY[row.status] ?? 'secondary'} />
            )}
            style={{ width: '10rem' }}
          />
          <Column
            header={t('col_issued_at')}
            body={(row: DocumentRegisterItem) => (row.issuedAt ? row.issuedAt.slice(0, 10) : '—')}
            style={{ width: '8rem' }}
          />
          <Column
            header=""
            body={(row: DocumentRegisterItem) => (
              <div className="flex justify-end gap-1.5">
                <Button
                  type="button"
                  size="small"
                  severity="secondary"
                  outlined
                  className="gap-1"
                  onClick={() => void handlePreview(row)}
                >
                  <Eye className="size-3.5" aria-hidden />
                  {t('preview')}
                </Button>
                {row.status === 'draft' && (
                  <Button
                    type="button"
                    size="small"
                    outlined
                    className="gap-1"
                    disabled={actioningId === row.id}
                    onClick={() => void handleIssue(row)}
                  >
                    <Send className="size-3.5" aria-hidden />
                    {t('issue')}
                  </Button>
                )}
                {row.status !== 'draft' && (
                  <Button
                    type="button"
                    size="small"
                    severity="secondary"
                    outlined
                    className="gap-1"
                    disabled={actioningId === row.id}
                    onClick={() => void handleExport(row)}
                  >
                    <Download className="size-3.5" aria-hidden />
                    {t('export')}
                  </Button>
                )}
              </div>
            )}
            style={{ width: '14rem' }}
          />
        </DataTable>
      )}

      <Dialog
        header={t('preview_title')}
        visible={previewOpen}
        onHide={() => setPreviewOpen(false)}
        modal
        dismissableMask
        className="w-full max-w-2xl"
        footer={(
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              severity="secondary"
              outlined
              label={t('preview_close')}
              onClick={() => setPreviewOpen(false)}
            />
            {previewDoc?.status === 'draft' && (
              <Button
                type="button"
                className="gap-1"
                disabled={actioningId === previewDoc.id}
                onClick={() => void handleIssue(previewDoc)}
              >
                <Send className="size-3.5" aria-hidden />
                {t('issue')}
              </Button>
            )}
          </div>
        )}
      >
        {previewLoading && (
          <div className="space-y-3">
            <Skeleton height="1.5rem" />
            <Skeleton height="10rem" />
          </div>
        )}

        {!previewLoading && previewError && (
          <Message severity="error" text={previewError} className="w-full" />
        )}

        {!previewLoading && previewDoc && (
          <div className="space-y-4">
            {previewDoc.status === 'draft' && (
              <Message severity="info" text={t('preview_draft_hint')} className="w-full" />
            )}
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500">{t('col_template')}</p>
                <p className="text-gray-900">{previewMeta?.templateLabel ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('col_legal_entity')}</p>
                <p className="text-gray-900">{previewMeta?.legalEntityLabel ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('col_status')}</p>
                <Tag
                  value={t(`status_${previewDoc.status}` as 'status_draft')}
                  severity={STATUS_SEVERITY[previewDoc.status] ?? 'secondary'}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('col_document_number')}</p>
                <p className="font-mono text-xs text-gray-700">
                  {previewDoc.documentNumber ?? t('not_issued_yet')}
                </p>
              </div>
            </div>

            {previewCompanyBlock && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">{t('preview_company_label')}</p>
                <pre className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800">
                  {previewCompanyBlock}
                </pre>
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">{t('preview_body_label')}</p>
              {previewBody.trim()
                ? (
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                      {previewBody}
                    </pre>
                  )
                : (
                    <p className="text-sm text-gray-500">{t('preview_empty_body')}</p>
                  )}
            </div>

            {Object.keys(previewDoc.mergeData ?? {}).length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">{t('preview_merge_label')}</p>
                <ul className="space-y-1 rounded-lg border border-gray-100 bg-white p-3 text-sm">
                  {Object.entries(previewDoc.mergeData).map(([key, value]) => (
                    <li key={key} className="flex gap-2">
                      <span className="w-40 shrink-0 truncate font-mono text-xs text-gray-500">{key}</span>
                      <span className="text-gray-800">{String(value ?? '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
