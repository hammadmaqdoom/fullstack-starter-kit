'use client';

import { Check } from 'lucide-react';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';

export type TrackerStepState = 'done' | 'current' | 'todo';

export type TrackerStep = {
  label: string;
  actor?: string | null;
  state: TrackerStepState;
  at?: string;
};

type StatusTrackerProps = {
  steps: TrackerStep[];
  eta?: string;
  nextStepText?: string;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
};

export function StatusTracker({
  steps,
  eta,
  nextStepText,
  isLoading = false,
  error = null,
  className = '',
}: StatusTrackerProps) {
  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`} aria-busy="true">
        <Skeleton height="0.5rem" className="w-full" />
        <Skeleton width="60%" height="0.75rem" />
      </div>
    );
  }

  if (error) {
    return (
      <Message severity="error" text={error} className={className} />
    );
  }

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <ol className="flex items-center gap-0" aria-label="Request status">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const done = step.state === 'done';
          const current = step.state === 'current';

          return (
            <li key={`${step.label}-${index}`} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-col items-center gap-1">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                    done
                      ? 'bg-green-600 text-white'
                      : current
                        ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                  aria-current={current ? 'step' : undefined}
                >
                  {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
                </span>
                <span
                  className={`max-w-[4.5rem] truncate text-center text-[10px] leading-tight ${
                    current ? 'font-semibold text-gray-900' : 'text-gray-500'
                  }`}
                  title={step.actor ? `${step.label} · ${step.actor}` : step.label}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`mx-1 mb-4 h-0.5 flex-1 ${
                    done ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
      {(nextStepText || eta) && (
        <p className="text-xs text-gray-500">
          {nextStepText}
          {nextStepText && eta ? ' · ' : ''}
          {eta}
        </p>
      )}
    </div>
  );
}
