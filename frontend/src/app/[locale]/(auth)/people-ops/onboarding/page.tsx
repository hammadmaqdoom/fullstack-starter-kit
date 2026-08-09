'use client';

import type { TrackerStep } from '@/components/shared/StatusTracker';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusChip } from '@/components/shared/StatusChip';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import type {
  OnboardingAssigneeRole,
  OnboardingCase,
  OnboardingCaseStatus,
  OnboardingKanban,
  OnboardingTask,
  OnboardingTemplate,
} from '@/libs/api/onboarding';
import {
  ONBOARDING_KANBAN_COLUMNS,
  completeOnboardingTask,
  createOnboardingCase,
  createOnboardingTemplate,
  getOnboardingCase,
  getOnboardingKanban,
  listOnboardingTemplates,
  publishOnboardingTemplate,
  workerDisplayName,
} from '@/libs/api/onboarding';
import type { Worker } from '@/libs/api/workers';
import { listWorkers } from '@/libs/api/workers';
import {
  Check,
  ClipboardList,
  FilePlus2,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { useCallback, useEffect, useMemo, useState } from 'react';

function taskTitle(task: OnboardingTask): string {
  return task.templateTask?.title ?? 'Task';
}

type DraftTemplateTask = {
  title: string;
  assigneeRole: OnboardingAssigneeRole;
  dueOffsetDays: number;
};

const DEFAULT_DRAFT_TASKS: DraftTemplateTask[] = [
  { title: 'Complete profile verification', assigneeRole: 'people_ops', dueOffsetDays: 0 },
];

const ASSIGNEE_ROLES: OnboardingAssigneeRole[] = [
  'employee',
  'manager',
  'people_ops',
  'it',
  'finance',
];

function toIsoDate(value: Date | null): string {
  if (!value) {
    return '';
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function caseTrackerSteps(
  onboardingCase: OnboardingCase,
  labels: Record<OnboardingCaseStatus, string>,
): TrackerStep[] {
  const order: OnboardingCaseStatus[] = [
    'not_started',
    'in_progress',
    'blocked',
    'complete',
  ];
  const current = onboardingCase.status as OnboardingCaseStatus;
  const currentIdx = order.indexOf(current);

  return order
    .filter(status => status !== 'blocked' || current === 'blocked')
    .map((status) => {
      const idx = order.indexOf(status);
      let state: TrackerStep['state'] = 'todo';
      if (current === 'complete') {
        if (status === 'blocked') {
          state = 'todo';
        } else {
          state = 'done';
        }
      } else if (status === current) {
        state = 'current';
      } else if (idx < currentIdx && status !== 'blocked') {
        state = 'done';
      }
      return { label: labels[status], state };
    });
}

function CaseCard({
  item,
  onOpen,
}: {
  item: OnboardingCase;
  onOpen: (id: string) => void;
}) {
  const t = useTranslations('Onboarding');
  const pending = (item.tasks ?? []).filter(
    task => task.status === 'pending' || task.status === 'blocked',
  ).length;
  const total = item.tasks?.length ?? 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">
          {workerDisplayName(item.worker, item.workerId)}
        </p>
        <StatusChip
          status={item.status === 'complete' ? 'approved' : item.status === 'blocked' ? 'missing' : 'pending'}
          label={t(`status_${item.status}` as 'status_not_started')}
        />
      </div>
      <p className="mt-1 truncate text-xs text-gray-500">
        {item.template?.name ?? t('template_unknown')}
      </p>
      <p className="mt-2 text-xs text-gray-500">
        {t('start_date', { date: item.startDate })}
        {total > 0 ? ` · ${t('tasks_remaining', { count: pending, total })}` : null}
      </p>
    </button>
  );
}

export default function PeopleOpsOnboardingPage() {
  const t = useTranslations('Onboarding');
  const [board, setBoard] = useState<OnboardingKanban | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OnboardingCase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const [caseWorkerId, setCaseWorkerId] = useState<string | null>(null);
  const [caseTemplateId, setCaseTemplateId] = useState<string | null>(null);
  const [caseStartDate, setCaseStartDate] = useState<Date | null>(new Date());
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateTasks, setNewTemplateTasks] = useState<DraftTemplateTask[]>(DEFAULT_DRAFT_TASKS);

  const statusLabels = useMemo(
    () => ({
      not_started: t('status_not_started'),
      in_progress: t('status_in_progress'),
      blocked: t('status_blocked'),
      complete: t('status_complete'),
    }),
    [t],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getOnboardingKanban();
      setBoard(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadFormData = useCallback(async () => {
    setFormLoading(true);
    setFormError(null);
    try {
      const [workersRes, templatesRes] = await Promise.all([
        listWorkers({ status: 'active', limit: 100 }),
        listOnboardingTemplates(),
      ]);
      setWorkers(workersRes.data ?? []);
      setTemplates(templatesRes.data ?? []);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t('error_form_load'));
    } finally {
      setFormLoading(false);
    }
  }, [t]);

  const openCaseDialog = () => {
    setCaseDialogOpen(true);
    setFormError(null);
    setFormSuccess(null);
    setCaseWorkerId(null);
    setCaseTemplateId(null);
    setCaseStartDate(new Date());
    void loadFormData();
  };

  const openTemplateDialog = () => {
    setTemplateDialogOpen(true);
    setFormError(null);
    setFormSuccess(null);
    setNewTemplateName('');
    setNewTemplateTasks(DEFAULT_DRAFT_TASKS.map(task => ({ ...task })));
    void loadFormData();
  };

  const openCase = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    setSuccessMessage(null);
    try {
      const { data } = await getOnboardingCase(id);
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof ApiRequestError ? err.message : t('error_detail'));
    } finally {
      setDetailLoading(false);
    }
  }, [t]);

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    setSuccessMessage(null);
  };

  const handleCompleteTask = async (taskId: string) => {
    setCompletingId(taskId);
    setDetailError(null);
    try {
      const { data } = await completeOnboardingTask(taskId);
      setDetail(data);
      setSuccessMessage(t('task_complete_success'));
      const { data: refreshed } = await getOnboardingKanban();
      setBoard(refreshed);
    } catch (err) {
      setDetailError(err instanceof ApiRequestError ? err.message : t('error_complete'));
    } finally {
      setCompletingId(null);
    }
  };

  const handleCreateCase = async () => {
    if (!caseWorkerId || !caseTemplateId || !caseStartDate) {
      setFormError(t('error_case_required'));
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createOnboardingCase({
        workerId: caseWorkerId,
        templateId: caseTemplateId,
        startDate: toIsoDate(caseStartDate),
      });
      setFormSuccess(t('case_create_success'));
      setCaseDialogOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t('error_case_create'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTemplate = async () => {
    const name = newTemplateName.trim();
    if (!name) {
      setFormError(t('error_template_name'));
      return;
    }
    const tasks = newTemplateTasks
      .map(task => ({
        title: task.title.trim(),
        assigneeRole: task.assigneeRole,
        dueOffsetDays: Number.isFinite(task.dueOffsetDays) ? task.dueOffsetDays : 0,
      }))
      .filter(task => task.title.length > 0);

    if (tasks.length === 0) {
      setFormError(t('error_template_tasks'));
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const { data } = await createOnboardingTemplate({
        name,
        tasks: tasks.map((task, index) => ({
          title: task.title,
          assigneeRole: task.assigneeRole,
          sortOrder: index,
          isRequired: true,
          dueOffsetDays: task.dueOffsetDays,
        })),
      });
      setTemplates(prev => [data, ...prev]);
      setFormSuccess(t('template_create_success'));
      setNewTemplateName('');
      setNewTemplateTasks(DEFAULT_DRAFT_TASKS.map(task => ({ ...task })));
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t('error_template_create'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishTemplate = async (id: string) => {
    setPublishingId(id);
    setFormError(null);
    try {
      const { data } = await publishOnboardingTemplate(id);
      setTemplates(prev => prev.map(item => (item.id === id ? data : item)));
      setFormSuccess(t('template_publish_success'));
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t('error_template_publish'));
    } finally {
      setPublishingId(null);
    }
  };

  const publishedTemplates = templates.filter(item => item.status === 'published');
  const draftTemplates = templates.filter(item => item.status === 'draft');

  const workerOptions = workers.map(worker => ({
    label: `${worker.firstName} ${worker.lastName}`.trim() || worker.email,
    value: worker.id,
  }));

  const templateOptions = publishedTemplates.map(template => ({
    label: template.name,
    value: template.id,
  }));

  const totalCases = board
    ? ONBOARDING_KANBAN_COLUMNS.reduce((sum, status) => sum + (board[status]?.length ?? 0), 0)
    : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <OfflineBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
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
          <Button
            type="button"
            severity="secondary"
            outlined
            className="gap-2"
            onClick={openTemplateDialog}
          >
            <FilePlus2 className="size-4" aria-hidden />
            {t('manage_templates')}
          </Button>
          <Button type="button" className="gap-2" onClick={openCaseDialog}>
            <Plus className="size-4" aria-hidden />
            {t('create_case')}
          </Button>
        </div>
      </div>

      {formSuccess && !caseDialogOpen && !templateDialogOpen && (
        <Message severity="success" text={formSuccess} className="w-full" />
      )}

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ONBOARDING_KANBAN_COLUMNS.map(status => (
            <div key={status} className="space-y-3 rounded-xl border border-gray-200 p-3">
              <Skeleton width="40%" height="1rem" />
              <Skeleton height="4.5rem" />
              <Skeleton height="4.5rem" />
            </div>
          ))}
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

      {!loading && !error && totalCases === 0 && (
        <EmptyState
          icon={UserPlus}
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={t('create_case')}
          onAction={openCaseDialog}
        />
      )}

      {!loading && !error && board && totalCases > 0 && (
        <>
          <div className="hidden gap-4 xl:grid xl:grid-cols-4">
            {ONBOARDING_KANBAN_COLUMNS.map((status) => {
              const items = board[status] ?? [];
              return (
                <section
                  key={status}
                  className="flex min-h-[16rem] flex-col rounded-xl border border-gray-200 bg-gray-50/60"
                >
                  <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2.5">
                    <h2 className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      {statusLabels[status]}
                    </h2>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 tabular-nums shadow-sm">
                      {items.length}
                    </span>
                  </header>
                  <div className="flex flex-1 flex-col gap-2 p-2">
                    {items.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-gray-400">
                        {t('column_empty')}
                      </p>
                    ) : (
                      items.map(item => (
                        <CaseCard key={item.id} item={item} onOpen={id => void openCase(id)} />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="xl:hidden">
            <Accordion multiple>
              {ONBOARDING_KANBAN_COLUMNS.map((status) => {
                const items = board[status] ?? [];
                return (
                  <AccordionTab
                    key={status}
                    header={`${statusLabels[status]} (${items.length})`}
                  >
                    <div className="flex flex-col gap-2">
                      {items.length === 0 ? (
                        <p className="py-4 text-center text-xs text-gray-400">
                          {t('column_empty')}
                        </p>
                      ) : (
                        items.map(item => (
                          <CaseCard key={item.id} item={item} onOpen={id => void openCase(id)} />
                        ))
                      )}
                    </div>
                  </AccordionTab>
                );
              })}
            </Accordion>
          </div>
        </>
      )}

      <Dialog
        header={detail
          ? workerDisplayName(detail.worker, detail.workerId)
          : t('detail_title')}
        visible={selectedId !== null}
        onHide={closeDetail}
        modal
        className="w-full max-w-lg"
        dismissableMask
      >
        {detailLoading && (
          <div className="space-y-3 py-2">
            <Skeleton height="1.5rem" />
            <Skeleton height="4rem" />
            <Skeleton height="8rem" />
          </div>
        )}

        {!detailLoading && detailError && !detail && (
          <div className="py-4 text-center">
            <p className="text-sm text-red-700">{detailError}</p>
            {selectedId && (
              <Button
                type="button"
                className="mt-3 gap-2"
                onClick={() => void openCase(selectedId)}
              >
                <RefreshCw className="size-4" aria-hidden />
                {t('retry')}
              </Button>
            )}
          </div>
        )}

        {!detailLoading && detail && (
          <div className="space-y-4">
            {successMessage && (
              <Message severity="success" text={successMessage} className="w-full" />
            )}
            {detailError && (
              <Message severity="error" text={detailError} className="w-full" />
            )}

            <StatusTracker steps={caseTrackerSteps(detail, statusLabels)} />

            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <p>{t('template_label', { name: detail.template?.name ?? t('template_unknown') })}</p>
              <p className="mt-0.5">{t('start_date', { date: detail.startDate })}</p>
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ClipboardList className="size-4" aria-hidden />
                {t('checklist_title')}
              </h3>
              {(detail.tasks ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">{t('checklist_empty')}</p>
              ) : (
                <ul className="space-y-2">
                  {(detail.tasks ?? []).map((task) => {
                    const done = task.status === 'done' || task.status === 'skipped';
                    return (
                      <li
                        key={task.id}
                        className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {taskTitle(task)}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {task.templateTask?.assigneeRole
                              ? t(`assignee_${task.templateTask.assigneeRole}` as 'assignee_people_ops')
                              : t('assignee_unknown')}
                            {' · '}
                            {t(`task_status_${task.status}` as 'task_status_pending')}
                          </p>
                        </div>
                        {!done && (
                          <Button
                            type="button"
                            size="small"
                            className="gap-1 shrink-0"
                            disabled={completingId === task.id}
                            onClick={() => void handleCompleteTask(task.id)}
                          >
                            <Check className="size-3.5" aria-hidden />
                            {completingId === task.id ? t('completing') : t('complete_task')}
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        header={t('create_case_title')}
        visible={caseDialogOpen}
        onHide={() => setCaseDialogOpen(false)}
        modal
        className="w-full max-w-md"
        dismissableMask
      >
        {formLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton height="2.5rem" />
            <Skeleton height="2.5rem" />
            <Skeleton height="2.5rem" />
          </div>
        ) : (
          <div className="space-y-4">
            {formError && <Message severity="error" text={formError} className="w-full" />}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="case-worker" className="text-sm font-medium text-gray-700">
                {t('field_worker')}
              </label>
              <Dropdown
                inputId="case-worker"
                value={caseWorkerId}
                options={workerOptions}
                onChange={e => setCaseWorkerId(e.value)}
                placeholder={t('field_worker_placeholder')}
                className="w-full"
                filter
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="case-template" className="text-sm font-medium text-gray-700">
                {t('field_template')}
              </label>
              <Dropdown
                inputId="case-template"
                value={caseTemplateId}
                options={templateOptions}
                onChange={e => setCaseTemplateId(e.value)}
                placeholder={
                  publishedTemplates.length === 0
                    ? t('field_template_empty')
                    : t('field_template_placeholder')
                }
                className="w-full"
                disabled={publishedTemplates.length === 0}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="case-start" className="text-sm font-medium text-gray-700">
                {t('field_start_date')}
              </label>
              <Calendar
                inputId="case-start"
                value={caseStartDate}
                onChange={e => setCaseStartDate(e.value as Date | null)}
                dateFormat="yy-mm-dd"
                showIcon
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                severity="secondary"
                outlined
                onClick={() => setCaseDialogOpen(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                className="gap-2"
                disabled={submitting || publishedTemplates.length === 0}
                onClick={() => void handleCreateCase()}
              >
                <Plus className="size-4" aria-hidden />
                {submitting ? t('saving') : t('create_case')}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        header={t('templates_title')}
        visible={templateDialogOpen}
        onHide={() => setTemplateDialogOpen(false)}
        modal
        className="w-full max-w-2xl"
        dismissableMask
      >
        {formLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton height="2.5rem" />
            <Skeleton height="6rem" />
          </div>
        ) : (
          <div className="space-y-5">
            {formError && <Message severity="error" text={formError} className="w-full" />}
            {formSuccess && <Message severity="success" text={formSuccess} className="w-full" />}

            <div className="space-y-3 rounded-lg border border-gray-200 p-3">
              <p className="text-sm font-semibold text-gray-900">{t('create_template_title')}</p>
              <InputText
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                placeholder={t('field_template_name')}
                className="w-full"
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-gray-600">{t('field_tasks')}</p>
                  <Button
                    type="button"
                    size="small"
                    text
                    className="gap-1"
                    onClick={() =>
                      setNewTemplateTasks(prev => [
                        ...prev,
                        { title: '', assigneeRole: 'people_ops', dueOffsetDays: 0 },
                      ])}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    {t('add_task')}
                  </Button>
                </div>
                {newTemplateTasks.map((task, index) => (
                  <div
                    key={`draft-task-${index}`}
                    className="space-y-2 rounded-md border border-gray-100 bg-gray-50 p-2"
                  >
                    <div className="flex gap-2">
                      <InputText
                        value={task.title}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewTemplateTasks(prev =>
                            prev.map((row, i) => (i === index ? { ...row, title: value } : row)));
                        }}
                        placeholder={t('field_task_title')}
                        className="w-full"
                      />
                      <Button
                        type="button"
                        size="small"
                        severity="danger"
                        text
                        aria-label={t('remove_task')}
                        disabled={newTemplateTasks.length <= 1}
                        onClick={() =>
                          setNewTemplateTasks(prev => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Dropdown
                        value={task.assigneeRole}
                        options={ASSIGNEE_ROLES.map(role => ({
                          label: t(`assignee_${role}` as 'assignee_people_ops'),
                          value: role,
                        }))}
                        onChange={(e) => {
                          setNewTemplateTasks(prev =>
                            prev.map((row, i) =>
                              (i === index ? { ...row, assigneeRole: e.value as OnboardingAssigneeRole } : row)));
                        }}
                        className="w-full"
                      />
                      <InputText
                        type="number"
                        value={String(task.dueOffsetDays)}
                        onChange={(e) => {
                          const value = Number.parseInt(e.target.value, 10);
                          setNewTemplateTasks(prev =>
                            prev.map((row, i) =>
                              (i === index
                                ? { ...row, dueOffsetDays: Number.isFinite(value) ? value : 0 }
                                : row)));
                        }}
                        placeholder={t('field_due_offset')}
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                className="gap-2"
                disabled={submitting}
                onClick={() => void handleCreateTemplate()}
              >
                <FilePlus2 className="size-4" aria-hidden />
                {submitting ? t('saving') : t('create_template')}
              </Button>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-gray-900">{t('draft_templates')}</p>
              {draftTemplates.length === 0 ? (
                <p className="text-sm text-gray-500">{t('drafts_empty')}</p>
              ) : (
                <ul className="space-y-2">
                  {draftTemplates.map(template => (
                    <li
                      key={template.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{template.name}</p>
                        <p className="text-xs text-gray-500">
                          {t('status_draft')}
                          {' · '}
                          {t('task_count', { count: template.tasks?.length ?? 0 })}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="small"
                        disabled={publishingId === template.id}
                        onClick={() => void handlePublishTemplate(template.id)}
                      >
                        {publishingId === template.id ? t('publishing') : t('publish_template')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-gray-900">{t('published_templates')}</p>
              {publishedTemplates.length === 0 ? (
                <p className="text-sm text-gray-500">{t('published_empty')}</p>
              ) : (
                <ul className="space-y-1">
                  {publishedTemplates.map(template => (
                    <li key={template.id} className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      {template.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
