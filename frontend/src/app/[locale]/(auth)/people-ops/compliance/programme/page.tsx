'use client';

import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  getComplianceProgramme,
  updateComplianceProgramme,
} from '@/libs/api/compliance-controls';
import { Link } from '@/libs/I18nNavigation';
import { ArrowLeft, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Chips } from 'primereact/chips';
import { InputTextarea } from 'primereact/inputtextarea';
import { Skeleton } from 'primereact/skeleton';
import { useCallback, useEffect, useState } from 'react';

function toDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  return new Date(`${value}T00:00:00`);
}

function toIsoDate(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}

export default function PeopleOpsComplianceProgrammePage() {
  const t = useTranslations('PeopleOpsCompliance');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [evidenceWindowStart, setEvidenceWindowStart] = useState<Date | null>(
    null,
  );
  const [nextAuditTargetDate, setNextAuditTargetDate] = useState<Date | null>(
    null,
  );
  const [targetFrameworks, setTargetFrameworks] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getComplianceProgramme();
      setEvidenceWindowStart(toDate(data.evidenceWindowStart));
      setNextAuditTargetDate(toDate(data.nextAuditTargetDate));
      setTargetFrameworks(data.targetFrameworks ?? []);
      setNotes(data.notes ?? '');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      await updateComplianceProgramme({
        evidenceWindowStart: toIsoDate(evidenceWindowStart),
        nextAuditTargetDate: toIsoDate(nextAuditTargetDate),
        targetFrameworks,
        notes: notes || null,
      });
      setSuccess(t('programme_saved'));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <OfflineBanner />
      <Link
        href="/people-ops/compliance"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('back')}
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {t('programme_title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t('programme_subtitle')}</p>
      </div>

      {loading && <Skeleton height="12rem" />}

      {!loading && (
        <div className="space-y-4">
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </p>
          )}

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-gray-800">
              {t('evidence_window_start')}
            </span>
            <Calendar
              value={evidenceWindowStart}
              onChange={(e) => setEvidenceWindowStart(e.value as Date | null)}
              dateFormat="yy-mm-dd"
              showIcon
              className="w-full"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-gray-800">
              {t('next_audit_target')}
            </span>
            <Calendar
              value={nextAuditTargetDate}
              onChange={(e) => setNextAuditTargetDate(e.value as Date | null)}
              dateFormat="yy-mm-dd"
              showIcon
              className="w-full"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-gray-800">
              {t('target_frameworks')}
            </span>
            <Chips
              value={targetFrameworks}
              onChange={(e) => setTargetFrameworks(e.value ?? [])}
              className="w-full"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-gray-800">{t('notes')}</span>
            <InputTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full"
            />
          </label>

          <Button
            type="button"
            className="gap-2"
            loading={saving}
            onClick={() => void onSave()}
          >
            <Save className="size-4" aria-hidden />
            {t('save_programme')}
          </Button>
        </div>
      )}
    </div>
  );
}
