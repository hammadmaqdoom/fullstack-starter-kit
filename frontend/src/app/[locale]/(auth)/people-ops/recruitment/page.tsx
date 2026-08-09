'use client';

import type { EmploymentType } from '@/libs/api/country-config';
import type { JobRequisition, RequisitionStatus } from '@/libs/api/recruitment';
import type { Worker } from '@/libs/api/workers';
import {
  AlertCircle,
  Briefcase,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ApiRequestError } from '@/libs/api/client';
import { listEmploymentTypes } from '@/libs/api/country-config';
import {
  createRequisition,
  listRequisitions,
  updateRequisition,
} from '@/libs/api/recruitment';
import { listWorkers } from '@/libs/api/workers';
import { listDivisions, type Division } from '@/libs/api/org-admin';
import { Link } from '@/libs/I18nNavigation';

const STATUS_SEVERITY: Record<RequisitionStatus, 'secondary' | 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'secondary',
  pending_division_head: 'warning',
  pending_people_ops: 'warning',
  open: 'success',
  on_hold: 'info',
  closed: 'secondary',
  cancelled: 'danger',
};

const NEXT_STATUS: Partial<Record<RequisitionStatus, RequisitionStatus>> = {
  pending_division_head: 'pending_people_ops',
  pending_people_ops: 'open',
};

