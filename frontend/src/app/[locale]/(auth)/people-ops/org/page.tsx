'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ApiRequestError } from '@/libs/api/client';
import {
  createDepartment,
  createDivision,
  createLegalEntity,
  createOfficeLocation,
  listDepartments,
  listDivisions,
  listLegalEntities,
  listOfficeLocations,
  type Department,
  type Division,
  type LegalEntity,
  type OfficeLocation,
} from '@/libs/api/org-admin';
import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { TabPanel, TabView } from 'primereact/tabview';
import { useCallback, useEffect, useState } from 'react';

export default function PeopleOpsOrgPage() {
  const t = useTranslations('OrgAdmin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [offices, setOffices] = useState<OfficeLocation[]>([]);
  const [createOpen, setCreateOpen] = useState<
    null | 'division' | 'department' | 'legal' | 'office'
  >(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [countryCode, setCountryCode] = useState('PK');
  const [currency, setCurrency] = useState('PKR');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, dept, le, o] = await Promise.all([
        listDivisions(),
        listDepartments(),
        listLegalEntities(),
        listOfficeLocations(),
      ]);
      setDivisions(d.data);
      setDepartments(dept.data);
      setLegalEntities(le.data);
      setOffices(o.data);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : t('error_load'),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setName('');
    setCode('');
    setCountryCode('PK');
    setCurrency('PKR');
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      if (createOpen === 'division') {
        await createDivision({ name });
      } else if (createOpen === 'department') {
        await createDepartment({ name });
      } else if (createOpen === 'legal') {
        await createLegalEntity({
          code,
          registeredName: name,
          countryCode,
          functionalCurrency: currency,
          effectiveFrom: new Date().toISOString().slice(0, 10),
        });
      } else if (createOpen === 'office') {
        await createOfficeLocation({
          name,
          countryCode,
          latitude: '0',
          longitude: '0',
        });
      }
      setCreateOpen(null);
      resetForm();
      await load();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : t('error_save'),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageSkeleton variant="table" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('title')}
        description={t('page_description')}
      />

      {error && (
        <Message
          severity="error"
          text={error}
          className="w-full"
        />
      )}

      <TabView>
        <TabPanel header={t('tab_divisions')}>
          {divisions.length === 0
            ? (
                <EmptyState
                  icon={Building2}
                  title={t('empty_divisions')}
                  description={t('empty_hint')}
                  actionLabel={t('create_division')}
                  onAction={() => setCreateOpen('division')}
                />
              )
            : (
                <>
                  <div className="mb-3 flex justify-end">
                    <Button
                      type="button"
                      label={t('create_division')}
                      onClick={() => setCreateOpen('division')}
                    />
                  </div>
                  <DataTable value={divisions} size="small">
                    <Column field="name" header={t('col_name')} />
                  </DataTable>
                </>
              )}
        </TabPanel>
        <TabPanel header={t('tab_departments')}>
          {departments.length === 0
            ? (
                <EmptyState
                  icon={Building2}
                  title={t('empty_departments')}
                  actionLabel={t('create_department')}
                  onAction={() => setCreateOpen('department')}
                />
              )
            : (
                <>
                  <div className="mb-3 flex justify-end">
                    <Button
                      type="button"
                      label={t('create_department')}
                      onClick={() => setCreateOpen('department')}
                    />
                  </div>
                  <DataTable value={departments} size="small">
                    <Column field="name" header={t('col_name')} />
                  </DataTable>
                </>
              )}
        </TabPanel>
        <TabPanel header={t('tab_legal')}>
          {legalEntities.length === 0
            ? (
                <EmptyState
                  icon={Building2}
                  title={t('empty_legal')}
                  actionLabel={t('create_legal')}
                  onAction={() => setCreateOpen('legal')}
                />
              )
            : (
                <>
                  <div className="mb-3 flex justify-end">
                    <Button
                      type="button"
                      label={t('create_legal')}
                      onClick={() => setCreateOpen('legal')}
                    />
                  </div>
                  <DataTable value={legalEntities} size="small">
                    <Column field="code" header={t('col_code')} />
                    <Column field="registeredName" header={t('col_name')} />
                    <Column field="countryCode" header={t('col_country')} />
                    <Column field="status" header={t('col_status')} />
                  </DataTable>
                </>
              )}
        </TabPanel>
        <TabPanel header={t('tab_offices')}>
          {offices.length === 0
            ? (
                <EmptyState
                  icon={Building2}
                  title={t('empty_offices')}
                  actionLabel={t('create_office')}
                  onAction={() => setCreateOpen('office')}
                />
              )
            : (
                <>
                  <div className="mb-3 flex justify-end">
                    <Button
                      type="button"
                      label={t('create_office')}
                      onClick={() => setCreateOpen('office')}
                    />
                  </div>
                  <DataTable value={offices} size="small">
                    <Column field="name" header={t('col_name')} />
                    <Column field="countryCode" header={t('col_country')} />
                  </DataTable>
                </>
              )}
        </TabPanel>
      </TabView>

      <Dialog
        header={t('create_title')}
        visible={createOpen !== null}
        onHide={() => {
          setCreateOpen(null);
          resetForm();
        }}
        className="w-full max-w-md"
        modal
      >
        <div className="flex flex-col gap-3">
          {(createOpen === 'legal') && (
            <InputText
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder={t('code_placeholder')}
            />
          )}
          <InputText
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('name_placeholder')}
          />
          {(createOpen === 'legal' || createOpen === 'office') && (
            <InputText
              value={countryCode}
              onChange={e => setCountryCode(e.target.value.toUpperCase())}
              placeholder={t('country_placeholder')}
              maxLength={2}
            />
          )}
          {createOpen === 'legal' && (
            <InputText
              value={currency}
              onChange={e => setCurrency(e.target.value.toUpperCase())}
              placeholder={t('currency_placeholder')}
              maxLength={3}
            />
          )}
          <Button
            type="button"
            label={t('save')}
            loading={saving}
            disabled={!name.trim() || (createOpen === 'legal' && !code.trim())}
            onClick={() => void handleCreate()}
          />
        </div>
      </Dialog>
    </div>
  );
}
