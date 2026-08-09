'use client';

import type {
  ComplianceDashboardRow,
  PolicyCategory,
  PolicyListItem,
} from '@/libs/api/policies';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  createPolicy,
  getComplianceDashboard,
  listPolicies,
  publishPolicy,
} from '@/libs/api/policies';
import { ClipboardList, Plus, RefreshCw, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { TabPanel, TabView } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';

function complianceLabel(policy: PolicyListItem): string {
  if (
    typeof policy.acknowledgedCount === 'number'
    && typeof policy.totalAssigned === 'number'
    && policy.totalAssigned > 0
  ) {
    return `${policy.acknowledgedCount}/${policy.totalAssigned}`;
  }
  if (typeof policy.compliancePercent === 'number') {
    return `${Math.round(policy.compliancePercent)}%`;
  }
  if (typeof policy.pendingCount === 'number') {
    return String(policy.pendingCount);
  }
  return '—';
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function PeopleOpsPoliciesPage() {
  const t = useTranslations('Policies');
  const [policies, setPolicies] = useState<PolicyListItem[]>([]);
  const [compliance, setCompliance] = useState<ComplianceDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PolicyCategory>('hr');
  const [contentHtml, setContentHtml] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(todayIsoDate());
  const [publishOnCreate, setPublishOnCreate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<PolicyListItem | null>(null);
  const [publishContent, setPublishContent] = useState('');
  const [publishEffective, setPublishEffective] = useState(todayIsoDate());
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const categoryOptions = [
    { label: t('category_hr'), value: 'hr' },
    { label: t('category_security'), value: 'security' },
    { label: t('category_conduct'), value: 'conduct' },
    { label: t('category_it'), value: 'it' },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [policiesRes, complianceRes] = await Promise.all([
        listPolicies(),
        getComplianceDashboard(),
      ]);
      setPolicies(policiesRes.data ?? []);
      setCompliance(complianceRes.data ?? []);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setPolicies([]);
      setCompliance([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setCode('');
    setTitle('');
    setCategory('hr');
    setContentHtml('');
    setEffectiveFrom(todayIsoDate());
    setPublishOnCreate(true);
    setFormError(null);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const { data: policy } = await createPolicy({
        code: code.trim().toUpperCase(),
        title: title.trim(),
        category,
      });
      if (publishOnCreate) {
        if (!contentHtml.trim()) {
          setFormError(t('error_content_required'));
          setSaving(false);
          return;
        }
        await publishPolicy(policy.id, {
          contentHtml: contentHtml.trim(),
          effectiveFrom,
        });
      }
      setCreateOpen(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError ? err.message : t('error_create'),
      );
    } finally {
      setSaving(false);
    }
  };

  const openPublish = (row: PolicyListItem) => {
    setPublishTarget(row);
    setPublishContent('');
    setPublishEffective(todayIsoDate());
    setPublishError(null);
    setPublishOpen(true);
  };

  const handlePublish = async () => {
    if (!publishTarget) {
      return;
    }
    setPublishing(true);
    setPublishError(null);
    try {
      await publishPolicy(publishTarget.id, {
        contentHtml: publishContent.trim() || undefined,
        effectiveFrom: publishEffective,
      });
      setPublishOpen(false);
      await load();
    } catch (err) {
      setPublishError(
        err instanceof ApiRequestError ? err.message : t('error_publish'),
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <OfflineBanner />

      <PageHeader
        title={t('ops_title')}
        description={t('ops_subtitle')}
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
              {t('create_cta')}
            </Button>
          </div>
        )}
      />

      {loading && (
        <div className="space-y-3">
          <Skeleton height="2.5rem" />
          <Skeleton height="12rem" />
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

      {!loading && !error && (
        <TabView>
          <TabPanel header={t('tab_policies')}>
            {policies.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={t('empty_ops_title')}
                description={t('empty_ops_description')}
                actionLabel={t('create_cta')}
                onAction={openCreate}
              />
            ) : (
              <DataTable
                value={policies}
                dataKey="id"
                className="text-sm"
                stripedRows
                emptyMessage={t('empty_ops_title')}
              >
                <Column field="title" header={t('col_title')} />
                <Column field="code" header={t('col_code')} style={{ width: '8rem' }} />
                <Column
                  field="category"
                  header={t('col_category')}
                  body={(row: PolicyListItem) => (
                    <Tag value={t(`category_${row.category}`)} severity="info" />
                  )}
                  style={{ width: '8rem' }}
                />
                <Column
                  field="currentVersion"
                  header={t('col_version')}
                  body={(row: PolicyListItem) => row.currentVersion ?? '—'}
                  style={{ width: '6rem' }}
                />
                <Column
                  header={t('col_status')}
                  body={(row: PolicyListItem) => (
                    <Tag
                      value={row.isActive ? t('status_active') : t('status_inactive')}
                      severity={row.isActive ? 'success' : 'secondary'}
                    />
                  )}
                  style={{ width: '7rem' }}
                />
                <Column
                  header={t('col_compliance')}
                  body={(row: PolicyListItem) => (
                    <span className="tabular-nums text-gray-700">
                      {complianceLabel(row)}
                    </span>
                  )}
                  style={{ width: '8rem' }}
                />
                <Column
                  header=""
                  style={{ width: '8rem' }}
                  body={(row: PolicyListItem) => (
                    <Button
                      type="button"
                      size="small"
                      severity="secondary"
                      outlined
                      className="gap-1"
                      onClick={() => openPublish(row)}
                    >
                      <Send className="size-3.5" aria-hidden />
                      {t('publish')}
                    </Button>
                  )}
                />
              </DataTable>
            )}
          </TabPanel>

          <TabPanel header={t('tab_compliance')}>
            {compliance.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={t('empty_compliance_title')}
                description={t('empty_compliance_description')}
              />
            ) : (
              <DataTable
                value={compliance}
                dataKey="policyVersionId"
                className="text-sm"
                stripedRows
              >
                <Column field="policyTitle" header={t('col_title')} />
                <Column field="policyCode" header={t('col_code')} style={{ width: '8rem' }} />
                <Column field="version" header={t('col_version')} style={{ width: '6rem' }} />
                <Column
                  field="populationCount"
                  header={t('col_population')}
                  style={{ width: '7rem' }}
                />
                <Column
                  field="acknowledgedCount"
                  header={t('col_acked')}
                  style={{ width: '7rem' }}
                />
                <Column
                  field="pendingCount"
                  header={t('col_pending')}
                  style={{ width: '7rem' }}
                />
              </DataTable>
            )}
          </TabPanel>
        </TabView>
      )}

      <Dialog
        header={t('create_title')}
        visible={createOpen}
        onHide={() => setCreateOpen(false)}
        modal
        dismissableMask
        className="w-full max-w-lg"
        footer={(
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              severity="secondary"
              outlined
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreate()}
              loading={saving}
              disabled={!code.trim() || !title.trim()}
            >
              {publishOnCreate ? t('create_and_publish') : t('create_cta')}
            </Button>
          </div>
        )}
      >
        <div className="space-y-3">
          {formError && <Message severity="error" text={formError} className="w-full" />}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_code')}</label>
            <InputText value={code} onChange={e => setCode(e.target.value)} className="w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_title')}</label>
            <InputText value={title} onChange={e => setTitle(e.target.value)} className="w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_category')}</label>
            <Dropdown
              value={category}
              options={categoryOptions}
              onChange={e => setCategory(e.value)}
              className="w-full"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={publishOnCreate}
              onChange={e => setPublishOnCreate(e.target.checked)}
            />
            {t('publish_on_create')}
          </label>
          {publishOnCreate && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">{t('field_effective')}</label>
                <InputText
                  type="date"
                  value={effectiveFrom}
                  onChange={e => setEffectiveFrom(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">{t('field_content')}</label>
                <InputTextarea
                  value={contentHtml}
                  onChange={e => setContentHtml(e.target.value)}
                  rows={6}
                  className="w-full"
                  placeholder={t('field_content_placeholder')}
                />
              </div>
            </>
          )}
        </div>
      </Dialog>

      <Dialog
        header={t('publish_title', { title: publishTarget?.title ?? '' })}
        visible={publishOpen}
        onHide={() => setPublishOpen(false)}
        modal
        dismissableMask
        className="w-full max-w-lg"
        footer={(
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              severity="secondary"
              outlined
              onClick={() => setPublishOpen(false)}
              disabled={publishing}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void handlePublish()}
              loading={publishing}
            >
              {t('publish')}
            </Button>
          </div>
        )}
      >
        <div className="space-y-3">
          {publishError && (
            <Message severity="error" text={publishError} className="w-full" />
          )}
          <p className="text-sm text-gray-600">{t('publish_help')}</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_effective')}</label>
            <InputText
              type="date"
              value={publishEffective}
              onChange={e => setPublishEffective(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_content')}</label>
            <InputTextarea
              value={publishContent}
              onChange={e => setPublishContent(e.target.value)}
              rows={6}
              className="w-full"
              placeholder={t('field_content_placeholder')}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
