'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { ApiRequestError } from '@/libs/api/client';
import type { ManagerRelationship, ProjectAssignment } from '@/libs/api/org-relationships';
import {
  createManagerRelationship,
  createProjectAssignment,
  deleteManagerRelationship,
  deleteProjectAssignment,
  listManagerRelationships,
  listProjectAssignments,
} from '@/libs/api/org-relationships';
import type { Worker } from '@/libs/api/workers';
import { listWorkers } from '@/libs/api/workers';
import { Network, Plus, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { TabPanel, TabView } from 'primereact/tabview';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Props = {
  workerId: string;
};

function workerLabel(w: Pick<Worker, 'firstName' | 'lastName' | 'email'>): string {
  return `${w.firstName} ${w.lastName}${w.email ? ` · ${w.email}` : ''}`;
}

export function WorkerOrgPanel({ workerId }: Props) {
  const t = useTranslations('WorkerOrg');
  const [relationships, setRelationships] = useState<ManagerRelationship[]>([]);
  const [projects, setProjects] = useState<ProjectAssignment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mgrOpen, setMgrOpen] = useState(false);
  const [managerId, setManagerId] = useState('');
  const [relType, setRelType] = useState<'direct' | 'dotted_line'>('direct');
  const [mgrFrom, setMgrFrom] = useState('');
  const [mgrTo, setMgrTo] = useState('');
  const [mgrSaving, setMgrSaving] = useState(false);
  const [mgrError, setMgrError] = useState<string | null>(null);

  const [projOpen, setProjOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [projectLeadId, setProjectLeadId] = useState('');
  const [projFrom, setProjFrom] = useState('');
  const [projTo, setProjTo] = useState('');
  const [projSaving, setProjSaving] = useState(false);
  const [projError, setProjError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rels, projs] = await Promise.all([
        listManagerRelationships(workerId),
        listProjectAssignments(workerId),
      ]);
      setRelationships(rels.data ?? []);
      setProjects(projs.data ?? []);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setRelationships([]);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [workerId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const workerOptions = useMemo(
    () =>
      workers
        .filter(w => w.id !== workerId)
        .map(w => ({ label: workerLabel(w), value: w.id })),
    [workers, workerId],
  );

  const ensureWorkers = async () => {
    if (workers.length > 0) {
      return;
    }
    try {
      const { data } = await listWorkers({ limit: 200, status: 'active' });
      setWorkers(data ?? []);
    } catch {
      setWorkers([]);
    }
  };

  const openMgr = async () => {
    setMgrError(null);
    setManagerId('');
    setRelType('direct');
    setMgrFrom('');
    setMgrTo('');
    setMgrOpen(true);
    await ensureWorkers();
  };

  const openProj = async () => {
    setProjError(null);
    setProjectName('');
    setProjectCode('');
    setProjectLeadId('');
    setProjFrom('');
    setProjTo('');
    setProjOpen(true);
    await ensureWorkers();
  };

  const handleCreateMgr = async () => {
    setMgrSaving(true);
    setMgrError(null);
    try {
      await createManagerRelationship({
        workerId,
        managerId,
        relationshipType: relType,
        effectiveFrom: mgrFrom,
        effectiveTo: mgrTo || undefined,
      });
      setMgrOpen(false);
      await load();
    } catch (err) {
      setMgrError(
        err instanceof ApiRequestError ? err.message : t('error_create_mgr'),
      );
    } finally {
      setMgrSaving(false);
    }
  };

  const handleCreateProj = async () => {
    setProjSaving(true);
    setProjError(null);
    try {
      await createProjectAssignment({
        workerId,
        projectName: projectName.trim(),
        projectCode: projectCode.trim() || undefined,
        projectLeadId: projectLeadId || undefined,
        effectiveFrom: projFrom,
        effectiveTo: projTo || undefined,
      });
      setProjOpen(false);
      await load();
    } catch (err) {
      setProjError(
        err instanceof ApiRequestError ? err.message : t('error_create_proj'),
      );
    } finally {
      setProjSaving(false);
    }
  };

  const handleDeleteMgr = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteManagerRelationship(id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : t('error_delete'),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteProj = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteProjectAssignment(id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : t('error_delete'),
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-gray-500" aria-busy="true">
        {t('loading')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">{t('title')}</h2>
        <Button
          type="button"
          text
          size="small"
          className="gap-1"
          onClick={() => void load()}
        >
          <RefreshCw className="size-3.5" aria-hidden />
          {t('refresh')}
        </Button>
      </div>

      {error && <Message severity="error" text={error} className="w-full" />}

      <TabView>
        <TabPanel header={t('tab_managers')}>
          {relationships.length === 0
            ? (
                <EmptyState
                  icon={Network}
                  title={t('empty_mgr_title')}
                  description={t('empty_mgr_description')}
                  actionLabel={t('add_manager')}
                  onAction={() => void openMgr()}
                />
              )
            : (
                <>
                  <div className="mb-3 flex justify-end">
                    <Button type="button" size="small" className="gap-1" onClick={() => void openMgr()}>
                      <Plus className="size-3.5" aria-hidden />
                      {t('add_manager')}
                    </Button>
                  </div>
                  <DataTable value={relationships} size="small" emptyMessage={t('empty_mgr_title')}>
                    <Column
                      header={t('col_manager')}
                      body={(row: ManagerRelationship) =>
                        row.manager
                          ? `${row.manager.firstName} ${row.manager.lastName}`
                          : row.managerId}
                    />
                    <Column field="relationshipType" header={t('col_type')} />
                    <Column field="effectiveFrom" header={t('col_from')} />
                    <Column
                      field="effectiveTo"
                      header={t('col_to')}
                      body={(row: ManagerRelationship) => row.effectiveTo ?? '—'}
                    />
                    <Column
                      header=""
                      body={(row: ManagerRelationship) => (
                        <Button
                          type="button"
                          text
                          severity="danger"
                          size="small"
                          loading={deletingId === row.id}
                          onClick={() => void handleDeleteMgr(row.id)}
                        >
                          {t('remove')}
                        </Button>
                      )}
                    />
                  </DataTable>
                </>
              )}
        </TabPanel>

        <TabPanel header={t('tab_projects')}>
          {projects.length === 0
            ? (
                <EmptyState
                  icon={Network}
                  title={t('empty_proj_title')}
                  description={t('empty_proj_description')}
                  actionLabel={t('add_project')}
                  onAction={() => void openProj()}
                />
              )
            : (
                <>
                  <div className="mb-3 flex justify-end">
                    <Button type="button" size="small" className="gap-1" onClick={() => void openProj()}>
                      <Plus className="size-3.5" aria-hidden />
                      {t('add_project')}
                    </Button>
                  </div>
                  <DataTable value={projects} size="small">
                    <Column field="projectName" header={t('col_project')} />
                    <Column
                      field="projectCode"
                      header={t('col_code')}
                      body={(row: ProjectAssignment) => row.projectCode ?? '—'}
                    />
                    <Column
                      header={t('col_lead')}
                      body={(row: ProjectAssignment) =>
                        row.projectLead
                          ? `${row.projectLead.firstName} ${row.projectLead.lastName}`
                          : '—'}
                    />
                    <Column field="effectiveFrom" header={t('col_from')} />
                    <Column
                      field="effectiveTo"
                      header={t('col_to')}
                      body={(row: ProjectAssignment) => row.effectiveTo ?? '—'}
                    />
                    <Column
                      header=""
                      body={(row: ProjectAssignment) => (
                        <Button
                          type="button"
                          text
                          severity="danger"
                          size="small"
                          loading={deletingId === row.id}
                          onClick={() => void handleDeleteProj(row.id)}
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

      <Dialog
        header={t('add_manager')}
        visible={mgrOpen}
        onHide={() => setMgrOpen(false)}
        className="w-full max-w-md"
        modal
        dismissableMask
      >
        <div className="space-y-3">
          {mgrError && <Message severity="error" text={mgrError} className="w-full" />}
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_manager')}</span>
            <Dropdown
              value={managerId}
              options={workerOptions}
              onChange={e => setManagerId(e.value)}
              placeholder={t('field_manager_placeholder')}
              filter
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_rel_type')}</span>
            <Dropdown
              value={relType}
              options={[
                { label: t('type_direct'), value: 'direct' },
                { label: t('type_dotted'), value: 'dotted_line' },
              ]}
              onChange={e => setRelType(e.value)}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_from')}</span>
            <InputText
              type="date"
              value={mgrFrom}
              onChange={e => setMgrFrom(e.target.value)}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_to')}</span>
            <InputText
              type="date"
              value={mgrTo}
              onChange={e => setMgrTo(e.target.value)}
              className="w-full"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" outlined onClick={() => setMgrOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              loading={mgrSaving}
              disabled={!managerId || !mgrFrom}
              onClick={() => void handleCreateMgr()}
            >
              {t('save')}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        header={t('add_project')}
        visible={projOpen}
        onHide={() => setProjOpen(false)}
        className="w-full max-w-md"
        modal
        dismissableMask
      >
        <div className="space-y-3">
          {projError && <Message severity="error" text={projError} className="w-full" />}
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_project')}</span>
            <InputText
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_code')}</span>
            <InputText
              value={projectCode}
              onChange={e => setProjectCode(e.target.value)}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_lead')}</span>
            <Dropdown
              value={projectLeadId}
              options={workerOptions}
              onChange={e => setProjectLeadId(e.value)}
              placeholder={t('field_lead_placeholder')}
              showClear
              filter
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_from')}</span>
            <InputText
              type="date"
              value={projFrom}
              onChange={e => setProjFrom(e.target.value)}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">{t('field_to')}</span>
            <InputText
              type="date"
              value={projTo}
              onChange={e => setProjTo(e.target.value)}
              className="w-full"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" outlined onClick={() => setProjOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              loading={projSaving}
              disabled={!projectName.trim() || !projFrom}
              onClick={() => void handleCreateProj()}
            >
              {t('save')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
