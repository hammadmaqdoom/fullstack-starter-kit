'use client';

import type {
  CalendarCellStatus,
  CalendarDayPunch,
} from '@/libs/api/calendars';
import { formatInTimezone } from '@/libs/datetime/format-in-timezone';
import {
  formatWorkedMinutes,
  isDayInProgress,
} from '@/libs/datetime/format-worked-minutes';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export type CalendarDayDetailLabels = {
  checkIn: string;
  checkOut: string;
  total: (duration: string) => string;
  inProgress: string;
  noPunches: string;
  punchLine: (label: string, time: string) => string;
};

export type CalendarDayDetailContentProps = {
  date: string;
  today: string;
  timezone: string;
  status: CalendarCellStatus;
  statusLabel: string;
  workerName?: string;
  holidayName?: string | null;
  leaveTypeName?: string | null;
  punches: CalendarDayPunch[];
  workedMinutes: number;
  labels: CalendarDayDetailLabels;
};

function formatDateHeading(date: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}

export function CalendarDayDetailContent({
  date,
  today,
  timezone,
  statusLabel,
  workerName,
  holidayName,
  leaveTypeName,
  punches,
  workedMinutes,
  labels,
}: CalendarDayDetailContentProps) {
  const inProgress = isDayInProgress({ date, today, punches });

  return (
    <div className="w-56 space-y-2 p-3 text-left">
      <div>
        {workerName && (
          <p className="truncate text-xs font-medium text-gray-500">{workerName}</p>
        )}
        <p className="text-sm font-semibold text-gray-900">
          {formatDateHeading(date)}
        </p>
        <p className="mt-0.5 text-xs text-gray-600">{statusLabel}</p>
        {holidayName && (
          <p className="mt-0.5 truncate text-xs text-purple-700">{holidayName}</p>
        )}
        {leaveTypeName && (
          <p className="mt-0.5 truncate text-xs text-amber-700">{leaveTypeName}</p>
        )}
      </div>

      {punches.length === 0 ? (
        <p className="text-xs text-gray-500">{labels.noPunches}</p>
      ) : (
        <ul className="space-y-1">
          {punches.map(punch => {
            const label =
              punch.punchType === 'check_in' ? labels.checkIn : labels.checkOut;
            const time = formatInTimezone(punch.punchedAt, timezone, {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <li
                key={punch.id}
                className="flex justify-between gap-2 text-xs text-gray-800"
              >
                <span>{labels.punchLine(label, time)}</span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="border-t border-gray-100 pt-2 text-xs font-semibold text-gray-900">
        {inProgress
          ? labels.inProgress
          : labels.total(formatWorkedMinutes(workedMinutes))}
      </p>
    </div>
  );
}

type CalendarDayDetailTriggerProps = {
  children: ReactNode;
  className?: string;
  detail: Omit<CalendarDayDetailContentProps, 'labels'> & {
    labels: CalendarDayDetailLabels;
  };
};

function prefersCoarsePointer(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.matchMedia('(hover: none)').matches;
  } catch {
    return false;
  }
}

export function CalendarDayDetailTrigger({
  children,
  className,
  detail,
}: CalendarDayDetailTriggerProps) {
  const panelId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const panelWidth = 224; // w-56
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - panelWidth / 2),
      window.innerWidth - panelWidth - 8,
    );
    const top = Math.min(rect.bottom + 6, window.innerHeight - 8);
    setCoords({ top, left });
  }, []);

  const openPanel = useCallback(() => {
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  }, [clearCloseTimer, updatePosition]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }, [clearCloseTimer]);

  const closePanel = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePanel();
      }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      closePanel();
    };
    const onScroll = () => updatePosition();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [closePanel, open, updatePosition]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) {
        closePanel();
      } else {
        openPanel();
      }
    }
  };

  const onClick = () => {
    if (!prefersCoarsePointer()) {
      return;
    }
    if (open) {
      closePanel();
    } else {
      openPanel();
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        className={className}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onMouseEnter={() => {
          if (!prefersCoarsePointer()) {
            openPanel();
          }
        }}
        onMouseLeave={() => {
          if (!prefersCoarsePointer()) {
            scheduleClose();
          }
        }}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={detail.statusLabel}
            className="fixed z-50 rounded-lg border border-gray-200 bg-white shadow-lg"
            style={{ top: coords.top, left: coords.left }}
            onMouseEnter={clearCloseTimer}
            onMouseLeave={() => {
              if (!prefersCoarsePointer()) {
                scheduleClose();
              }
            }}
          >
            <CalendarDayDetailContent {...detail} />
          </div>,
          document.body,
        )}
    </>
  );
}