export default function RecruitmentPage() {
  const t = useTranslations('Recruitment');

  const [divisions, setDivisions] = useState<Division[]>([]);
  useEffect(() => {
    void listDivisions().then((r) => setDivisions(r.data)).catch(() => setDivisions([]));
  }, []);
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [divisionId, setDivisionId] = useState<string | null>(null);
  const [employmentTypeId, setEmploymentTypeId] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [hiringManagerWorkerId, setHiringManagerWorkerId] = useState<string | null>(null);
  const [headcount, setHeadcount] = useState<number | null>(1);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const countryOptions = [
    { label: 'Pakistan', value: 'PK' },
    { label: 'UAE', value: 'AE' },
    { label: 'Singapore', value: 'SG' },
  ];

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [reqRes, etRes, workerRes] = await Promise.all([
        listRequisitions(),
        listEmploymentTypes(),
        listWorkers({ status: 'active', limit: 200 }),
      ]);
      setRequisitions(reqRes.data);
      setEmploymentTypes(etRes.data);
      setWorkers(workerRes.data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setRequisitions([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setTitle('');
    setDivisionId(null);
    setEmploymentTypeId(null);
    setCountryCode(null);
    setHiringManagerWorkerId(null);
    setHeadcount(1);
    setJustification('');
  };

  const handleCreate = async () => {
    if (!title.trim() || !employmentTypeId || !countryCode || !hiringManagerWorkerId) {
      return;
    }
    setSubmitting(true);
    try {
      await createRequisition({
        title: title.trim(),
        divisionId: divisionId ?? undefined,
        employmentTypeId,
        countryCode,
        hiringManagerWorkerId,
        headcount: headcount ?? 1,
        justification: justification.trim() || undefined,
      });
      setDialogOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvance = async (requisition: JobRequisition) => {
    const next = NEXT_STATUS[requisition.status];
    if (!next) {
      return;
    }
    try {
      await updateRequisition(requisition.id, { status: next });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    }
  };

  const handleClose = async (requisition: JobRequisition, status: 'on_hold' | 'closed' | 'cancelled') => {
    try {
      await updateRequisition(requisition.id, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    }
  };

  const workerName = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    return worker ? `${worker.firstName} ${worker.lastName}` : workerId;
  };

  if (isLoading) {
    return <PageSkeleton variant="table" rows={5} />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Button type="button" className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" aria-hidden />
          {t('add_requisition')}
        </Button>
      </div>

      {error && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </div>
          <Button type="button" severity="secondary" size="small" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!error && requisitions.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={t('add_requisition')}
          onAction={() => setDialogOpen(true)}
        />
      )}

      {requisitions.length > 0 && (
        <DataTable value={requisitions} dataKey="id" size="small">
          <Column
            field="title"
            header={t('col_title')}
            body={(row: JobRequisition) => (
              <Link href={`/people-ops/recruitment/${row.id}`} className="font-medium text-gray-900 hover:underline">
                {row.title}
              </Link>
            )}
          />
          <Column
            header={t('col_hiring_manager')}
            body={(row: JobRequisition) => workerName(row.hiringManagerWorkerId)}
          />
          <Column
            header={t('col_headcount')}
            body={(row: JobRequisition) => `${row.filledCount} / ${row.headcount}`}
          />
          <Column field="countryCode" header={t('col_country')} />
          <Column
            header={t('col_status')}
            body={(row: JobRequisition) => (
              <Tag value={t(`status_${row.status}` as 'status_draft')} severity={STATUS_SEVERITY[row.status]} />
            )}
          />
          <Column
            header={t('col_actions')}
            body={(row: JobRequisition) => (
              <div className="flex gap-1.5">
                {NEXT_STATUS[row.status] && (
                  <Button type="button" size="small" outlined onClick={() => void handleAdvance(row)}>
                    {t(row.status === 'pending_division_head' ? 'approve' : 'open')}
                  </Button>
                )}
                {row.status === 'open' && (
                  <Button type="button" size="small" severity="secondary" outlined onClick={() => void handleClose(row, 'on_hold')}>
                    {t('hold')}
                  </Button>
                )}
                {['open', 'on_hold', 'pending_division_head', 'pending_people_ops'].includes(row.status) && (
                  <Button type="button" size="small" severity="danger" outlined onClick={() => void handleClose(row, 'cancelled')}>
                    {t('cancel_requisition')}
                  </Button>
                )}
              </div>
            )}
          />
        </DataTable>
      )}

      <Dialog
        header={t('add_requisition')}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        modal
        className="w-full max-w-lg"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="req-title">{t('col_title')}</label>
            <InputText id="req-title" value={title} onChange={e => setTitle(e.target.value)} className="w-full" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="req-division">{t('division')}</label>
              <Dropdown
                inputId="req-division"
                value={divisionId}
                onChange={e => setDivisionId(e.value)}
                options={divisions.map(d => ({ label: d.name, value: d.id }))}
                placeholder={t('select_division')}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="req-country">{t('col_country')}</label>
              <Dropdown
                inputId="req-country"
                value={countryCode}
                onChange={e => setCountryCode(e.value)}
                options={countryOptions}
                placeholder={t('select_country')}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="req-employment-type">{t('employment_type')}</label>
            <Dropdown
              inputId="req-employment-type"
              value={employmentTypeId}
              onChange={e => setEmploymentTypeId(e.value)}
              options={employmentTypes.map(et => ({ label: et.displayName, value: et.id }))}
              placeholder={t('select_employment_type')}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="req-hiring-manager">{t('col_hiring_manager')}</label>
            <Dropdown
              inputId="req-hiring-manager"
              value={hiringManagerWorkerId}
              onChange={e => setHiringManagerWorkerId(e.value)}
              options={workers.map(w => ({ label: `${w.firstName} ${w.lastName}`, value: w.id }))}
              filter
              placeholder={t('select_hiring_manager')}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="req-headcount">{t('col_headcount')}</label>
            <InputNumber inputId="req-headcount" value={headcount} onValueChange={e => setHeadcount(e.value ?? 1)} min={1} showButtons className="w-full" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="req-justification">{t('justification')}</label>
            <InputTextarea id="req-justification" value={justification} onChange={e => setJustification(e.target.value)} rows={3} className="w-full" />
          </div>

          <Message severity="info" text={t('approval_hint')} className="w-full" />

          <Button type="button" loading={submitting} onClick={() => void handleCreate()}>
            {t('save')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
