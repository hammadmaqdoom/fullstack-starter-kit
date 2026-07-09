'use client';

import type { EmploymentType, EmploymentTypeCountryConfig } from '@/libs/api/country-config';
import type { Worker, WorkMode } from '@/libs/api/workers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiRequestError } from '@/libs/api/client';
import {

  listCountries,
  listEmploymentTypeCountryConfigs,
  listEmploymentTypes,
} from '@/libs/api/country-config';
import {
  createWorker,
  updateWorker,

} from '@/libs/api/workers';
import {
  CONTRACTOR_TYPE_CODES,
  DIVISIONS,
  LEGAL_ENTITIES,
  STATUTORY_FIELDS_BY_COUNTRY,
} from '@/libs/constants/org';

const WORK_MODE_OPTIONS: { label: string; value: WorkMode }[] = [
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'In office', value: 'in_office' },
];

const BILLING_MODEL_OPTIONS = [
  { label: 'Day rate', value: 'day_rate' },
  { label: 'Hourly', value: 'hourly' },
  { label: 'Fixed fee', value: 'fixed_fee' },
  { label: 'Retainer', value: 'retainer' },
];

function buildSchema(statutoryKeys: string[], isContractor: boolean) {
  const statutoryShape: Record<string, z.ZodString> = {};
  for (const key of statutoryKeys) {
    statutoryShape[key] = z.string().min(1, 'Required');
  }

  return z.object({
    employmentTypeId: z.string().uuid(),
    countryCode: z.string().length(2),
    bankCountryCode: z.string().length(2).optional(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    personalEmail: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    workMode: z.enum(['remote', 'hybrid', 'in_office']).optional(),
    startDate: z.date(),
    employeeNumber: z.string().optional(),
    divisionId: z.string().uuid().optional().or(z.literal('')),
    legalEntityId: z.string().uuid().optional().or(z.literal('')),
    fteFraction: z.number().min(0.01).max(1).optional(),
    timezone: z.string().optional(),
    statutoryFields: z.object(statutoryShape),
    compensationCurrency: z.string().optional(),
    compensationBaseSalary: z.number().min(0).optional(),
    compensationPayFrequency: z.enum(['monthly', 'weekly']).optional(),
    contractorBillingModel: isContractor
      ? z.enum(['day_rate', 'hourly', 'fixed_fee', 'retainer'])
      : z.enum(['day_rate', 'hourly', 'fixed_fee', 'retainer']).optional(),
    contractorPaymentCurrency: z.string().optional(),
    contractorPaymentTermsDays: z.number().min(1).optional(),
    contractorAgencyName: z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const STATUTORY_LABEL_KEYS: Record<string, string> = {
  cnic: 'statutory_cnic',
  ntn: 'statutory_ntn',
  eobi_number: 'statutory_eobi_number',
  emirates_id: 'statutory_emirates_id',
  labour_card_number: 'statutory_labour_card_number',
  nric: 'statutory_nric',
  cpf_account: 'statutory_cpf_account',
};

export function WorkerForm({
  worker,
  onSuccess,
}: {
  worker?: Worker;
  onSuccess?: (worker: Worker) => void;
}) {
  const t = useTranslations('Workers');
  const isEdit = Boolean(worker);

  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [countryConfigs, setCountryConfigs] = useState<
    EmploymentTypeCountryConfig[]
  >([]);
  const [countries, setCountries] = useState<{ label: string; value: string }[]>(
    [],
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const [typesRes, matrixRes, countriesRes] = await Promise.all([
        listEmploymentTypes(),
        listEmploymentTypeCountryConfigs(),
        listCountries(),
      ]);
      setEmploymentTypes(typesRes.data);
      setCountryConfigs(matrixRes.data);
      setCountries(
        countriesRes.data.map(c => ({
          label: String(c.configJson.displayName ?? c.countryCode),
          value: c.countryCode,
        })),
      );
    } catch {
      setSubmitError(t('error_config'));
    } finally {
      setConfigLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const defaultCountry = worker?.countryCode ?? 'PK';
  const defaultTypeId
    = worker?.employmentTypeId ?? employmentTypes[0]?.id ?? '';

  const selectedType = employmentTypes.find(
    et => et.id === (worker?.employmentTypeId ?? defaultTypeId),
  );
  const isContractor = selectedType
    ? CONTRACTOR_TYPE_CODES.has(selectedType.code)
    : false;

  const statutoryKeys = useMemo(
    () => [...(STATUTORY_FIELDS_BY_COUNTRY[defaultCountry] ?? [])],
    [defaultCountry],
  );

  const schema = useMemo(
    () => buildSchema([...statutoryKeys], isContractor),
    [statutoryKeys, isContractor],
  );

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employmentTypeId: defaultTypeId,
      countryCode: defaultCountry,
      bankCountryCode: worker?.bankCountryCode ?? defaultCountry,
      firstName: worker?.firstName ?? '',
      lastName: worker?.lastName ?? '',
      email: worker?.email ?? '',
      personalEmail: worker?.personalEmail ?? '',
      phone: worker?.phone ?? '',
      workMode: worker?.workMode ?? undefined,
      startDate: parseDate(worker?.startDate) ?? new Date(),
      employeeNumber: worker?.employeeNumber ?? '',
      divisionId: worker?.divisionId ?? '',
      legalEntityId: worker?.legalEntityId ?? '',
      fteFraction: worker ? Number(worker.fteFraction) : 1,
      timezone: worker?.timezone ?? '',
      statutoryFields: Object.fromEntries(
        statutoryKeys.map(key => [
          key,
          worker?.statutoryFields?.[key] ?? '',
        ]),
      ),
      compensationCurrency: worker?.compensationBand?.currency ?? '',
      compensationBaseSalary: worker?.compensationBand?.baseSalary,
      compensationPayFrequency: worker?.compensationBand?.payFrequency,
      contractorBillingModel: worker?.contractorProfile?.billingModel,
      contractorPaymentCurrency:
        worker?.contractorProfile?.paymentCurrency ?? '',
      contractorPaymentTermsDays:
        worker?.contractorProfile?.paymentTermsDays ?? undefined,
      contractorAgencyName: worker?.contractorProfile?.agencyName ?? '',
    },
  });

  const watchedCountry = watch('countryCode');
  const watchedTypeId = watch('employmentTypeId');

  const activeStatutoryKeys
    = STATUTORY_FIELDS_BY_COUNTRY[watchedCountry] ?? [];

  const matrixEntry = countryConfigs.find(
    c =>
      c.countryCode === watchedCountry
      && c.employmentTypeId === watchedTypeId,
  );

  const employmentTypeOptions = employmentTypes.map(et => ({
    label: et.displayName,
    value: et.id,
  }));

  const divisionOptions = DIVISIONS.map(d => ({
    label: d.name,
    value: d.id,
  }));

  const legalEntityOptions = LEGAL_ENTITIES.filter(
    le => le.countryCode === watchedCountry,
  ).map(le => ({ label: le.name, value: le.id }));

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      employmentTypeId: values.employmentTypeId,
      countryCode: values.countryCode,
      bankCountryCode: values.bankCountryCode ?? values.countryCode,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      personalEmail: values.personalEmail || undefined,
      phone: values.phone || undefined,
      workMode: values.workMode,
      startDate: toIsoDate(values.startDate),
      employeeNumber: values.employeeNumber || undefined,
      divisionId: values.divisionId || undefined,
      legalEntityId: values.legalEntityId || undefined,
      fteFraction: values.fteFraction,
      timezone: values.timezone || undefined,
      statutoryFields: values.statutoryFields,
      compensationBand:
        values.compensationCurrency && values.compensationBaseSalary != null
          ? {
              currency: values.compensationCurrency,
              baseSalary: values.compensationBaseSalary,
              payFrequency: values.compensationPayFrequency ?? 'monthly',
            }
          : undefined,
      contractorProfile: values.contractorBillingModel
        ? {
            billingModel: values.contractorBillingModel,
            paymentCurrency: values.contractorPaymentCurrency || undefined,
            paymentTermsDays: values.contractorPaymentTermsDays,
            agencyName: values.contractorAgencyName || undefined,
          }
        : undefined,
    };

    try {
      const result = isEdit && worker
        ? await updateWorker(worker.id, payload)
        : await createWorker(payload);
      onSuccess?.(result.data);
    } catch (err) {
      setSubmitError(
        err instanceof ApiRequestError ? err.message : t('error_save'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (configLoading) {
    return (
      <p className="text-sm text-gray-500" aria-busy="true">
        {t('loading')}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitError && (
        <Message severity="error" text={submitError} className="w-full" />
      )}

      {matrixEntry && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
          {t('country_rules_hint', {
            leave: matrixEntry.leaveEnabled ? t('yes') : t('no'),
            checkIn: matrixEntry.checkInRequired ? t('yes') : t('no'),
          })}
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-900">
          {t('section_identity')}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="mb-1 block text-xs font-medium text-gray-700">
              {t('field_first_name')}
            </label>
            <Controller
              name="firstName"
              control={control}
              render={({ field }) => (
                <InputText id="firstName" {...field} className="w-full" />
              )}
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="mb-1 block text-xs font-medium text-gray-700">
              {t('field_last_name')}
            </label>
            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <InputText id="lastName" {...field} className="w-full" />
              )}
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-gray-700">
              {t('field_email')}
            </label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <InputText id="email" type="email" {...field} className="w-full" />
              )}
            />
          </div>
          <div>
            <label htmlFor="phone" className="mb-1 block text-xs font-medium text-gray-700">
              {t('field_phone')}
            </label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <InputText id="phone" {...field} className="w-full" />
              )}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-900">
          {t('section_employment')}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {t('field_employment_type')}
            </label>
            <Controller
              name="employmentTypeId"
              control={control}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  options={employmentTypeOptions}
                  className="w-full"
                />
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {t('field_country')}
            </label>
            <Controller
              name="countryCode"
              control={control}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  options={countries}
                  className="w-full"
                  onChange={(e) => {
                    field.onChange(e.value);
                    reset({
                      ...watch(),
                      countryCode: e.value,
                      statutoryFields: Object.fromEntries(
                        (STATUTORY_FIELDS_BY_COUNTRY[e.value as string] ?? []).map(
                          key => [key, ''],
                        ),
                      ),
                    });
                  }}
                />
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {t('field_division')}
            </label>
            <Controller
              name="divisionId"
              control={control}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  options={divisionOptions}
                  showClear
                  className="w-full"
                />
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {t('field_legal_entity')}
            </label>
            <Controller
              name="legalEntityId"
              control={control}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  options={legalEntityOptions}
                  showClear
                  className="w-full"
                />
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {t('field_start_date')}
            </label>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <Calendar
                  value={field.value}
                  onChange={e => field.onChange(e.value)}
                  dateFormat="yy-mm-dd"
                  className="w-full"
                  showIcon
                />
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {t('field_work_mode')}
            </label>
            <Controller
              name="workMode"
              control={control}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  options={WORK_MODE_OPTIONS}
                  showClear
                  className="w-full"
                />
              )}
            />
          </div>
        </div>
      </fieldset>

      {activeStatutoryKeys.length > 0 && (
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-900">
            {t('section_statutory')}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeStatutoryKeys.map(key => (
              <div key={key}>
                <label
                  htmlFor={`statutory-${key}`}
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  {STATUTORY_LABEL_KEYS[key]
                    ? t(STATUTORY_LABEL_KEYS[key] as 'statutory_cnic')
                    : key.replace(/_/g, ' ')}
                </label>
                <Controller
                  name={`statutoryFields.${key}`}
                  control={control}
                  render={({ field }) => (
                    <InputText
                      id={`statutory-${key}`}
                      {...field}
                      className="w-full"
                    />
                  )}
                />
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-900">
          {t('section_compensation')}
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {t('field_currency')}
            </label>
            <Controller
              name="compensationCurrency"
              control={control}
              render={({ field }) => (
                <InputText {...field} className="w-full" placeholder="PKR" />
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {t('field_base_salary')}
            </label>
            <Controller
              name="compensationBaseSalary"
              control={control}
              render={({ field }) => (
                <InputNumber
                  value={field.value}
                  onValueChange={e => field.onChange(e.value)}
                  className="w-full"
                  inputClassName="w-full"
                />
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {t('field_pay_frequency')}
            </label>
            <Controller
              name="compensationPayFrequency"
              control={control}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  options={[
                    { label: 'Monthly', value: 'monthly' },
                    { label: 'Weekly', value: 'weekly' },
                  ]}
                  showClear
                  className="w-full"
                />
              )}
            />
          </div>
        </div>
      </fieldset>

      {CONTRACTOR_TYPE_CODES.has(
        employmentTypes.find(et => et.id === watchedTypeId)?.code ?? '',
      ) && (
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-900">
            {t('section_contractor')}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t('field_billing_model')}
              </label>
              <Controller
                name="contractorBillingModel"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    options={BILLING_MODEL_OPTIONS}
                    className="w-full"
                  />
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t('field_payment_currency')}
              </label>
              <Controller
                name="contractorPaymentCurrency"
                control={control}
                render={({ field }) => (
                  <InputText {...field} className="w-full" />
                )}
              />
            </div>
          </div>
        </fieldset>
      )}

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button
          type="submit"
          label={isEdit ? t('save') : t('create')}
          loading={isSubmitting}
          disabled={isSubmitting}
        />
      </div>
    </form>
  );
}
