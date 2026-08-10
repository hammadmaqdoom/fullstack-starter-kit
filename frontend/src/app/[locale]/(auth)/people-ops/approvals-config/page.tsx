'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { listCountries, type CountryConfig } from '@/libs/api/country-config';
import { listLegalEntities } from '@/libs/api/org-admin';
import type {
  ApprovalDelegation,
  ApprovalRoutingConfig,
} from '@/libs/api/org-relationships';
import {
  createApprovalDelegation,
  createApprovalRoutingConfig,
  deleteApprovalDelegation,
  deleteApprovalRoutingConfig,
  listApprovalDelegations,
  listApprovalRoutingConfigs,
} from '@/libs/api/org-relationships';
import type { Worker } from '@/libs/api/workers';
import { listWorkers } from '@/libs/api/workers';
import { GitBranch, Plus, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { TabPanel, TabView } from 'primereact/tabview';
import { useCallback, useEffect, useMemo, useState } from 'react';

function workerLabel(w: Pick<Worker, 'firstName' | 'lastName' | 'email'>): string {
  return `${w.firstName} ${w.lastName}${w.email ? ` · ${w.email}` : ''}`;
}

export default function ApprovalsConfigPage() {
  const t = useTranslations('ApprovalsConfig');
  const [delegations, setDelegations] = useState<ApprovalDelegation[]>([]);
  const [routing, setRouting] = useState<ApprovalRoutingConfig[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [countries, setCountries] = useState<CountryConfig[]>([]);
  const [legalEntities, setLegalEntities] = useState<
    { id: string; code: string; registeredName: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [delOpen, setDelOpen] = useState(false);
  const [delegatorId, setDelegatorId] = useState('');
  const [delegateId, setDelegateId] = useState('');
  const [scope, setScope] = useState<'approvals' | 'all'>('approvals');
  const [delFrom, setDelFrom] = useState('');
  const [delTo, setDelTo] = useState('');
  const [reason, setReason] = useState('');
  const [delSaving, setDelSaving] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const [routeOpen, setRouteOpen] = useState(false);
  const [workflowType, setWorkflowType] = useState<'leave' | 'expense' | 'travel'>('leave');
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [legalEntityId, setLegalEntityId] = useState<string | null>(null);
  const [amountThreshold, setAmountThreshold] = useState<number | null>(null);
  const [approverMode, setApproverMode] = useState<'serial' | 'parallel'>('serial');
  const [escalationDays, setEscalationDays] = useState<number | null>(null);
  const [routeSaving, setRouteSaving] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dels, routes] = await Promise.all([
        listApprovalDelegations(),
        listApprovalRoutingConfigs(),
      ]);
      setDelegations(dels.data ?? []);
      setRouting(routes.data ?? []);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setDelegations([]);
      setRouting([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const workerOptions = useMemo(
    () => workers.map(w => ({ label: workerLabel(w), value: w.id })),
    [workers],
  );

  const countryOptions = useMemo(
    () => countries.map(c => ({ label: c.countryCode, value: c.countryCode })),
    [countries],
  );

  const leOptions = useMemo(
    () =>
      legalEntities.map(le => ({
        label: `${le.code} — ${le.registeredName}`,
        value: le.id,
      })),
    [legalEntities],
  );

  const ensurePickers = async () => {
    if (workers.length === 0) {
      try {
        const { data } = await listWorkers({ limit: 200, status: 'active' });
        setWorkers(data ?? []);
      } catch {
        setWorkers([]);
      }
    }
    if (countries.length === 0) {
      try {
        const { data } = await listCountries();
        setCountries(data ?? []);
      } catch {
        setCountries([]);
      }
    }
    if (legalEntities.length === 0) {
      try {
        const { data } = await listLegalEntities();
        setLegalEntities(data ?? []);
      } catch {
        setLegalEntities([]);
      }
    }
  };

  const openDel = async () => {
    setDelError(null);
    setDelegatorId('');
    setDelegateId('');
    setScope('approvals');
    setDelFrom('');
    setDelTo('');
    setReason('');
    setDelOpen(true);
    await ensurePickers();
  };

  const openRoute = async () => {
    setRouteError(null);
    setWorkflowType('leave');
    setCountryCode(null);
    setLegalEntityId(null);
    setAmountThreshold(null);
    setApproverMode('serial');
    setEscalationDays(null);
    setRouteOpen(true);
    await ensurePickers();
  };

  const handleCreateDel = async () => {
    setDelSaving(true);
    setDelError(null);
    try {
      await createApprovalDelegation({
        delegatorWorkerId: delegatorId,
        delegateWorkerId: delegateId,
        scope,
        effectiveFrom: delFrom,
        effectiveTo: delTo,
        reason: reason.trim() || undefined,
      });
      setDelOpen(false);
      await load();
    } catch (err) {
      setDelError(
        err instanceof ApiRequestError ? err.message : t('error_create_del'),
      );
    } finally {
      setDelSaving(false);
    }
  };

  const handleCreateRoute = async () => {
    setRouteSaving(true);
    setRouteError(null);
    try {
      await createApprovalRoutingConfig({
        workflowType,
        countryCode: countryCode || undefined,
        legalEntityId: legalEntityId || undefined,
        amountThreshold: amountThreshold ?? undefined,
        approverMode,
        escalationAfterDays: escalationDays ?? undefined,
      });
      setRouteOpen(false);
      await load();
    } catch (err) {
      setRouteError(
        err instanceof ApiRequestError ? err.message : t('error_create_route'),
      );
    } finally {
      setRouteSaving(false);
    }
  };

  const handleDeleteDel = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteApprovalDelegation(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_delete'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteApprovalRoutingConfig(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_delete'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <OfflineBanner />
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        action={(
          <Button type="button" outlined className="gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" aria-hidden />
            {t('refresh')}
          </Button>
        )}
      />

      {error && <Message severity="error" text={error} className="w-full" />}

      {loading
        ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton height="2rem" />
              <Skeleton height="12rem" className="w-full" />
            </div>
          )
        : (
            <TabView>
              <TabPanel header={t('tab_delegations')}>
                {delegations.length === 0
                  ? (
                      <EmptyState
                        icon={GitBranch}
                        title={t('empty_del_title')}
                        description={t('empty_del_description')}
                        actionLabel={t('add_delegation')}
                        onAction={() => void openDel()}
                      />
                    )
                  : (
                      <>
                        <div className="mb-3 flex justify-end">
                          <Button type="button" className="gap-1" onClick={() => void openDel()}>
                            <Plus className="size-4" aria-hidden />
                            {t('add_delegation')}
                          </Button>
                        </div>
                        <DataTable value={delegations} size="small">
                          <Column
                            header={t('col_delegator')}
                            body={(row: ApprovalDelegation) =>
                              row.delegatorWorker
                                ? `${row.delegatorWorker.firstName} ${row.delegatorWorker.lastName}`
                                : row.delegatorWorkerId}
                          />
                          <Column
                            header={t('col_delegate')}
                            body={(row: ApprovalDelegation) =>
                              row.delegateWorker
                                ? `${row.delegateWorker.firstName} ${row.delegateWorker.lastName}`
                                : row.delegateWorkerId}
                          />
                          <Column field="scope" header={t('col_scope')} />
                          <Column field="effectiveFrom" header={t('col_from')} />
                          <Column field="effectiveTo" header={t('col_to')} />
                          <Column
                            header=""
                            body={(row: ApprovalDelegation) => (
                              <Button
                                type="button"
                                text
                                severity="danger"
                                size="small"
                                loading={deletingId === row.id}
                                onClick={() => void handleDeleteDel(row.id)}
                              >
                                {t('remove')}
                              </Button>
                            )}
                          />
                        </DataTable>
                      </>
                    )}
              </TabPanel>

              <TabPanel header={t('tab_routing')}>
                {routing.length === 0
                  ? (
                      <EmptyState
                        icon={GitBranch}
                        title={t('empty_route_title')}
                        description={t('empty_route_description')}
                        actionLabel={t('add_routing')}
                        onAction={() => void openRoute()}
                      />
                    )
                  : (
                      <>
                        <div className="mb-3 flex justify-end">
                          <Button type="button" className="gap-1" onClick={() => void openRoute()}>
                            <Plus className="size-4" aria-hidden />
                            {t('add_routing')}
                          </Button>
                        </div>
                        <DataTable value={routing} size="small">
                          <Column field="workflowType" header={t('col_workflow')} />
                          <Column
                            field="countryCode"
                            header={t('col_country')}
                            body={(row: ApprovalRoutingConfig) => row.countryCode ?? '—'}
                          />
                          <Column
                            field="amountThreshold"
                            header={t('col_threshold')}
                            body={(row: ApprovalRoutingConfig) => row.amountThreshold ?? '—'}
                          />
                          <Column field="approverMode" header={t('col_mode')} />
                          <Column
                            field="escalationAfterDays"
                            header={t('col_escalation')}
                            body={(row: ApprovalRoutingConfig) =>
                              row.escalationAfterDays ?? '—'}
                          />
                          <Column
                            field="isActive"
                            header={t('col_active')}
                            body={(row: ApprovalRoutingConfig) =>
                              row.isActive ? t('yes') : t('no')}
                          />
                          <Column
                            header=""
                            body={(row: ApprovalRoutingConfig) => (
                              <Button
                                type="button"
                                text
                                severity="danger"
                                size="small"
                                loading={deletingId === row.id}
                                onClick={() => void handleDeleteRoute(row.id)}
                              >
                                {t('remove')}
                              </Button>
                            )}
                          />
                        </DataTable>
                      </>
                    )}
              </TabPanel>
            </TabView>
          )}

      <Dialog
        header={t('add_delegation')}
        visible={delOpen}
        onHide={() => setDelOpen(false)}
        className="w-full max-w-md"
        modal
        dismissableMask
      >
        <div className="space-y-3">
          {delError && <Message severity="error" text={delError} className="w-full" />}
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_delegator')}</span>
            <Dropdown
              value={delegatorId}
              options={workerOptions}
              onChange={e => setDelegatorId(e.value)}
              filter
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_delegate')}</span>
            <Dropdown
              value={delegateId}
              options={workerOptions.filter(o => o.value !== delegatorId)}
              onChange={e => setDelegateId(e.value)}
              filter
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_scope')}</span>
            <Dropdown
              value={scope}
              options={[
                { label: t('scope_approvals'), value: 'approvals' },
                { label: t('scope_all'), value: 'all' },
              ]}
              onChange={e => setScope(e.value)}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_from')}</span>
            <InputText type="date" value={delFrom} onChange={e => setDelFrom(e.target.value)} className="w-full" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_to')}</span>
            <InputText type="date" value={delTo} onChange={e => setDelTo(e.target.value)} className="w-full" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_reason')}</span>
            <InputText value={reason} onChange={e => setReason(e.target.value)} className="w-full" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" outlined onClick={() => setDelOpen(false)}>{t('cancel')}</Button>
            <Button
              type="button"
              loading={delSaving}
              disabled={!delegatorId || !delegateId || !delFrom || !delTo}
              onClick={() => void handleCreateDel()}
            >
              {t('save')}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        header={t('add_routing')}
        visible={routeOpen}
        onHide={() => setRouteOpen(false)}
        className="w-full max-w-md"
        modal
        dismissableMask
      >
        <div className="space-y-3">
          {routeError && <Message severity="error" text={routeError} className="w-full" />}
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_workflow')}</span>
            <Dropdown
              value={workflowType}
              options={[
                { label: t('workflow_leave'), value: 'leave' },
                { label: t('workflow_expense'), value: 'expense' },
                { label: t('workflow_travel'), value: 'travel' },
              ]}
              onChange={e => setWorkflowType(e.value)}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_country')}</span>
            <Dropdown
              value={countryCode}
              options={countryOptions}
              onChange={e => setCountryCode(e.value)}
              showClear
              placeholder={t('field_country_all')}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_legal_entity')}</span>
            <Dropdown
              value={legalEntityId}
              options={leOptions}
              onChange={e => setLegalEntityId(e.value)}
              showClear
              filter
              placeholder={t('field_legal_entity_all')}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_threshold')}</span>
            <InputNumber
              value={amountThreshold}
              onValueChange={e => setAmountThreshold(e.value ?? null)}
              className="w-full"
              mode="decimal"
              minFractionDigits={0}
              maxFractionDigits={2}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_mode')}</span>
            <Dropdown
              value={approverMode}
              options={[
                { label: t('mode_serial'), value: 'serial' },
                { label: t('mode_parallel'), value: 'parallel' },
              ]}
              onChange={e => setApproverMode(e.value)}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_escalation')}</span>
            <InputNumber
              value={escalationDays}
              onValueChange={e => setEscalationDays(e.value ?? null)}
              className="w-full"
              min={1}
              showButtons
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" outlined onClick={() => setRouteOpen(false)}>{t('cancel')}</Button>
            <Button
              type="button"
              loading={routeSaving}
              onClick={() => void handleCreateRoute()}
            >
              {t('save')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
