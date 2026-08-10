'use client';

import { ApiRequestError } from '@/libs/api/client';
import type {
  Division,
  LegalEntity,
  LegalEntityCurrency,
  LegalEntityDivisionMapping,
  LegalEntitySignatory,
} from '@/libs/api/org-admin';
import {
  createLegalEntityCurrency,
  createLegalEntityMapping,
  createLegalEntitySignatory,
  listLegalEntityCurrencies,
  listLegalEntityMappings,
  listLegalEntitySignatories,
  updateLegalEntityCurrency,
  updateLegalEntitySignatory,
} from '@/libs/api/org-admin';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { TabPanel, TabView } from 'primereact/tabview';
import { useCallback, useEffect, useState } from 'react';

type Props = {
  legalEntity: LegalEntity | null;
  divisions: Division[];
  countryOptions: Array<{ label: string; value: string }>;
  onHide: () => void;
};

export function LegalEntityDetailDialog({
  legalEntity,
  divisions,
  countryOptions,
  onHide,
}: Props) {
  const t = useTranslations('OrgAdmin');
  const [mappings, setMappings] = useState<LegalEntityDivisionMapping[]>([]);
  const [currencies, setCurrencies] = useState<LegalEntityCurrency[]>([]);
  const [signatories, setSignatories] = useState<LegalEntitySignatory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [mapDivisionId, setMapDivisionId] = useState<string | null>(null);
  const [mapCountry, setMapCountry] = useState('');
  const [mapFrom, setMapFrom] = useState('');
  const [mapDefault, setMapDefault] = useState(false);

  const [currencyCode, setCurrencyCode] = useState('');
  const [currencyDefault, setCurrencyDefault] = useState(false);

  const [sigName, setSigName] = useState('');
  const [sigTitle, setSigTitle] = useState('');
  const [sigEmail, setSigEmail] = useState('');
  const [sigFrom, setSigFrom] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!legalEntity) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [m, c, s] = await Promise.all([
        listLegalEntityMappings(legalEntity.id),
        listLegalEntityCurrencies(legalEntity.id),
        listLegalEntitySignatories(legalEntity.id),
      ]);
      setMappings(m.data ?? []);
      setCurrencies(c.data ?? []);
      setSignatories(s.data ?? []);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load_le_detail'));
    } finally {
      setLoading(false);
    }
  }, [legalEntity, t]);

  useEffect(() => {
    if (legalEntity) {
      setMapCountry(legalEntity.countryCode);
      setMapFrom(new Date().toISOString().slice(0, 10));
      setSigFrom(new Date().toISOString().slice(0, 10));
      setCurrencyCode(legalEntity.functionalCurrency);
      void load();
    }
  }, [legalEntity, load]);

  if (!legalEntity) {
    return null;
  }

  const handleCreateMapping = async () => {
    setSaving(true);
    setError(null);
    try {
      await createLegalEntityMapping(legalEntity.id, {
        divisionId: mapDivisionId,
        countryCode: mapCountry,
        effectiveFrom: mapFrom,
        isDefault: mapDefault,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCurrency = async () => {
    setSaving(true);
    setError(null);
    try {
      await createLegalEntityCurrency(legalEntity.id, {
        currencyCode,
        isDefault: currencyDefault,
      });
      setCurrencyCode('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSignatory = async () => {
    setSaving(true);
    setError(null);
    try {
      await createLegalEntitySignatory(legalEntity.id, {
        name: sigName.trim(),
        title: sigTitle.trim(),
        email: sigEmail.trim() || null,
        effectiveFrom: sigFrom,
      });
      setSigName('');
      setSigTitle('');
      setSigEmail('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      header={`${legalEntity.code} — ${legalEntity.registeredName}`}
      visible={!!legalEntity}
      onHide={onHide}
      className="w-full max-w-3xl"
      modal
      dismissableMask
    >
      <div className="space-y-3">
        {error && <Message severity="error" text={error} className="w-full" />}
        {loading && <p className="text-sm text-gray-500">{t('loading_detail')}</p>}

        <TabView>
          <TabPanel header={t('tab_mappings')}>
            <DataTable value={mappings} size="small" emptyMessage={t('empty_mappings')}>
              <Column field="countryCode" header={t('col_country')} />
              <Column
                field="divisionId"
                header={t('col_division')}
                body={row =>
                  divisions.find(d => d.id === row.divisionId)?.name ?? row.divisionId ?? '—'}
              />
              <Column field="priority" header={t('col_priority')} />
              <Column field="effectiveFrom" header={t('col_from')} />
              <Column
                field="isDefault"
                header={t('col_default')}
                body={row => (row.isDefault ? t('yes') : t('no'))}
              />
            </DataTable>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Dropdown
                value={mapCountry}
                options={countryOptions}
                onChange={e => setMapCountry(e.value)}
                placeholder={t('field_country')}
                className="w-full"
              />
              <Dropdown
                value={mapDivisionId}
                options={divisions.map(d => ({ label: d.name, value: d.id }))}
                onChange={e => setMapDivisionId(e.value)}
                showClear
                placeholder={t('field_division_optional')}
                className="w-full"
              />
              <InputText
                type="date"
                value={mapFrom}
                onChange={e => setMapFrom(e.target.value)}
                className="w-full"
              />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={mapDefault}
                  onChange={e => setMapDefault(e.checked ?? false)}
                />
                {t('field_default')}
              </label>
            </div>
            <Button
              type="button"
              className="mt-3"
              loading={saving}
              disabled={!mapCountry || !mapFrom}
              onClick={() => void handleCreateMapping()}
              label={t('add_mapping')}
            />
          </TabPanel>

          <TabPanel header={t('tab_currencies')}>
            <DataTable value={currencies} size="small" emptyMessage={t('empty_currencies')}>
              <Column field="currencyCode" header={t('col_currency')} />
              <Column
                field="isDefault"
                header={t('col_default')}
                body={row => (row.isDefault ? t('yes') : t('no'))}
              />
              <Column
                field="isActive"
                header={t('col_active')}
                body={(row: LegalEntityCurrency) => (
                  <Button
                    type="button"
                    text
                    size="small"
                    onClick={() =>
                      void updateLegalEntityCurrency(legalEntity.id, row.id, {
                        isActive: !row.isActive,
                      }).then(() => load())}
                  >
                    {row.isActive ? t('deactivate') : t('activate')}
                  </Button>
                )}
              />
            </DataTable>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <InputText
                value={currencyCode}
                onChange={e => setCurrencyCode(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="PKR"
                className="w-24"
              />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={currencyDefault}
                  onChange={e => setCurrencyDefault(e.checked ?? false)}
                />
                {t('field_default')}
              </label>
              <Button
                type="button"
                loading={saving}
                disabled={currencyCode.length !== 3}
                onClick={() => void handleCreateCurrency()}
                label={t('add_currency')}
              />
            </div>
          </TabPanel>

          <TabPanel header={t('tab_signatories')}>
            <DataTable value={signatories} size="small" emptyMessage={t('empty_signatories')}>
              <Column field="name" header={t('col_name')} />
              <Column field="title" header={t('col_title')} />
              <Column field="email" header={t('col_email')} body={row => row.email ?? '—'} />
              <Column
                field="isActive"
                header={t('col_active')}
                body={(row: LegalEntitySignatory) => (
                  <Button
                    type="button"
                    text
                    size="small"
                    onClick={() =>
                      void updateLegalEntitySignatory(legalEntity.id, row.id, {
                        isActive: !row.isActive,
                      }).then(() => load())}
                  >
                    {row.isActive ? t('deactivate') : t('activate')}
                  </Button>
                )}
              />
            </DataTable>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <InputText
                value={sigName}
                onChange={e => setSigName(e.target.value)}
                placeholder={t('field_sig_name')}
                className="w-full"
              />
              <InputText
                value={sigTitle}
                onChange={e => setSigTitle(e.target.value)}
                placeholder={t('field_sig_title')}
                className="w-full"
              />
              <InputText
                value={sigEmail}
                onChange={e => setSigEmail(e.target.value)}
                placeholder={t('field_sig_email')}
                className="w-full"
              />
              <InputText
                type="date"
                value={sigFrom}
                onChange={e => setSigFrom(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              type="button"
              className="mt-3"
              loading={saving}
              disabled={!sigName.trim() || !sigTitle.trim() || !sigFrom}
              onClick={() => void handleCreateSignatory()}
              label={t('add_signatory')}
            />
          </TabPanel>
        </TabView>
      </div>
    </Dialog>
  );
}
