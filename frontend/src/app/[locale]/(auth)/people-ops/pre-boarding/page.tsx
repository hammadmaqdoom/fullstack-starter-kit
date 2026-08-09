'use client';

import type { TrackerStep } from '@/components/shared/StatusTracker';
import type { PreBoardingPacket, PreBoardingPacketStatus } from '@/libs/api/pre-boarding';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  candidatePortalUrl,
  createPreBoardingPacket,
  invitePreBoardingCandidate,
  listPreBoardingPackets,
} from '@/libs/api/pre-boarding';
import { listWorkers, type Worker } from '@/libs/api/workers';
import { PageHeader } from '@/components/shared/PageHeader';
import { Copy, Plus, RefreshCw, Send, UserPlus } from 'lucide-react';
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

const PACKET_STAGE_ORDER: PreBoardingPacketStatus[] = [
  'draft',
  'invited',
  'in_progress',
  'submitted',
  'under_review',
  'approved',
  'complete',
];

function statusSeverity(status: string): 'success' | 'warning' | 'secondary' | 'info' | 'danger' {
  if (status === 'complete' || status === 'approved') {
    return 'success';
  }
  if (status === 'cancelled') {
    return 'danger';
  }
  if (status === 'draft') {
    return 'secondary';
  }
  return 'info';
}

function candidateName(packet: PreBoardingPacket): string {
  if (packet.worker) {
    const name = `${packet.worker.firstName} ${packet.worker.lastName}`.trim();
    if (name) {
      return name;
    }
  }
  return packet.personalEmail ?? packet.id;
}

