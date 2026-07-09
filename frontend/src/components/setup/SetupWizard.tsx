'use client';

import type { SetupWizardState, SetupWizardStep } from '@/libs/api/setup-wizard';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { Steps } from 'primereact/steps';
import { ToggleButton } from 'primereact/togglebutton';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiRequestError } from '@/libs/api/client';
import {
  applySetupWizardSeeds,
  getSetupWizardState,
  saveSetupWizardStep,

} from '@/libs/api/setup-wizard';

const COUNTRY_OPTIONS = [
  { label: 'Pakistan', value: 'PK' },
  { label: 'UAE', value: 'AE' },
  { label: 'Singapore', value: 'SG' },
];

const CURRENCY_OPTIONS = [
  { label: 'PKR', value: 'PKR' },
  { label: 'AED', value: 'AED' },
  { label: 'SGD', value: 'SGD' },
  { label: 'USD', value: 'USD' },
];

const FX_SOURCE_OPTIONS = [
  { label: 'Frankfurter (daily)', value: 'frankfurter' },
  { label: 'Manual override', value: 'manual' },
];

function stepIndex(steps: SetupWizardState['steps'], step: SetupWizardStep): number {
  return steps.findIndex(s => s.step === step);
}

export function SetupWizard() {
  const t = useTranslations('SetupWizard');

  const [state, setState] = useState<SetupWizardState | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [organisationName, setOrganisationName] = useState('Digitaro');
  const [reportingCurrency, setReportingCurrency] = useState('PKR');
  const [activeCountries, setActiveCountries] = useState<string[]>(['PK', 'AE', 'SG']);
  const [enabledCurrencies, setEnabledCurrencies] = useState<string[]>([
    'PKR',
    'AED',
    'SGD',
    'USD',
  ]);
  const [fxSource, setFxSource] = useState('frankfurter');
  const [emailApprovals, setEmailApprovals] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const loadState = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await getSetupWizardState();
      setState(data);
      const currentIdx = stepIndex(data.steps, data.progress.currentStep);
      setActiveIndex(currentIdx >= 0 ? currentIdx : 0);

      const orgData = data.progress.stepData.organisation as
        | { organisationName?: string; reportingCurrency?: string }
        | undefined;
      if (orgData?.organisationName) {
        setOrganisationName(orgData.organisationName);
      }
      if (orgData?.reportingCurrency) {
        setReportingCurrency(orgData.reportingCurrency);
      }

      const countryData = data.progress.stepData.countries as
        | { activeCountries?: string[] }
        | undefined;
      if (countryData?.activeCountries) {
        setActiveCountries(countryData.activeCountries);
      }

      const currencyData = data.progress.stepData.currencies as
        | {
          reportingCurrency?: string;
          fxSource?: string;
          enabledCurrencies?: string[];
        }
        | undefined;
      if (currencyData?.reportingCurrency) {
        setReportingCurrency(currencyData.reportingCurrency);
      }
      if (currencyData?.fxSource) {
        setFxSource(currencyData.fxSource);
      }
      if (currencyData?.enabledCurrencies) {
        setEnabledCurrencies(currencyData.enabledCurrencies);
      }

      const notifData = data.progress.stepData.notifications as
        | { emailApprovals?: boolean; pushActionRequired?: boolean }
        | undefined;
      if (notifData) {
        setEmailApprovals(notifData.emailApprovals ?? true);
        setPushNotifications(notifData.pushActionRequired ?? true);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const stepItems = useMemo(
    () =>
      state?.steps.map(s => ({
        label: t(`step_${s.step}`),
      })) ?? [],
    [state?.steps, t],
  );

  const currentStep = state?.steps[activeIndex]?.step;

  const buildStepPayload = (step: SetupWizardStep): Record<string, unknown> => {
    switch (step) {
      case 'organisation':
        return { organisationName, reportingCurrency };
      case 'legal_entities':
        return { acknowledged: true };
      case 'countries':
        return { activeCountries };
      case 'currencies':
        return {
          reportingCurrency,
          fxSource,
          enabledCurrencies,
        };
      case 'leave_types':
      case 'holiday_calendars':
      case 'benefit_types':
      case 'roles':
      case 'document_templates':
        return { reviewed: true };
      case 'notifications':
        return {
          emailApprovals,
          pushActionRequired: pushNotifications,
        };
      default:
        return {};
    }
  };

  const handleSave = async (skip = false) => {
    if (!currentStep) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const seedSteps: SetupWizardStep[] = [
        'leave_types',
        'holiday_calendars',
        'benefit_types',
        'document_templates',
      ];

      if (!skip && seedSteps.includes(currentStep)) {
        await applySetupWizardSeeds(activeCountries);
      }

      const { data } = await saveSetupWizardStep({
        step: currentStep,
        data: buildStepPayload(currentStep),
        skip,
      });
      setState(data);

      if (data.progress.isComplete) {
        return;
      }

      const nextIdx = stepIndex(data.steps, data.progress.currentStep);
      setActiveIndex(nextIdx >= 0 ? nextIdx : activeIndex + 1);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCountry = (code: string, checked: boolean) => {
    setActiveCountries(prev =>
      checked ? [...new Set([...prev, code])] : prev.filter(c => c !== code),
    );
  };

  const toggleCurrency = (code: string, checked: boolean) => {
    setEnabledCurrencies(prev =>
      checked ? [...new Set([...prev, code])] : prev.filter(c => c !== code),
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton height="3rem" className="w-full" />
        <Skeleton height="16rem" className="w-full" />
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <AlertCircle className="size-8 text-red-500" aria-hidden />
        <p className="text-sm text-red-700">{error}</p>
        <Button type="button" outlined onClick={() => void loadState()}>
          <RefreshCw className="size-4" aria-hidden />
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (state?.progress.isComplete) {
    return (
      <Card className="text-center">
        <div className="flex flex-col items-center gap-4 py-8">
          <CheckCircle2 className="size-12 text-green-600" aria-hidden />
          <h2 className="text-lg font-semibold text-gray-900">{t('complete_title')}</h2>
          <p className="max-w-md text-sm text-gray-600">{t('complete_body')}</p>
          <div className="grid gap-2 text-left text-sm text-gray-700 sm:grid-cols-2">
            <p>{t('summary_leave', { count: state.summary.leaveTypeCount })}</p>
            <p>{t('summary_holidays', { count: state.summary.holidayCount })}</p>
            <p>{t('summary_benefits', { count: state.summary.benefitTypeCount })}</p>
            <p>{t('summary_templates', { count: state.summary.documentTemplateCount })}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Steps
        model={stepItems}
        activeIndex={activeIndex}
        onSelect={e => setActiveIndex(e.index)}
        readOnly={false}
        className="text-xs"
      />

      {error && <Message severity="error" text={error} className="w-full" />}

      <Card title={stepItems[activeIndex]?.label}>
        {currentStep === 'organisation' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="orgName" className="mb-1 block text-xs font-medium text-gray-700">
                {t('field_org_name')}
              </label>
              <InputText
                id="orgName"
                value={organisationName}
                onChange={e => setOrganisationName(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t('field_reporting_currency')}
              </label>
              <Dropdown
                value={reportingCurrency}
                options={CURRENCY_OPTIONS}
                onChange={e => setReportingCurrency(e.value as string)}
                className="w-full"
              />
            </div>
          </div>
        )}

        {currentStep === 'legal_entities' && (
          <Message
            severity="info"
            text={t('legal_entities_hint', { count: state?.summary.legalEntityCount ?? 0 })}
            className="w-full"
          />
        )}

        {currentStep === 'countries' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{t('countries_hint')}</p>
            {COUNTRY_OPTIONS.map(country => (
              <label key={country.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  inputId={`country-${country.value}`}
                  checked={activeCountries.includes(country.value)}
                  onChange={e => toggleCountry(country.value, e.checked ?? false)}
                />
                {country.label}
              </label>
            ))}
          </div>
        )}

        {currentStep === 'currencies' && (
          <div className="space-y-4">
            <Message severity="info" text={t('currencies_hint')} className="w-full" />
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t('field_fx_source')}
              </label>
              <Dropdown
                value={fxSource}
                options={FX_SOURCE_OPTIONS}
                onChange={e => setFxSource(e.value as string)}
                className="w-full sm:max-w-xs"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {CURRENCY_OPTIONS.map(currency => (
                <ToggleButton
                  key={currency.value}
                  checked={enabledCurrencies.includes(currency.value)}
                  onChange={e => toggleCurrency(currency.value, e.value)}
                  onLabel={currency.label}
                  offLabel={currency.label}
                  className="text-xs"
                />
              ))}
            </div>
          </div>
        )}

        {(currentStep === 'leave_types' || currentStep === 'holiday_calendars') && (
          <div className="space-y-3">
            <Message severity="info" text={t(`${currentStep}_hint`)} className="w-full" />
            <p className="text-sm text-gray-600">
              {currentStep === 'leave_types'
                ? t('seeded_leave_count', { count: state?.summary.leaveTypeCount ?? 0 })
                : t('seeded_holiday_count', { count: state?.summary.holidayCount ?? 0 })}
            </p>
          </div>
        )}

        {currentStep === 'benefit_types' && (
          <Message severity="info" text={t('benefit_types_hint')} className="w-full" />
        )}

        {currentStep === 'roles' && (
          <Message severity="info" text={t('roles_hint')} className="w-full" />
        )}

        {currentStep === 'document_templates' && (
          <Message severity="info" text={t('document_templates_hint')} className="w-full" />
        )}

        {currentStep === 'notifications' && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                inputId="emailApprovals"
                checked={emailApprovals}
                onChange={e => setEmailApprovals(e.checked ?? false)}
              />
              {t('field_email_approvals')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                inputId="pushNotifications"
                checked={pushNotifications}
                onChange={e => setPushNotifications(e.checked ?? false)}
              />
              {t('field_push_notifications')}
            </label>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            outlined
            disabled={activeIndex === 0 || isSaving}
            onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
            label={t('back')}
          />
          {state?.steps[activeIndex]?.canSkip && (
            <Button
              type="button"
              text
              disabled={isSaving}
              onClick={() => void handleSave(true)}
              label={t('skip')}
            />
          )}
        </div>
        <Button
          type="button"
          loading={isSaving}
          onClick={() => void handleSave(false)}
          label={
            currentStep === 'notifications' ? t('finish') : t('next')
          }
        />
      </div>
    </div>
  );
}
