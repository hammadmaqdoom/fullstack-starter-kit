'use client';

import type { TrackerStep } from '@/components/shared/StatusTracker';
import type { HelpDeskStatus, HelpDeskTicket } from '@/libs/api/help-desk';
import { AlertCircle, ArrowLeft, RefreshCw, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  addTicketComment,
  closeHelpDeskTicket,
  getHelpDeskTicket,
} from '@/libs/api/help-desk';
import { useRouter } from '@/libs/I18nNavigation';

const STATUS_SEVERITY: Record<HelpDeskStatus, 'secondary' | 'info' | 'warning' | 'success' | 'danger'> = {
  open: 'info',
  in_progress: 'warning',
  waiting_on_employee: 'warning',
  resolved: 'success',
  closed: 'secondary',
};

function ticketTrackerSteps(
  ticket: HelpDeskTicket,
  t: ReturnType<typeof useTranslations<'EmployeeHelp'>>,
): TrackerStep[] {
  const order = ['open', 'in_progress', 'waiting_on_employee', 'resolved', 'closed'];
  const currentIndex = order.indexOf(ticket.status);
  const labels = [
    t('tracker_open'),
    t('tracker_in_progress'),
    t('tracker_waiting'),
    t('tracker_resolved'),
    t('tracker_closed'),
  ];
  return labels.map((label, index) => ({
    label,
    state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo',
  }));
}

export default function EmployeeHelpDetailPage() {
  const t = useTranslations('EmployeeHelp');
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<HelpDeskTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const [commentBody, setCommentBody] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isCommenting, setIsCommenting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await getHelpDeskTicket(ticketId);
      setTicket(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setTicket(null);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddComment = async () => {
    if (!ticket) {
      return;
    }
    if (!commentBody.trim()) {
      setCommentError(t('error_comment_required'));
      return;
    }
    setCommentError(null);
    setIsCommenting(true);
    try {
      await addTicketComment(ticket.id, commentBody.trim());
      setCommentBody('');
      await load();
    } catch (err) {
      setCommentError(err instanceof ApiRequestError ? err.message : t('error_comment_add'));
    } finally {
      setIsCommenting(false);
    }
  };

  const handleClose = async () => {
    if (!ticket) {
      return;
    }
    setActionError(null);
    setIsClosing(true);
    try {
      await closeHelpDeskTicket(ticket.id);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_action'));
    } finally {
      setIsClosing(false);
    }
  };

  if (isLoading && !ticket && !error) {
    return (
      <>
        <OfflineBanner />
        <PageSkeleton variant="detail" rows={4} />
      </>
    );
  }

  if (!isLoading && (error || !ticket)) {
    return (
      <>
        <OfflineBanner />
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error ?? t('error_not_found')}
          </div>
          <Button type="button" severity="secondary" size="small" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      </>
    );
  }

  if (!ticket) {
    return null;
  }

  const visibleComments = (ticket.comments ?? []).filter(comment => !comment.isInternal);

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-16 lg:pb-0">
      <OfflineBanner />

      <button
        type="button"
        onClick={() => router.push('/employee/help')}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('back_to_tickets')}
      </button>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">{ticket.subject}</h1>
              <Tag value={t(`status_${ticket.status}`)} severity={STATUS_SEVERITY[ticket.status]} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {t('queue_and_priority', {
                queue: t(`queue_${ticket.queue}`),
                priority: t(`priority_${ticket.priority}`),
              })}
            </p>
            {ticket.slaBreached && (
              <p className="mt-0.5 text-xs font-medium text-red-600">{t('sla_breached')}</p>
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-gray-100 pt-4">
          <StatusTracker steps={ticketTrackerSteps(ticket, t)} />
        </div>

        <div className="mt-5 border-t border-gray-100 pt-4">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">{t('field_description')}</h2>
          <p className="text-sm text-gray-600">{ticket.description}</p>
        </div>

        {actionError && <Message severity="error" className="mt-4 w-full" text={actionError} />}

        {ticket.status === 'resolved' && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <Button type="button" className="gap-2" onClick={() => void handleClose()} loading={isClosing}>
              {t('confirm_close')}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">{t('comments_title')}</h2>

        {visibleComments.length === 0 && (
          <p className="mt-3 text-sm text-gray-500">{t('comments_empty')}</p>
        )}

        {visibleComments.length > 0 && (
          <ul className="mt-3 space-y-2">
            {visibleComments.map(comment => (
              <li key={comment.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                <p className="text-gray-700">{comment.body}</p>
                <p className="mt-1 text-xs text-gray-400">{comment.createdAt}</p>
              </li>
            ))}
          </ul>
        )}

        {ticket.status !== 'closed' && (
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            {commentError && <Message severity="error" text={commentError} className="w-full" />}
            <InputTextarea
              value={commentBody}
              onChange={e => setCommentBody(e.target.value)}
              rows={2}
              className="w-full"
              placeholder={t('field_comment_placeholder')}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                className="gap-2"
                onClick={() => void handleAddComment()}
                loading={isCommenting}
              >
                <Send className="size-3.5" aria-hidden />
                {t('add_comment')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
