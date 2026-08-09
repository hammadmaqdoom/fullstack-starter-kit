'use client';

import type { Worker, WorkMode } from '@/libs/api/workers';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { useMemo, useState } from 'react';
import { ApiRequestError } from '@/libs/api/client';
import { submitProfileChangeRequest } from '@/libs/api/profile-change';

type ProfileChangeFormProps = {
  worker: Worker;
  canEditExtendedFields?: boolean;
  onSubmitted?: () => void;
};

type FormState = {
  phone: string;
  personalEmail: string;
  timezone: string;
  workMode: WorkMode | '';
  employeeNumber: string;
};

const WORK_MODE_OPTIONS: { label: string; value: WorkMode }[] = [
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'In office', value: 'in_office' },
];

function timezoneOptions(): { label: string; value: string }[] {
  const zones
    = typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
      ? (Intl as typeof Intl & { supportedValuesOf: (key: string) => string[] }).supportedValuesOf(
          'timeZone',
        )
      : [
          'Asia/Karachi',
          'Asia/Dubai',
          'Asia/Singapore',
          'UTC',
          'Europe/London',
          'America/New_York',
        ];

  return zones.map(zone => ({ label: zone, value: zone }));
}

function initialState(worker: Worker): FormState {
  return {
    phone: worker.phone ?? '',
    personalEmail: worker.personalEmail ?? '',
    timezone: worker.timezone ?? '',
    workMode: worker.workMode ?? '',
    employeeNumber: worker.employeeNumber ?? '',
  };
}

export function ProfileChangeForm({
  worker,
  canEditExtendedFields = false,
  onSubmitted,
}: ProfileChangeFormProps) {
  const t = useTranslations('EmployeeProfile');
  const [form, setForm] = useState<FormState>(() => initialState(worker));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const zones = useMemo(() => timezoneOptions(), []);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(null);
  };

  const reset = () => {
    setForm(initialState(worker));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const fieldChanges: Record<string, { old: unknown; new: unknown }> = {};
    const compare = (key: keyof FormState, current: unknown) => {
      const next = form[key] === '' ? null : form[key];
      const prev = current ?? null;
      if (String(next ?? '') !== String(prev ?? '')) {
        fieldChanges[key] = { old: prev, new: next };
      }
    };

    compare('phone', worker.phone);
    compare('personalEmail', worker.personalEmail);
    compare('timezone', worker.timezone);

    if (canEditExtendedFields) {
      compare('workMode', worker.workMode);
      compare('employeeNumber', worker.employeeNumber);
    }

    if (Object.keys(fieldChanges).length === 0) {
      setError(t('error_no_changes'));
      return;
    }

    setIsSubmitting(true);
    try {
      await submitProfileChangeRequest(worker.id, { fieldChanges });
      setSuccess(t('success_pending'));
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={event => void handleSubmit(event)} className="space-y-4">
      <p className="text-sm text-gray-500">
        {canEditExtendedFields ? t('hint_people_ops') : t('hint_employee')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="profile-phone" className="text-sm font-medium text-gray-700">
            {t('field_phone')}
          </label>
          <InputText
            id="profile-phone"
            value={form.phone}
            onChange={event => updateField('phone', event.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="profile-personal-email" className="text-sm font-medium text-gray-700">
            {t('field_personal_email')}
          </label>
          <InputText
            id="profile-personal-email"
            type="email"
            value={form.personalEmail}
            onChange={event => updateField('personalEmail', event.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="profile-timezone" className="text-sm font-medium text-gray-700">
            {t('field_timezone')}
          </label>
          <Dropdown
            inputId="profile-timezone"
            value={form.timezone || null}
            options={zones}
            onChange={event => updateField('timezone', event.value ?? '')}
            placeholder={t('field_timezone_placeholder')}
            filter
            showClear
            className="w-full"
          />
        </div>

        {canEditExtendedFields && (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="profile-work-mode" className="text-sm font-medium text-gray-700">
                {t('field_work_mode')}
              </label>
              <Dropdown
                inputId="profile-work-mode"
                value={form.workMode || null}
                options={WORK_MODE_OPTIONS}
                onChange={event => updateField('workMode', event.value ?? '')}
                showClear
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="profile-employee-number" className="text-sm font-medium text-gray-700">
                {t('field_employee_number')}
              </label>
              <InputText
                id="profile-employee-number"
                value={form.employeeNumber}
                onChange={event => updateField('employeeNumber', event.target.value)}
                className="w-full"
              />
            </div>
          </>
        )}
      </div>

      {error && <Message severity="error" text={error} className="w-full" />}
      {success && <Message severity="success" text={success} className="w-full" />}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          label={isSubmitting ? t('submitting') : t('submit')}
          loading={isSubmitting}
        />
        <Button
          type="button"
          severity="secondary"
          outlined
          label={t('reset')}
          disabled={isSubmitting}
          onClick={reset}
        />
      </div>
    </form>
  );
}
