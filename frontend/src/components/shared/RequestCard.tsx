'use client';

import type { TrackerStep } from '@/components/shared/StatusTracker';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Tag } from 'primereact/tag';
import { StatusTracker } from '@/components/shared/StatusTracker';

type RequestCardStatus = string;

type RequestCardProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  status: RequestCardStatus;
  nextStepText?: string;
  steps?: TrackerStep[];
  onClick?: () => void;
  className?: string;
};

function statusSeverity(
  status: string,
): 'secondary' | 'info' | 'warning' | 'success' | 'danger' {
  const normalized = status.toLowerCase();
  if (normalized.includes('reject') || normalized.includes('fail')) {
    return 'danger';
  }
  if (normalized.includes('approv') || normalized.includes('paid') || normalized.includes('done')) {
    return 'success';
  }
  if (normalized.includes('pending') || normalized.includes('draft')) {
    return 'warning';
  }
  return 'info';
}

export function RequestCard({
  icon: Icon,
  title,
  subtitle,
  status,
  nextStepText,
  steps,
  onClick,
  className = '',
}: RequestCardProps) {
  const interactive = typeof onClick === 'function';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={`flex w-full flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-300 disabled:cursor-default disabled:hover:border-gray-200 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-50">
          <Icon className="size-5 text-gray-600" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-gray-500">{subtitle}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Tag value={status.replaceAll('_', ' ')} severity={statusSeverity(status)} />
              {interactive && <ChevronRight className="size-4 text-gray-400" aria-hidden />}
            </div>
          </div>
        </div>
      </div>
      {steps && steps.length > 0 && <StatusTracker steps={steps} nextStepText={nextStepText} />}
      {!steps && nextStepText && (
        <p className="text-xs text-gray-500">{nextStepText}</p>
      )}
    </button>
  );
}
