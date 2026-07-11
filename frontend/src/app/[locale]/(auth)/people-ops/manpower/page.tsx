'use client';

import type { EmploymentType } from '@/libs/api/country-config';
import type { ManpowerPlan, ManpowerPosition } from '@/libs/api/manpower';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  RefreshCw,
  Users2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ApiRequestError } from '@/libs/api/client';
import { listEmploymentTypes } from '@/libs/api/country-config';
import {
  createPlan,
  createPosition,
  listPlans,
  listPositions,
} from '@/libs/api/manpower';
import { DIVISIONS } from '@/libs/constants/org';

const PLAN_STATUS_SEVERITY: Record<string, 'secondary' | 'success' | 'info'> = {
  draft: 'secondary',
  active: 'success',
  closed: 'info',
};

const POSITION_STATUS_SEVERITY: Record<string, 'success' | 'secondary' | 'warning'> = {
  open: 'success',
  filled: 'secondary',
  frozen: 'warning',
};

export default function ManpowerPage() {
  const t = useTranslations('ManpowerAdmin');
  const [plans, setPlans] = useState<ManpowerPlan[]>([]);
  const [positionsByPlan, setPositionsByPlan] = useState<Record<string, ManpowerPosition[]>>({});
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planDivisionId, setPlanDivisionId] = useState<string | null>(null);
  const [planYear, setPlanYear] = useState<number>(new Date().getFullYear());
  const [budgetedFte, setBudgetedFte] = useState<number | null>(0);

  const [positionDialogFor, setPositionDialogFor] = useState<string | null>(null);
  const [roleTitle, setRoleTitle] = useState('');
  const [positionEmploymentTypeId, setPositionEmploymentTypeId] = useState<string | null>(null);
  const [positionHeadcount, setPositionHeadcount] = useState<number | null>(1);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [plansRes, etRes] = await Promise.all([listPlans(), listEmploymentTypes()]);
      setPlans(plansRes.data);
      setEmploymentTypes(etRes.data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadPositions = useCallback(async (planId: string) => {
    try {
      const { data } = await listPositions(planId);
      setPositionsByPlan(prev => ({ ...prev, [planId]: data }));
    } catch {
      setPositionsByPlan(prev => ({ ...prev, [planId]: [] }));
    }
  }, []);

  const toggleExpand = (planId: string) => {
    if (expandedPlanId === planId) {
      setExpandedPlanId(null);
      return;
    }
    setExpandedPlanId(planId);
    if (!positionsByPlan[planId]) {
      void loadPositions(planId);
    }
  };

  const handleCreatePlan = async () => {
    if (!planName.trim() || !planYear) {
      return;
    }
    setSubmitting(true);
    try {
      await createPlan({
        name: planName.trim(),
        divisionId: planDivisionId ?? undefined,
        planYear,
        budgetedFte: budgetedFte ?? 0,
      });
      setPlanDialogOpen(false);
      setPlanName('');
      setPlanDivisionId(null);
      setBudgetedFte(0);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePosition = async () => {
    if (!positionDialogFor || !roleTitle.trim() || !positionEmploymentTypeId) {
      return;
    }
    setSubmitting(true);
    try {
      await createPosition(positionDialogFor, {
        roleTitle: roleTitle.trim(),
        employmentTypeId: positionEmploymentTypeId,
        headcount: positionHeadcount ?? 1,
      });
      const planId = positionDialogFor;
      setPositionDialogFor(null);
      setRoleTitle('');
      setPositionEmploymentTypeId(null);
      setPositionHeadcount(1);
      await loadPositions(planId);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const divisionName = (divisionId: string | null) => DIVISIONS.find(d => d.id === divisionId)?.name ?? '—';

  if (isLoading) {
    return <PageSkeleton variant="list" rows={4} />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Button type="button" className="gap-2" onClick={() => setPlanDialogOpen(true)}>
          <Plus className="size-4" aria-hidden />
          {t('add_plan')}
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

      {!error && plans.length === 0 && (
        <EmptyState icon={Users2} title={t('empty_title')} description={t('empty_description')} actionLabel={t('add_plan')} onAction={() => setPlanDialogOpen(true)} />
      )}

      <div className="space-y-3">
        {plans.map(plan => (
          <div key={plan.id} className="rounded-xl border border-gray-200 bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              onClick={() => toggleExpand(plan.id)}
            >
              <div className="flex items-center gap-2">
                {expandedPlanId === plan.id ? <ChevronDown className="size-4 text-gray-400" aria-hidden /> : <ChevronRight className="size-4 text-gray-400" aria-hidden />}
                <div>
                  <p className="font-medium text-gray-900">{plan.name}</p>
                  <p className="text-xs text-gray-500">
                    {divisionName(plan.divisionId)}
                    {' · '}
                    {plan.planYear}
                    {' · '}
                    {t('budgeted_fte_label', { count: plan.budgetedFte })}
                  </p>
                </div>
              </div>
              <Tag value={t(`plan_status_${plan.status}` as 'plan_status_draft')} severity={PLAN_STATUS_SEVERITY[plan.status]} />
            </button>

            {expandedPlanId === plan.id && (
              <div className="border-t border-gray-100 px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{t('positions_heading')}</h3>
                  <Button type="button" size="small" text className="gap-1" onClick={() => setPositionDialogFor(plan.id)}>
                    <Plus className="size-3.5" aria-hidden />
                    {t('add_position')}
                  </Button>
                </div>
                {positionsByPlan[plan.id] === undefined && <p className="text-sm text-gray-400">{t('loading_positions')}</p>}
                {positionsByPlan[plan.id]?.length === 0 && <p className="text-sm text-gray-400">{t('no_positions')}</p>}
                {positionsByPlan[plan.id] && positionsByPlan[plan.id]!.length > 0 && (
                  <ul className="space-y-2">
                    {positionsByPlan[plan.id]!.map(position => (
                      <li key={position.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{position.roleTitle}</p>
                          <p className="text-xs text-gray-500">
                            {position.filledCount}
                            {' / '}
                            {position.headcount}
                            {' '}
                            {t('filled_label')}
                          </p>
                        </div>
                        <Tag value={t(`position_status_${position.status}` as 'position_status_open')} severity={POSITION_STATUS_SEVERITY[position.status]} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog header={t('add_plan')} visible={planDialogOpen} onHide={() => setPlanDialogOpen(false)} modal className="w-full max-w-md">
        <div className="space-y-4">
          <InputText value={planName} onChange={e => setPlanName(e.target.value)} placeholder={t('plan_name')} className="w-full" />
          <Dropdown
            value={planDivisionId}
            onChange={e => setPlanDivisionId(e.value)}
            options={DIVISIONS.map(d => ({ label: d.name, value: d.id }))}
            placeholder={t('select_division')}
            className="w-full"
          />
          <div className="grid grid-cols-2 gap-3">
            <InputNumber value={planYear} onValueChange={e => setPlanYear(e.value ?? new Date().getFullYear())} useGrouping={false} placeholder={t('plan_year')} />
            <InputNumber value={budgetedFte} onValueChange={e => setBudgetedFte(e.value ?? 0)} placeholder={t('budgeted_fte')} min={0} />
          </div>
          <Button type="button" loading={submitting} onClick={() => void handleCreatePlan()}>
            {t('save')}
          </Button>
        </div>
      </Dialog>

      <Dialog header={t('add_position')} visible={positionDialogFor !== null} onHide={() => setPositionDialogFor(null)} modal className="w-full max-w-md">
        <div className="space-y-4">
          <InputText value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder={t('role_title')} className="w-full" />
          <Dropdown
            value={positionEmploymentTypeId}
            onChange={e => setPositionEmploymentTypeId(e.value)}
            options={employmentTypes.map(et => ({ label: et.displayName, value: et.id }))}
            placeholder={t('select_employment_type')}
            className="w-full"
          />
          <InputNumber value={positionHeadcount} onValueChange={e => setPositionHeadcount(e.value ?? 1)} min={1} showButtons />
          <Button type="button" loading={submitting} onClick={() => void handleCreatePosition()}>
            {t('save')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
