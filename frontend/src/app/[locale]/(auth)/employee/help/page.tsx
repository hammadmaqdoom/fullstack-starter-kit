'use client';

import type { HelpDeskPriority, HelpDeskQueue, HelpDeskStatus, HelpDeskTicket } from '@/libs/api/help-desk';
import { AlertCircle, HelpCircle, Plus, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { createHelpDeskTicket, listHelpDeskTickets } from '@/libs/api/help-desk';
import { useRouter } from '@/libs/I18nNavigation';

const QUEUES: HelpDeskQueue[] = ['hr', 'it', 'admin', 'finance'];
const PRIORITIES: HelpDeskPriority[] = ['p1', 'p2', 'p3', 'p4'];

const STATUS_SEVERITY: Record<HelpDeskStatus, 'secondary' | 'info' | 'warning' | 'success' | 'danger'> = {
  open: 'info',
  in_progress: 'warning',
  waiting_on_employee: 'warning',
  resolved: 'success',
  closed: 'secondary',
};

export default function EmployeeHelpPage() {
  const t = useTranslations('EmployeeHelp');
  const router = useRouter();

  const [tickets, setTickets] = useState<HelpDeskTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [queue, setQueue] = useState<HelpDeskQueue>('it');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<HelpDeskPriority>('p3');

  const queueOptions = useMemo(
    () => QUEUES.map(value => ({ label: t(`queue_${value}`), value })),
    [t],
  );
  const priorityOptions = useMemo(
    () => PRIORITIES.map(value => ({ label: t(`priority_${value}`), value })),
    [t],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listHelpDeskTickets({ limit: 50 });
      setTickets(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDialog = () => {
    setFormError(null);
    setQueue('it');
    setSubject('');
    setDescription('');
    setPriority('p3');
    setDialogOpen(true);
  };

  const validate = (): string | null => {
    if (!subject.trim()) {
      return t('error_subject_required');
    }
    if (!description.trim()) {
      return t('error_description_required');
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      const created = await createHelpDeskTicket({
        queue,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      });
      setDialogOpen(false);
      await load();
      router.push(`/employee/help/${created.data.id}`);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t('error_create'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && tickets.length === 0 && !error) {
    return (
      <>
        <OfflineBanner />
        <PageSkeleton variant="table" rows={4} />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-16 lg:pb-0">
      <OfflineBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2 self-start">
          <Button
            type="button"
            severity="secondary"
            outlined
            className="gap-2"
            onClick={() => void load()}
            disabled={isLoading}
          >
            <RefreshCw className="size-4" aria-hidden />
            {t('refresh')}
          </Button>
          <Button type="button" className="gap-2" onClick={openDialog}>
            <Plus className="size-4" aria-hidden />
            {t('raise_ticket')}
          </Button>
        </div>
      </div>

      {!isLoading && error && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </div>
          <Button type="button" severity="secondary" size="small" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!error && !isLoading && tickets.length === 0 && (
        <EmptyState
          icon={HelpCircle}
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={t('raise_ticket')}
          onAction={openDialog}
        />
      )}

      {!error && tickets.length > 0 && (
        <DataTable
          value={tickets}
          dataKey="id"
          className="text-sm"
          stripedRows
          loading={isLoading}
          onRowClick={e => router.push(`/employee/help/${(e.data as HelpDeskTicket).id}`)}
          rowClassName={() => 'cursor-pointer'}
        >
          <Column field="subject" header={t('col_subject')} />
          <Column header={t('col_queue')} body={(row: HelpDeskTicket) => t(`queue_${row.queue}`)} />
          <Column header={t('col_priority')} body={(row: HelpDeskTicket) => t(`priority_${row.priority}`)} />
          <Column
            header={t('col_status')}
            body={(row: HelpDeskTicket) => (
              <Tag value={t(`status_${row.status}`)} severity={STATUS_SEVERITY[row.status]} />
            )}
            style={{ width: '10rem' }}
          />
        </DataTable>
      )}

      <Dialog
        header={t('dialog_title')}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        className="w-full max-w-lg"
        modal
        dismissableMask
      >
        <div className="space-y-4 pt-1">
          {formError && <Message severity="error" text={formError} className="w-full" />}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ticket-queue" className="text-sm font-medium text-gray-700">
                {t('field_queue')}
              </label>
              <Dropdown
                inputId="ticket-queue"
                value={queue}
                options={queueOptions}
                onChange={e => setQueue(e.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ticket-priority" className="text-sm font-medium text-gray-700">
                {t('field_priority')}
              </label>
              <Dropdown
                inputId="ticket-priority"
                value={priority}
                options={priorityOptions}
                onChange={e => setPriority(e.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ticket-subject" className="text-sm font-medium text-gray-700">
              {t('field_subject')}
            </label>
            <InputText
              id="ticket-subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full"
              placeholder={t('field_subject_placeholder')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ticket-description" className="text-sm font-medium text-gray-700">
              {t('field_description')}
            </label>
            <InputTextarea
              id="ticket-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full"
              placeholder={t('field_description_placeholder')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              severity="secondary"
              label={t('cancel')}
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            />
            <Button
              type="button"
              label={isSubmitting ? t('submitting') : t('submit')}
              onClick={() => void handleSubmit()}
              loading={isSubmitting}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
