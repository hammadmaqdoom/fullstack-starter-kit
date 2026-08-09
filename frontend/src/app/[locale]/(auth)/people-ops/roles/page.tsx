'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import type {
  AssignableUser,
  PolarisRole,
  UserRoleAssignment,
} from '@/libs/api/roles';
import {
  createUserRole,
  listAssignableUsers,
  listRoles,
  listUserRoles,
  revokeUserRole,
} from '@/libs/api/roles';
import { usePolarisShell } from '@/libs/hooks/usePolarisShell';
import { Plus, RefreshCw, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useMemo, useState } from 'react';

const SCOPE_OPTIONS = [
  { label: 'Own', value: 'own' },
  { label: 'Team', value: 'team' },
  { label: 'Division', value: 'division' },
  { label: 'Legal entity', value: 'legal_entity' },
  { label: 'Country', value: 'country' },
  { label: 'All', value: 'all' },
];

export default function PeopleOpsRolesPage() {
  const t = useTranslations('RoleAdmin');
  const { shell } = usePolarisShell();
  const canMutate = (shell?.roles ?? []).some(
    r => r.toLowerCase() === 'super_admin',
  );
  const [assignments, setAssignments] = useState<UserRoleAssignment[]>([]);
  const [roles, setRoles] = useState<PolarisRole[]>([]);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [scopeType, setScopeType] = useState('all');
  const [scopeId, setScopeId] = useState('');
  const [scopeCountry, setScopeCountry] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [asg, roleRes] = await Promise.all([
        listUserRoles({ activeOnly: !showInactive }),
        listRoles(),
      ]);
      setAssignments(asg.data ?? []);
      setRoles(roleRes.data ?? []);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [t, showInactive]);

  useEffect(() => {
    void load();
  }, [load]);

  const roleOptions = useMemo(
    () => roles.map(r => ({ label: `${r.name} (${r.code})`, value: r.id })),
    [roles],
  );

  const userOptions = useMemo(
    () => users.map(u => ({ label: `${u.name} · ${u.email}`, value: u.userId })),
    [users],
  );

  const openCreate = async () => {
    setFormError(null);
    setUserId('');
    setRoleId('');
    setScopeType('all');
    setScopeId('');
    setScopeCountry('');
    setEffectiveFrom('');
    setCreateOpen(true);
    try {
      const { data } = await listAssignableUsers();
      setUsers(data ?? []);
    } catch {
      setUsers([]);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setFormError(null);
    try {
      await createUserRole({
        userId,
        roleId,
        scopeType,
        scopeId: scopeId.trim() || null,
        scopeCountryCode: scopeCountry.trim() || null,
        effectiveFrom: effectiveFrom || null,
      });
      setCreateOpen(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError ? err.message : t('error_create'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    setError(null);
    try {
      await revokeUserRole(id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : t('error_revoke'),
      );
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <OfflineBanner />

      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        action={(
          <div className="flex gap-2">
            <Button
              type="button"
              severity="secondary"
              outlined
              className="gap-2"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className="size-4" aria-hidden />
              {t('refresh')}
            </Button>
            {canMutate && (
              <Button type="button" className="gap-2" onClick={() => void openCreate()}>
                <Plus className="size-4" aria-hidden />
                {t('assign_cta')}
              </Button>
            )}
          </div>
        )}
      />

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={e => setShowInactive(e.target.checked)}
        />
        {t('show_inactive')}
      </label>

      {loading && (
        <div className="space-y-3">
          <Skeleton height="2.5rem" />
          <Skeleton height="12rem" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <Button type="button" className="mt-4 gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!loading && !error && assignments.length === 0 && (
        <EmptyState
          icon={Shield}
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={canMutate ? t('assign_cta') : undefined}
          onAction={canMutate ? () => void openCreate() : undefined}
        />
      )}

      {!loading && !error && assignments.length > 0 && (
        <DataTable value={assignments} dataKey="id" className="text-sm" stripedRows>
          <Column
            header={t('col_user')}
            body={(row: UserRoleAssignment) => (
              <div>
                <p className="font-medium text-gray-900">{row.userName ?? '—'}</p>
                <p className="text-xs text-gray-500">{row.userEmail ?? row.userId}</p>
              </div>
            )}
          />
          <Column
            header={t('col_role')}
            body={(row: UserRoleAssignment) => (
              <Tag value={row.roleName ?? row.roleCode ?? '—'} severity="info" />
            )}
            style={{ width: '10rem' }}
          />
          <Column field="scopeType" header={t('col_scope')} style={{ width: '8rem' }} />
          <Column
            header={t('col_from')}
            body={(row: UserRoleAssignment) => row.effectiveFrom ?? '—'}
            style={{ width: '7rem' }}
          />
          <Column
            header={t('col_to')}
            body={(row: UserRoleAssignment) => row.effectiveTo ?? '—'}
            style={{ width: '7rem' }}
          />
          <Column
            header=""
            style={{ width: '7rem' }}
            body={(row: UserRoleAssignment) => {
              const revoked = Boolean(
                row.effectiveTo && row.effectiveTo <= new Date().toISOString().slice(0, 10),
              );
              if (revoked) {
                return <span className="text-xs text-gray-400">{t('revoked')}</span>;
              }
              if (!canMutate) {
                return null;
              }
              return (
                <Button
                  type="button"
                  size="small"
                  severity="danger"
                  outlined
                  disabled={revokingId === row.id}
                  onClick={() => void handleRevoke(row.id)}
                >
                  {revokingId === row.id ? t('revoking') : t('revoke')}
                </Button>
              );
            }}
          />
        </DataTable>
      )}

      <Dialog
        header={t('assign_title')}
        visible={createOpen}
        onHide={() => setCreateOpen(false)}
        modal
        dismissableMask
        className="w-full max-w-md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              severity="secondary"
              outlined
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreate()}
              loading={saving}
              disabled={!userId || !roleId}
            >
              {t('assign_submit')}
            </Button>
          </div>
        )}
      >
        <div className="space-y-3">
          {formError && <Message severity="error" text={formError} className="w-full" />}
          <p className="text-xs text-gray-500">{t('assign_help')}</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_user')}</label>
            <Dropdown
              value={userId || null}
              options={userOptions}
              onChange={e => setUserId(e.value ?? '')}
              placeholder={t('field_user_placeholder')}
              className="w-full"
              filter
              emptyMessage={t('no_users')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_role')}</label>
            <Dropdown
              value={roleId || null}
              options={roleOptions}
              onChange={e => setRoleId(e.value ?? '')}
              placeholder={t('field_role_placeholder')}
              className="w-full"
              filter
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_scope')}</label>
            <Dropdown
              value={scopeType}
              options={SCOPE_OPTIONS}
              onChange={e => setScopeType(e.value)}
              className="w-full"
            />
          </div>
          {(scopeType === 'division' || scopeType === 'legal_entity') && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t('field_scope_id')}</label>
              <InputText
                value={scopeId}
                onChange={e => setScopeId(e.target.value)}
                className="w-full"
                placeholder={t('field_scope_id_placeholder')}
              />
            </div>
          )}
          {scopeType === 'country' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t('field_country')}</label>
              <InputText
                value={scopeCountry}
                onChange={e => setScopeCountry(e.target.value.toUpperCase())}
                className="w-full"
                maxLength={2}
                placeholder="PK"
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_from')}</label>
            <InputText
              type="date"
              value={effectiveFrom}
              onChange={e => setEffectiveFrom(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
