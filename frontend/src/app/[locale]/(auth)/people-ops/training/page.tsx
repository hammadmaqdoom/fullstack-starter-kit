'use client';

import type { TrainingAssignment, TrainingCourse, TrainingCourseType } from '@/libs/api/training';
import type { Worker } from '@/libs/api/workers';
import {
  AlertCircle,
  GraduationCap,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ApiRequestError } from '@/libs/api/client';
import {
  assignTraining,
  createCourse,
  listAssignments,
  listCourses,
} from '@/libs/api/training';
import { listWorkers } from '@/libs/api/workers';

const ASSIGNMENT_STATUS_SEVERITY: Record<string, 'secondary' | 'info' | 'success' | 'danger'> = {
  assigned: 'secondary',
  in_progress: 'info',
  completed: 'success',
  overdue: 'danger',
};

export default function TrainingAdminPage() {
  const t = useTranslations('TrainingAdmin');
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseType, setCourseType] = useState<TrainingCourseType>('optional');

  const [assignDialogFor, setAssignDialogFor] = useState<TrainingCourse | null>(null);
  const [assignWorkerIds, setAssignWorkerIds] = useState<string[]>([]);
  const [assignDueDate, setAssignDueDate] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [coursesRes, assignmentsRes, workersRes] = await Promise.all([
        listCourses(),
        listAssignments(),
        listWorkers({ status: 'active', limit: 200 }),
      ]);
      setCourses(coursesRes.data);
      setAssignments(assignmentsRes.data);
      setWorkers(workersRes.data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreateCourse = async () => {
    if (!courseTitle.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      await createCourse({
        title: courseTitle.trim(),
        description: courseDescription.trim() || undefined,
        courseType,
      });
      setCourseDialogOpen(false);
      setCourseTitle('');
      setCourseDescription('');
      setCourseType('optional');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!assignDialogFor || assignWorkerIds.length === 0) {
      return;
    }
    setSubmitting(true);
    try {
      await assignTraining({
        courseId: assignDialogFor.id,
        workerIds: assignWorkerIds,
        dueDate: assignDueDate || undefined,
      });
      setAssignDialogFor(null);
      setAssignWorkerIds([]);
      setAssignDueDate('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const workerName = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    return worker ? `${worker.firstName} ${worker.lastName}` : workerId;
  };

  if (isLoading) {
    return <PageSkeleton variant="table" rows={4} />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Button type="button" className="gap-2" onClick={() => setCourseDialogOpen(true)}>
          <Plus className="size-4" aria-hidden />
          {t('add_course')}
        </Button>
      </div>

      {error && (
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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">{t('courses_heading')}</h2>
        {!error && courses.length === 0 && (
          <EmptyState icon={GraduationCap} title={t('empty_courses_title')} description={t('empty_courses_description')} />
        )}
        {courses.length > 0 && (
          <DataTable value={courses} dataKey="id" size="small">
            <Column field="title" header={t('col_course_title')} />
            <Column
              header={t('col_course_type')}
              body={(row: TrainingCourse) => (
                <Tag value={t(`course_type_${row.courseType}` as 'course_type_mandatory')} severity={row.courseType === 'mandatory' ? 'warning' : 'secondary'} />
              )}
            />
            <Column field="durationMinutes" header={t('col_duration')} body={(row: TrainingCourse) => row.durationMinutes ? `${row.durationMinutes} min` : '—'} />
            <Column
              header={t('col_actions')}
              body={(row: TrainingCourse) => (
                <Button type="button" size="small" outlined onClick={() => setAssignDialogFor(row)}>
                  {t('assign')}
                </Button>
              )}
            />
          </DataTable>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">{t('assignments_heading')}</h2>
        {!error && assignments.length === 0 && (
          <EmptyState icon={GraduationCap} title={t('empty_assignments_title')} description={t('empty_assignments_description')} />
        )}
        {assignments.length > 0 && (
          <DataTable value={assignments} dataKey="id" size="small">
            <Column header={t('col_worker')} body={(row: TrainingAssignment) => workerName(row.workerId)} />
            <Column header={t('col_course_title')} body={(row: TrainingAssignment) => row.course?.title ?? row.courseId} />
            <Column field="dueDate" header={t('col_due_date')} body={(row: TrainingAssignment) => row.dueDate ?? '—'} />
            <Column
              header={t('col_status')}
              body={(row: TrainingAssignment) => (
                <Tag value={t(`assignment_status_${row.status}` as 'assignment_status_assigned')} severity={ASSIGNMENT_STATUS_SEVERITY[row.status]} />
              )}
            />
          </DataTable>
        )}
      </section>

      <Dialog header={t('add_course')} visible={courseDialogOpen} onHide={() => setCourseDialogOpen(false)} modal className="w-full max-w-md">
        <div className="space-y-4">
          <InputText value={courseTitle} onChange={e => setCourseTitle(e.target.value)} placeholder={t('col_course_title')} className="w-full" />
          <InputTextarea value={courseDescription} onChange={e => setCourseDescription(e.target.value)} placeholder={t('description')} rows={3} className="w-full" />
          <Dropdown
            value={courseType}
            onChange={e => setCourseType(e.value)}
            options={[
              { label: t('course_type_mandatory'), value: 'mandatory' },
              { label: t('course_type_optional'), value: 'optional' },
            ]}
            className="w-full"
          />
          <Button type="button" loading={submitting} onClick={() => void handleCreateCourse()}>
            {t('save')}
          </Button>
        </div>
      </Dialog>

      <Dialog header={t('assign')} visible={assignDialogFor !== null} onHide={() => setAssignDialogFor(null)} modal className="w-full max-w-md">
        <div className="space-y-4">
          <MultiSelect
            value={assignWorkerIds}
            onChange={e => setAssignWorkerIds(e.value)}
            options={workers.map(w => ({ label: `${w.firstName} ${w.lastName}`, value: w.id }))}
            filter
            placeholder={t('select_workers')}
            display="chip"
            className="w-full"
          />
          <InputText type="date" value={assignDueDate} onChange={e => setAssignDueDate(e.target.value)} className="w-full" />
          <Button type="button" loading={submitting} onClick={() => void handleAssign()}>
            {t('save')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
