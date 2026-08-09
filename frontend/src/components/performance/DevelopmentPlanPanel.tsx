'use client';

import type { DevelopmentPlan, DevelopmentPlanAction } from '@/libs/api/talent';
import {
  createDevelopmentPlan,
  createDevelopmentPlanAction,
  listDevelopmentPlanActions,
  listDevelopmentPlans,
  updateDevelopmentPlanAction,
} from '@/libs/api/talent';
import { ApiRequestError } from '@/libs/api/client';
import { parsePerformanceSearchParams } from '@/libs/performance/performance-query';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardList } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';

type DevelopmentPlanPanelProps = {
  workerId: string | null;
  highlightActionId?: string | null;
};

export function DevelopmentPlanPanel({
  workerId,
  highlightActionId = null,
}: DevelopmentPlanPanelProps) {
  const t = useTranslations('DevelopmentPlan');
  const [plans, setPlans] = useState<DevelopmentPlan[]>([]);
  const [actionsByPlan, setActionsByPlan] = useState<
    Record<string, DevelopmentPlanAction[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newActionTitle, setNewActionTitle] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [creatingPlan, setCreatingPlan] = useState(false);

  const load = useCallback(async () => {
    if (!workerId) {
      setPlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await listDevelopmentPlans(workerId);
      setPlans(data);
      const next: Record<string, DevelopmentPlanAction[]> = {};
      await Promise.all(
        data.map(async (plan) => {
          const { data: actions } = await listDevelopmentPlanActions(plan.id);
          next[plan.id] = actions;
        }),
      );
      setActionsByPlan(next);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setLoading(false);
    }
  }, [t, workerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!highlightActionId) return;
    const el = document.getElementById(`dev-action-${highlightActionId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightActionId, actionsByPlan]);

  const handleComplete = async (actionId: string) => {
    setSubmitting(true);
    try {
      await updateDevelopmentPlanAction(actionId, { status: 'completed' });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAction = async (planId: string) => {
    const title = (newActionTitle[planId] ?? '').trim();
    if (!title) return;
    setSubmitting(true);
    try {
      await createDevelopmentPlanAction(planId, {
        title,
        actionType: 'other',
      });
      setNewActionTitle((prev) => ({ ...prev, [planId]: '' }));
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!workerId || !newPlanTitle.trim()) return;
    setCreatingPlan(true);
    try {
      await createDevelopmentPlan({
        workerId,
        title: newPlanTitle.trim(),
      });
      setNewPlanTitle('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setCreatingPlan(false);
    }
  };

  if (!workerId) {
    return <EmptyState icon={ClipboardList} title={t('no_worker')} />;
  }

  if (loading) {
    return <p className="text-sm text-gray-500">{t('loading')}</p>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="new-plan-title">
            {t('create_plan')}
          </label>
          <InputText
            id="new-plan-title"
            value={newPlanTitle}
            onChange={(e) => setNewPlanTitle(e.target.value)}
            placeholder={t('plan_title_placeholder')}
            className="w-full"
          />
        </div>
        <Button
          type="button"
          size="small"
          loading={creatingPlan}
          disabled={!newPlanTitle.trim()}
          onClick={() => void handleCreatePlan()}
        >
          {t('create_plan')}
        </Button>
      </div>

      {plans.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t('empty')} />
      ) : (
        plans.map((plan) => (
        <Card key={plan.id} className="shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-gray-900">{plan.title}</p>
              {plan.summary && (
                <p className="mt-1 text-sm text-gray-500">{plan.summary}</p>
              )}
            </div>
            <Tag value={plan.status} />
          </div>
          <ul className="mt-3 space-y-2">
            {(actionsByPlan[plan.id] ?? []).map((action) => (
              <li
                key={action.id}
                id={`dev-action-${action.id}`}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                  highlightActionId === action.id
                    ? 'border-violet-300 bg-violet-50'
                    : 'border-gray-100'
                }`}
              >
                <span className="text-gray-800">{action.title}</span>
                <div className="flex items-center gap-2">
                  <Tag value={action.status} />
                  {(action.status === 'pending' || action.status === 'in_progress') && (
                    <Button
                      type="button"
                      size="small"
                      outlined
                      disabled={submitting}
                      onClick={() => void handleComplete(action.id)}
                    >
                      {t('mark_done')}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <InputText
              value={newActionTitle[plan.id] ?? ''}
              onChange={(e) =>
                setNewActionTitle((prev) => ({
                  ...prev,
                  [plan.id]: e.target.value,
                }))
              }
              placeholder={t('action_title_placeholder')}
              className="min-w-[12rem] flex-1"
            />
            <Button
              type="button"
              size="small"
              loading={submitting}
              onClick={() => void handleAddAction(plan.id)}
            >
              {t('add_action')}
            </Button>
          </div>
        </Card>
      ))
      )}
    </div>
  );
}

export function useDevelopmentActionDeepLink(): string | null {
  if (typeof window === 'undefined') return null;
  return parsePerformanceSearchParams(window.location.search).developmentActionId;
}
