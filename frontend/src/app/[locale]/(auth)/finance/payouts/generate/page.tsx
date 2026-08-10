'use client';

import {
  createPayoutBatch,
  listFundingAccounts,
  previewPayoutBatch,
  type FundingAccount,
  type PayoutBatchType,
  type PayoutPreviewLine,
  type PayoutRail,
} from '@/libs/api/payout-rails';
import { listLegalEntities, type LegalEntity } from '@/libs/api/org-admin';
import { ApiRequestError } from '@/libs/api/client';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/libs/I18nNavigation';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Steps } from 'primereact/steps';
import { Toast } from 'primereact/toast';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

const BATCH_TYPES: { label: string; value: PayoutBatchType }[] = [
  { label: 'Payroll', value: 'payroll' },
  { label: 'Expense reimbursement', value: 'expense_reimbursement' },
  { label: 'Contractor', value: 'contractor' },
];

function GeneratePayoutWizard() {
  const t = useTranslations('FinancePayouts');
  const toast = useRef<Toast>(null);
  const router = useRouter();
  const search = useSearchParams();
  const [step, setStep] = useState(0);
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [funding, setFunding] = useState<FundingAccount[]>([]);
  const [batchType, setBatchType] = useState<PayoutBatchType>(
    (search.get('batchType') as PayoutBatchType) || 'payroll',
  );
  const [legalEntityId, setLegalEntityId] = useState<string | null>(
    search.get('legalEntityId'),
  );
  const [sourceId, setSourceId] = useState(search.get('sourceId') ?? '');
  const [lines, setLines] = useState<PayoutPreviewLine[]>([]);
  const [allowedRails, setAllowedRails] = useState<PayoutRail[]>([]);
  const [rail, setRail] = useState<PayoutRail | null>(null);
  const [fundingAccountId, setFundingAccountId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([listLegalEntities(), listFundingAccounts()]).then(
      ([le, fa]) => {
        setEntities(le.data);
        setFunding(fa.data);
        if (!legalEntityId && le.data[0]) setLegalEntityId(le.data[0].id);
      },
    );
  }, [legalEntityId]);

  const steps = useMemo(
    () => [
      { label: t('step_source') },
      { label: t('step_preview') },
      { label: t('step_rail') },
      { label: t('step_confirm') },
    ],
    [t],
  );

  async function runPreview() {
    if (!legalEntityId || !sourceId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await previewPayoutBatch({
        batchType,
        legalEntityId,
        sourceId,
      });
      setLines(res.data.lines);
      setAllowedRails(res.data.resolution.allowedRails);
      setRail(res.data.resolution.resolvedRail);
      setFundingAccountId(res.data.resolution.suggestedFundingAccountId);
      setStep(1);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_preview'));
    } finally {
      setBusy(false);
    }
  }

  async function confirmCreate() {
    if (!legalEntityId || !sourceId || !rail || !fundingAccountId) return;
    setBusy(true);
    try {
      const res = await createPayoutBatch({
        batchType,
        legalEntityId,
        sourceId,
        rail,
        fundingAccountId,
      });
      toast.current?.show({ severity: 'success', summary: t('create_success') });
      router.push(`/finance/payouts/${res.data.id}`);
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: err instanceof ApiRequestError ? err.message : t('error_create'),
      });
    } finally {
      setBusy(false);
    }
  }

  const fundingOptions = funding
    .filter((f) => f.legalEntityId === legalEntityId)
    .filter((f) => !rail || f.provider === rail)
    .map((f) => ({ label: `${f.label} (${f.provider})`, value: f.id }));

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Toast ref={toast} />
      <OfflineBanner />
      <h1 className="text-xl font-semibold text-gray-900">{t('generate_title')}</h1>
      <Steps model={steps} activeIndex={step} readOnly className="text-sm" />
      {error && <Message severity="error" text={error} className="w-full" />}

      {step === 0 && (
        <div className="flex max-w-lg flex-col gap-3">
          <Dropdown
            value={batchType}
            options={BATCH_TYPES}
            onChange={(e) => setBatchType(e.value)}
          />
          <Dropdown
            value={legalEntityId}
            options={entities.map((e) => ({
              label: e.registeredName,
              value: e.id,
            }))}
            onChange={(e) => setLegalEntityId(e.value)}
            placeholder={t('legal_entity')}
          />
          <InputText
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            placeholder={t('source_id')}
          />
          <Button
            type="button"
            label={t('preview')}
            loading={busy}
            onClick={() => void runPreview()}
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <DataTable value={lines} size="small">
            <Column field="workerId" header={t('col_worker')} />
            <Column field="amount" header={t('col_amount')} />
            <Column field="currency" header={t('col_currency')} />
            <Column
              field="issues"
              header={t('col_issues')}
              body={(r: PayoutPreviewLine) =>
                r.issues.length ? r.issues.join(', ') : '—'
              }
            />
          </DataTable>
          <div className="flex gap-2">
            <Button type="button" outlined label={t('back')} onClick={() => setStep(0)} />
            <Button type="button" label={t('next')} onClick={() => setStep(2)} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex max-w-lg flex-col gap-3">
          <Dropdown
            value={rail}
            options={allowedRails.map((r) => ({ label: r, value: r }))}
            onChange={(e) => {
              setRail(e.value);
              setFundingAccountId(null);
            }}
            placeholder={t('rail')}
          />
          <Dropdown
            value={fundingAccountId}
            options={fundingOptions}
            onChange={(e) => setFundingAccountId(e.value)}
            placeholder={t('funding_account')}
          />
          <div className="flex gap-2">
            <Button type="button" outlined label={t('back')} onClick={() => setStep(1)} />
            <Button
              type="button"
              label={t('next')}
              disabled={!rail || !fundingAccountId}
              onClick={() => setStep(3)}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {t('confirm_summary', {
              type: batchType,
              rail: rail ?? '',
              lines: String(lines.length),
            })}
          </p>
          <div className="flex gap-2">
            <Button type="button" outlined label={t('back')} onClick={() => setStep(2)} />
            <Button
              type="button"
              label={t('create_batch')}
              loading={busy}
              onClick={() => void confirmCreate()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function GeneratePayoutPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GeneratePayoutWizard />
    </Suspense>
  );
}
