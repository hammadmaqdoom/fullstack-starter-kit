'use client';

import type { TrackerStep } from '@/components/shared/StatusTracker';
import type { PreBoardingPacket, PreBoardingPacketStatus } from '@/libs/api/pre-boarding';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  candidatePortalUrl,
  invitePreBoardingCandidate,
  listPreBoardingPackets,
} from '@/libs/api/pre-boarding';
import { Copy, RefreshCw, Send, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
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

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <OfflineBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Button
          type="button"
          severity="secondary"
          outlined
          className="gap-2 self-start"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className="size-4" aria-hidden />
          {t('refresh')}
        </Button>
      </div>

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
        <EmptyState icon={UserPlus} title={t('empty_title')} description={t('empty_description')} />
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
    </div>
  );
}
