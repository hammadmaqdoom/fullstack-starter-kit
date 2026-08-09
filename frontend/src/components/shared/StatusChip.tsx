'use client';

import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  Check,
  Clock,
  LogIn,
  LogOut,
  Plane,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

export type PolarisStatus
  = | 'in'
    | 'out'
    | 'on_leave'
    | 'missing'
    | 'incomplete'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'cancelled'
    | 'submitted';

type StatusVisual = {
  colorVar: string;
  Icon: LucideIcon;
  labelKey: string;
};

const STATUS_MAP: Record<PolarisStatus, StatusVisual> = {
  in: { colorVar: '--status-in', Icon: LogIn, labelKey: 'in' },
  approved: { colorVar: '--status-in', Icon: Check, labelKey: 'approved' },
  pending: { colorVar: '--status-pending', Icon: Clock, labelKey: 'pending' },
  submitted: { colorVar: '--status-pending', Icon: Clock, labelKey: 'submitted' },
  on_leave: { colorVar: '--status-on-leave', Icon: Plane, labelKey: 'on_leave' },
  missing: { colorVar: '--status-missing', Icon: AlertCircle, labelKey: 'missing' },
  incomplete: { colorVar: '--status-missing', Icon: AlertCircle, labelKey: 'missing' },
  rejected: { colorVar: '--status-missing', Icon: X, labelKey: 'rejected' },
  cancelled: { colorVar: '--status-out', Icon: X, labelKey: 'cancelled' },
  out: { colorVar: '--status-out', Icon: LogOut, labelKey: 'out' },
};

function normalizeStatus(status: string): PolarisStatus {
  const key = status.toLowerCase().replace(/-/g, '_') as PolarisStatus;
  return key in STATUS_MAP ? key : 'pending';
}

type StatusChipProps = {
  status: string;
  label?: string;
  className?: string;
};

export function StatusChip({ status, label, className = '' }: StatusChipProps) {
  const t = useTranslations('StatusChip');
  const normalized = normalizeStatus(status);
  const visual = STATUS_MAP[normalized];
  const Icon = visual.Icon;
  const displayLabel = label ?? t(visual.labelKey as 'in' | 'out' | 'on_leave' | 'missing' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'submitted');

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
      style={{
        color: `var(${visual.colorVar})`,
        backgroundColor: `color-mix(in srgb, var(${visual.colorVar}) 14%, transparent)`,
      }}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span>{displayLabel}</span>
    </span>
  );
}