export default function PeopleOpsPreBoardingPage() {
  const t = useTranslations('PreBoarding');
  const [packets, setPackets] = useState<PreBoardingPacket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const [detail, setDetail] = useState<PreBoardingPacket | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createWorkerId, setCreateWorkerId] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta } = await listPreBoardingPackets();
      setPackets(data ?? []);
      setUnavailable(Boolean(meta?.unavailable));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setPackets([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadWorkers = useCallback(async () => {
    try {
      const { data } = await listWorkers({ status: 'active', limit: 200 });
      setWorkers(data ?? []);
    } catch {
      setWorkers([]);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadWorkers();
  }, [load, loadWorkers]);

  const openDetail = (packet: PreBoardingPacket) => {
    setDetail(packet);
    setDetailMessage(null);
    setDetailError(null);
    setCopiedId(null);
  };

  const handleInvite = async (packet: PreBoardingPacket) => {
    setInvitingId(packet.id);
    setDetailError(null);
    try {
      const { data } = await invitePreBoardingCandidate(packet.id);
      setPackets(prev => prev.map(item => (item.id === data.id ? data : item)));
      setDetail(data);
      setDetailMessage(t('invite_success'));
    } catch (err) {
      setDetailError(err instanceof ApiRequestError ? err.message : t('error_invite'));
    } finally {
      setInvitingId(null);
    }
  };

  const handleCopyLink = async (packet: PreBoardingPacket) => {
    const url = candidatePortalUrl(packet.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(packet.id);
      setDetailMessage(t('link_copied'));
    } catch {
      setDetailMessage(url);
    }
  };

  const trackerSteps: TrackerStep[] = useMemo(() => {
    if (!detail) {
      return [];
    }
    const current = detail.status as PreBoardingPacketStatus;
    if (current === 'cancelled') {
      return [{ label: t(`status_${current}` as 'status_draft'), state: 'current' }];
    }
    const currentIdx = PACKET_STAGE_ORDER.indexOf(current);
    return PACKET_STAGE_ORDER.map((stage, idx) => ({
      label: t(`status_${stage}` as 'status_draft'),
      state: idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : 'todo',
    }));
  }, [detail, t]);

  const workerOptions = useMemo(
    () =>
      workers.map(w => ({
        label: `${w.firstName} ${w.lastName}`.trim() || w.email,
        value: w.id,
        email: w.email,
      })),
    [workers],
  );

  const openCreate = () => {
    setCreateError(null);
    setCreateWorkerId('');
    setCreateEmail('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const { data } = await createPreBoardingPacket({
        workerId: createWorkerId.trim(),
        personalEmail: createEmail.trim(),
      });
      setCreateOpen(false);
      setCreateWorkerId('');
      setCreateEmail('');
      await load();
      openDetail(data);
    } catch (err) {
      setCreateError(
        err instanceof ApiRequestError ? err.message : t('error_create'),
      );
    } finally {
      setCreating(false);
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
            <Button type="button" className="gap-2" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              {t('create_cta')}
            </Button>
          </div>
        )}
      />

      {unavailable && (
        <Message severity="warn" text={t('error_load')} className="w-full" />
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton height="2.5rem" />
          <Skeleton height="10rem" />
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

      {!loading && !error && packets.length === 0 && (
        <EmptyState
          icon={UserPlus}
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={t('create_cta')}
          onAction={openCreate}
        />
      )}

      {!loading && !error && packets.length > 0 && (
        <DataTable
          value={packets}
          dataKey="id"
          className="text-sm"
          stripedRows
          rowHover
          onRowClick={e => openDetail(e.data as PreBoardingPacket)}
          emptyMessage={t('empty_title')}
        >
          <Column header={t('col_candidate')} body={(row: PreBoardingPacket) => (
            <div>
              <p className="font-medium text-gray-900">{candidateName(row)}</p>
              <p className="text-xs text-gray-500">{row.personalEmail}</p>
            </div>
          )}
          />
          <Column
            header={t('col_country')}
            body={(row: PreBoardingPacket) => row.worker?.countryCode ?? '—'}
            style={{ width: '7rem' }}
          />
          <Column
            header={t('col_status')}
            body={(row: PreBoardingPacket) => (
              <Tag value={t(`status_${row.status}` as 'status_draft')} severity={statusSeverity(row.status)} />
            )}
            style={{ width: '9rem' }}
          />
          <Column
            header={t('col_created')}
            body={(row: PreBoardingPacket) => row.createdAt?.slice(0, 10) ?? '—'}
            style={{ width: '8rem' }}
          />
          <Column
            header=""
            body={(row: PreBoardingPacket) => (
              row.status === 'draft' ? (
                <Button
                  type="button"
                  size="small"
                  className="gap-1"
                  disabled={invitingId === row.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleInvite(row);
                  }}
                >
                  <Send className="size-3.5" aria-hidden />
                  {invitingId === row.id ? t('inviting') : t('invite')}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="small"
                  severity="secondary"
                  outlined
                  className="gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleCopyLink(row);
                  }}
                >
                  <Copy className="size-3.5" aria-hidden />
                  {t('copy_link')}
                </Button>
              )
            )}
            style={{ width: '10rem' }}
          />
        </DataTable>
      )}

      <Dialog
        header={t('detail_title')}
        visible={detail !== null}
        onHide={() => setDetail(null)}
        modal
        dismissableMask
        className="w-full max-w-lg"
      >
        {detail && (
          <div className="space-y-4">
            {detailMessage && <Message severity="success" text={detailMessage} className="w-full" />}
            {detailError && <Message severity="error" text={detailError} className="w-full" />}

            <div>
              <p className="text-sm font-semibold text-gray-900">{candidateName(detail)}</p>
              <p className="text-xs text-gray-500">{t('personal_email', { email: detail.personalEmail ?? '—' })}</p>
              {detail.worker && (
                <p className="text-xs text-gray-500">
                  {t('worker_label', { name: `${detail.worker.firstName} ${detail.worker.lastName}` })}
                </p>
              )}
            </div>

            <StatusTracker steps={trackerSteps} />

            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
              {detail.status === 'draft' && (
                <Button
                  type="button"
                  className="gap-2"
                  disabled={invitingId === detail.id}
                  onClick={() => void handleInvite(detail)}
                >
                  <Send className="size-4" aria-hidden />
                  {invitingId === detail.id ? t('inviting') : t('invite')}
                </Button>
              )}
              {detail.status !== 'draft' && (
                <Button
                  type="button"
                  severity="secondary"
                  outlined
                  className="gap-2"
                  onClick={() => void handleCopyLink(detail)}
                >
                  <Copy className="size-4" aria-hidden />
                  {copiedId === detail.id ? t('link_copied') : t('copy_link')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        header={t('create_title')}
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
              disabled={creating}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating || !createWorkerId || !createEmail.trim()}
              loading={creating}
            >
              {t('create_submit')}
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          {createError && <Message severity="error" text={createError} className="w-full" />}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="preboard-worker" className="text-sm font-medium text-gray-700">
              {t('field_worker')}
            </label>
            <Dropdown
              inputId="preboard-worker"
              value={createWorkerId || null}
              options={workerOptions}
              onChange={(e) => {
                setCreateWorkerId(e.value ?? '');
                const selected = workers.find(w => w.id === e.value);
                if (selected?.email && !createEmail.trim()) {
                  setCreateEmail(selected.email);
                }
              }}
              placeholder={t('field_worker_placeholder')}
              className="w-full"
              filter
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="preboard-email" className="text-sm font-medium text-gray-700">
              {t('field_personal_email')}
            </label>
            <InputText
              id="preboard-email"
              type="email"
              value={createEmail}
              onChange={e => setCreateEmail(e.target.value)}
              className="w-full"
              placeholder={t('field_personal_email_placeholder')}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
