'use client';

import type { TrackerStep } from '@/components/shared/StatusTracker';
import type { ExpenseClaim, ExpenseClaimStatus } from '@/libs/api/expenses';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { getExpenseClaim, submitExpenseClaim } from '@/libs/api/expenses';
import { useRouter } from '@/libs/I18nNavigation';

const STATUS_SEVERITY: Record<ExpenseClaimStatus, 'secondary' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'secondary',
  submitted: 'info',
  approved: 'warning',
  paid: 'success',
  rejected: 'danger',
};

function claimTrackerSteps(
  claim: ExpenseClaim,
  t: ReturnType<typeof useTranslations<'EmployeeExpenses'>>,
): TrackerStep[] {
  if (claim.status === 'rejected') {
    return [
      { label: t('tracker_submitted'), state: 'done' },
      { label: t('tracker_rejected'), state: 'current' },
    ];
  }
  const order = ['draft', 'submitted', 'approved', 'paid'];
  const currentIndex = order.indexOf(claim.status);
  return [
    { label: t('tracker_draft'), state: currentIndex > 0 ? 'done' : 'current' },
    { label: t('tracker_submitted'), state: currentIndex > 1 ? 'done' : currentIndex === 1 ? 'current' : 'todo' },
    { label: t('tracker_approved'), state: currentIndex > 2 ? 'done' : currentIndex === 2 ? 'current' : 'todo' },
    { label: t('tracker_paid'), state: currentIndex === 3 ? 'done' : 'todo' },
  ];
}

export default function EmployeeExpenseDetailPage() {
  const t = useTranslations('EmployeeExpenses');
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const claimId = params.id;

  const [claim, setClaim] = useState<ExpenseClaim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await getExpenseClaim(claimId);
      setClaim(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setClaim(null);
    } finally {
      setIsLoading(false);
    }
  }, [claimId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    if (!claim) {
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await submitExpenseClaim(claim.id);
      await load();
    } catch (err) {
      setSubmitError(err instanceof ApiRequestError ? err.message : t('error_submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !claim && !error) {
    return (
      <>
        <OfflineBanner />
        <PageSkeleton variant="detail" rows={3} />
      </>
    );
  }

  if (!isLoading && (error || !claim)) {
    return (
      <>
        <OfflineBanner />
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error ?? t('error_not_found')}
          </div>
          <Button type="button" severity="secondary" size="small" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      </>
    );
  }

  if (!claim) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-16 lg:pb-0">
      <OfflineBanner />

      <button
        type="button"
        onClick={() => router.push('/employee/expenses')}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('back_to_claims')}
      </button>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">{t(`category_${claim.category}`)}</h1>
              <Tag value={t(`status_${claim.status}`)} severity={STATUS_SEVERITY[claim.status]} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {t('claim_amount', { amount: claim.amount, currency: claim.currencyCode })}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">{t('claim_date', { date: claim.expenseDate })}</p>
          </div>
        </div>

        {claim.status === 'rejected' && claim.rejectionReason && (
          <Message severity="error" className="mt-4 w-full" text={claim.rejectionReason} />
        )}

        {claim.policyViolation && (
          <Message
            severity="warn"
            className="mt-4 w-full"
            text={t('policy_violation', {
              type: claim.policyViolation.type === 'daily_cap' ? t('policy_daily_cap') : t('policy_monthly_cap'),
              actual: claim.policyViolation.actualAmount,
              cap: claim.policyViolation.capAmount,
              currency: claim.policyViolation.currencyCode,
            })}
          />
        )}

        <div className="mt-5 border-t border-gray-100 pt-4">
          <StatusTracker steps={claimTrackerSteps(claim, t)} />
        </div>

        {claim.description && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h2 className="mb-1 text-sm font-semibold text-gray-900">{t('field_description')}</h2>
            <p className="text-sm text-gray-600">{claim.description}</p>
          </div>
        )}

        {claim.receiptBlobUrl && (
          <div className="mt-4">
            <a
              href={claim.receiptBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              {t('view_receipt')}
            </a>
          </div>
        )}

        {claim.status === 'draft' && (
          <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
            {submitError && <Message severity="error" text={submitError} className="w-full" />}
            <Button type="button" className="gap-2" onClick={() => void handleSubmit()} loading={isSubmitting}>
              {t('submit_for_approval')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
