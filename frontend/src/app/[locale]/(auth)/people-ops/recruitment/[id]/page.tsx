'use client';

import type { Candidate, CandidateStatus, JobRequisition } from '@/libs/api/recruitment';
import {
  AlertCircle,
  ArrowLeft,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ApiRequestError } from '@/libs/api/client';
import {
  createCandidate,
  getRequisition,
  listCandidates,
  updateCandidateStatus,
} from '@/libs/api/recruitment';
import { Link } from '@/libs/I18nNavigation';

const STATUS_SEVERITY: Record<CandidateStatus, 'secondary' | 'info' | 'warning' | 'success' | 'danger'> = {
  applied: 'secondary',
  screening: 'info',
  interview: 'info',
  offer: 'warning',
  hired: 'success',
  rejected: 'danger',
};

const STATUS_FLOW: CandidateStatus[] = ['applied', 'screening', 'interview', 'offer', 'hired'];

export default function RequisitionCandidatesPage() {
  const t = useTranslations('Recruitment');
  const params = useParams<{ id: string }>();
  const requisitionId = params.id;

  const [requisition, setRequisition] = useState<JobRequisition | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');

  const [rejectDialogFor, setRejectDialogFor] = useState<Candidate | null>(null);
  const [rejectedReason, setRejectedReason] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [reqRes, candRes] = await Promise.all([
        getRequisition(requisitionId),
        listCandidates({ requisitionId }),
      ]);
      setRequisition(reqRes.data);
      setCandidates(candRes.data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setIsLoading(false);
    }
  }, [requisitionId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setSource('');
  };

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      await createCandidate({
        requisitionId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        source: source.trim() || undefined,
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

  const handleAdvance = async (candidate: Candidate) => {
    const currentIndex = STATUS_FLOW.indexOf(candidate.status);
    const next = STATUS_FLOW[currentIndex + 1];
    if (!next) {
      return;
    }
    try {
      await updateCandidateStatus(candidate.id, { status: next });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    }
  };

  const handleReject = async () => {
    if (!rejectDialogFor) {
      return;
    }
    try {
      await updateCandidateStatus(rejectDialogFor.id, {
        status: 'rejected',
        rejectedReason: rejectedReason.trim() || undefined,
      });
      setRejectDialogFor(null);
      setRejectedReason('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    }
  };

  if (isLoading) {
    return <PageSkeleton variant="table" rows={5} />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/people-ops/recruitment" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="size-3.5" aria-hidden />
        {t('back_to_requisitions')}
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{requisition?.title ?? t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {requisition ? `${requisition.filledCount} / ${requisition.headcount} ${t('filled_label')}` : t('candidates_subtitle')}
          </p>
        </div>
        <Button type="button" className="gap-2" onClick={() => setDialogOpen(true)} disabled={requisition?.status !== 'open'}>
          <Plus className="size-4" aria-hidden />
          {t('add_candidate')}
        </Button>
      </div>

      {requisition?.status !== 'open' && (
        <Tag value={t('candidates_require_open')} severity="warning" />
      )}

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

      {!error && candidates.length === 0 && (
        <EmptyState
          icon={Users}
          title={t('empty_candidates_title')}
          description={t('empty_candidates_description')}
        />
      )}

      {candidates.length > 0 && (
        <DataTable value={candidates} dataKey="id" size="small">
          <Column
            header={t('col_candidate')}
            body={(row: Candidate) => (
              <div>
                <p className="font-medium text-gray-900">{`${row.firstName} ${row.lastName}`}</p>
                <p className="text-xs text-gray-500">{row.email}</p>
              </div>
            )}
          />
          <Column field="source" header={t('col_source')} body={(row: Candidate) => row.source ?? '—'} />
          <Column
            header={t('col_status')}
            body={(row: Candidate) => (
              <Tag value={t(`candidate_status_${row.status}` as 'candidate_status_applied')} severity={STATUS_SEVERITY[row.status]} />
            )}
          />
          <Column
            header={t('col_actions')}
            body={(row: Candidate) => (
              <div className="flex gap-1.5">
                {STATUS_FLOW.indexOf(row.status) < STATUS_FLOW.length - 1 && row.status !== 'rejected' && (
                  <Button type="button" size="small" outlined onClick={() => void handleAdvance(row)}>
                    {t(`advance_to_${STATUS_FLOW[STATUS_FLOW.indexOf(row.status) + 1]}` as 'advance_to_screening')}
                  </Button>
                )}
                {row.status !== 'hired' && row.status !== 'rejected' && (
                  <Button type="button" size="small" severity="danger" outlined onClick={() => setRejectDialogFor(row)}>
                    {t('reject')}
                  </Button>
                )}
              </div>
            )}
          />
        </DataTable>
      )}

      <Dialog header={t('add_candidate')} visible={dialogOpen} onHide={() => setDialogOpen(false)} modal className="w-full max-w-md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <InputText value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t('first_name')} />
            <InputText value={lastName} onChange={e => setLastName(e.target.value)} placeholder={t('last_name')} />
          </div>
          <InputText value={email} onChange={e => setEmail(e.target.value)} placeholder={t('email')} type="email" className="w-full" />
          <InputText value={source} onChange={e => setSource(e.target.value)} placeholder={t('source')} className="w-full" />
          <Button type="button" loading={submitting} onClick={() => void handleCreate()}>
            {t('save')}
          </Button>
        </div>
      </Dialog>

      <Dialog header={t('reject')} visible={rejectDialogFor !== null} onHide={() => setRejectDialogFor(null)} modal className="w-full max-w-md">
        <div className="space-y-4">
          <InputTextarea
            value={rejectedReason}
            onChange={e => setRejectedReason(e.target.value)}
            placeholder={t('rejected_reason_placeholder')}
            rows={3}
            className="w-full"
          />
          <Button type="button" severity="danger" onClick={() => void handleReject()}>
            {t('confirm_reject')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
