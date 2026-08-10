'use client';

import {
  getPayoutRailProfile,
  listCorridorOverrides,
  updatePayoutRailProfile,
  upsertCorridorOverride,
  type PayoutCorridorOverride,
  type PayoutRail,
  type PayoutRailProfile,
} from '@/libs/api/payout-rails';
import { listLegalEntities, type LegalEntity } from '@/libs/api/org-admin';
import { ApiRequestError } from '@/libs/api/client';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Toast } from 'primereact/toast';
import { useCallback, useEffect, useRef, useState } from 'react';

const RAILS: { label: string; value: PayoutRail }[] = [
  { label: 'Aspire', value: 'aspire' },
  { label: 'Wise', value: 'wise' },
  { label: 'Manual bank', value: 'manual_bank' },
];

export default function PayoutRailsPage() {
  const t = useTranslations('FinancePayoutRails');
  const toast = useRef<Toast>(null);
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [legalEntityId, setLegalEntityId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PayoutRailProfile | null>(null);
  const [corridors, setCorridors] = useState<PayoutCorridorOverride[]>([]);
  const [primaryRail, setPrimaryRail] = useState<PayoutRail>('aspire');
  const [secondaryRail, setSecondaryRail] = useState<PayoutRail | null>('wise');
  const [payerCountry, setPayerCountry] = useState('');
  const [recipientCountry, setRecipientCountry] = useState('');
  const [corridorPrimary, setCorridorPrimary] = useState<PayoutRail>('manual_bank');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [legal, corridorRes] = await Promise.all([
        listLegalEntities(),
        listCorridorOverrides(),
      ]);
      setEntities(legal.data);
      setCorridors(corridorRes.data);
      const firstId = legal.data[0]?.id ?? null;
      if (!legalEntityId && firstId) {
        setLegalEntityId(firstId);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setLoading(false);
    }
  }, [legalEntityId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!legalEntityId) return;
    void getPayoutRailProfile(legalEntityId)
      .then((res) => {
        setProfile(res.data);
        if (res.data) {
          setPrimaryRail(res.data.primaryRail);
          setSecondaryRail(res.data.secondaryRail);
        }
      })
      .catch(() => setProfile(null));
  }, [legalEntityId]);

  async function saveProfile() {
    if (!legalEntityId) return;
    try {
      const res = await updatePayoutRailProfile(legalEntityId, {
        primaryRail,
        secondaryRail,
      });
      setProfile(res.data);
      toast.current?.show({ severity: 'success', summary: t('save_success') });
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: err instanceof ApiRequestError ? err.message : t('error_save'),
      });
    }
  }

  async function addCorridor() {
    if (!legalEntityId || payerCountry.length !== 2 || recipientCountry.length !== 2) {
      return;
    }
    try {
      await upsertCorridorOverride({
        legalEntityId,
        payerCountryCode: payerCountry.toUpperCase(),
        recipientBankCountryCode: recipientCountry.toUpperCase(),
        primaryRail: corridorPrimary,
      });
      toast.current?.show({ severity: 'success', summary: t('corridor_success') });
      const res = await listCorridorOverrides();
      setCorridors(res.data);
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: err instanceof ApiRequestError ? err.message : t('error_corridor'),
      });
    }
  }

  if (loading) return <PageSkeleton />;

  const filtered = legalEntityId
    ? corridors.filter((c) => c.legalEntityId === legalEntityId)
    : corridors;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Toast ref={toast} />
      <OfflineBanner />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Button
          type="button"
          outlined
          icon={<RefreshCw className="size-4" />}
          label={t('refresh')}
          onClick={() => void load()}
        />
      </div>
      {error && <Message severity="error" text={error} className="w-full" />}

      <Dropdown
        value={legalEntityId}
        options={entities.map((e) => ({
          label: e.registeredName,
          value: e.id,
        }))}
        onChange={(e) => setLegalEntityId(e.value)}
        className="w-full max-w-md"
        placeholder={t('legal_entity')}
      />

      <section className="space-y-3 rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900">{t('entity_defaults')}</h2>
        <p className="text-xs text-gray-500">
          {profile ? t('profile_loaded') : t('profile_missing')}
        </p>
        <div className="flex flex-wrap gap-3">
          <Dropdown
            value={primaryRail}
            options={RAILS}
            onChange={(e) => setPrimaryRail(e.value)}
            placeholder={t('primary_rail')}
          />
          <Dropdown
            value={secondaryRail}
            options={[{ label: '—', value: null }, ...RAILS]}
            onChange={(e) => setSecondaryRail(e.value)}
            placeholder={t('secondary_rail')}
          />
          <Button type="button" label={t('save_profile')} onClick={() => void saveProfile()} />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900">{t('corridors')}</h2>
        <div className="flex flex-wrap gap-2">
          <InputText
            value={payerCountry}
            onChange={(e) => setPayerCountry(e.target.value)}
            placeholder={t('payer_country')}
            maxLength={2}
          />
          <InputText
            value={recipientCountry}
            onChange={(e) => setRecipientCountry(e.target.value)}
            placeholder={t('recipient_country')}
            maxLength={2}
          />
          <Dropdown
            value={corridorPrimary}
            options={RAILS}
            onChange={(e) => setCorridorPrimary(e.value)}
          />
          <Button type="button" label={t('add_corridor')} onClick={() => void addCorridor()} />
        </div>
        <DataTable value={filtered} size="small" emptyMessage={t('empty_corridors')}>
          <Column field="payerCountryCode" header={t('payer_country')} />
          <Column field="recipientBankCountryCode" header={t('recipient_country')} />
          <Column field="primaryRail" header={t('primary_rail')} />
          <Column field="secondaryRail" header={t('secondary_rail')} />
        </DataTable>
      </section>
    </div>
  );
}
