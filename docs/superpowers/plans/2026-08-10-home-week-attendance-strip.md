# Home Week Attendance Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a Mon–Sun personal attendance strip under Check-in on Employee Home, and for managers also show the existing team-today strip on Home (Cockpit unchanged).

**Architecture:** Add a pure week-day mapper + presentational `WeekAttendanceStrip` (status colours from `CALENDAR_STATUS_CLASS`, day detail via `CalendarDayDetailTrigger`). Wire Home to load `getMyCalendar(weekRange(now))` in parallel with today punches. When `shell.primaryLayout === 'manager'`, also load `getTodayPunches({ scope: 'team' })` into `TeamAttendanceStrip`. No backend changes.

**Tech Stack:** Next.js 16, React 19, PrimeReact (existing Home patterns), Lucide, next-intl (`en.json` only), Vitest; existing `getMyCalendar`, `getTodayPunches`, `weekRange`.

**Spec:** `docs/superpowers/specs/2026-08-10-home-week-attendance-strip-design.md`

## Global Constraints

- English only — edit `frontend/src/locales/en.json` only; do not edit `ar.json` / `fr.json`
- Lucide icons only; no emoji
- No new backend endpoints
- Reuse `CALENDAR_STATUS_CLASS` and `CalendarDayDetailTrigger`
- Team strip only when `primaryLayout === 'manager'`; do not call team punches API for employees
- People Ops / admin / finance / contractor homes unchanged
- Conventional Commits: `feat(frontend): …`, `test(frontend): …`, `docs(design): …`

---

## File map

### Create

| File | Responsibility |
|---|---|
| `frontend/src/libs/datetime/week-strip-days.ts` | Pure: pad/map API days into exactly 7 Mon–Sun strip cells |
| `frontend/src/libs/datetime/week-strip-days.test.ts` | Vitest for mapper |
| `frontend/src/components/calendar/WeekAttendanceStrip.tsx` | Presentational Mon–Sun strip |
| `frontend/src/components/calendar/WeekAttendanceStrip.test.ts` | Render smoke (7 labels + status class) |
| `frontend/src/libs/home/home-role.ts` | Pure: `shouldShowTeamAttendanceOnHome(primaryLayout)` |
| `frontend/src/libs/home/home-role.test.ts` | Gate tests |

### Modify

| File | Change |
|---|---|
| `frontend/src/app/[locale]/(auth)/employee/home/page.tsx` | Load week calendar; render strip; manager team strip; refresh after punch |
| `frontend/src/locales/en.json` | Extend `EmployeeHome` keys |
| `docs/superpowers/specs/2026-08-10-home-week-attendance-strip-design.md` | Status → Implemented (after last task) |

### Do not modify

| File | Why |
|---|---|
| `frontend/src/app/[locale]/(auth)/manager/cockpit/page.tsx` | Spec: Cockpit unchanged |
| `frontend/src/components/manager/TeamAttendanceStrip.tsx` | Reuse as-is |
| Backend calendar/attendance modules | No API changes |

---

### Task 1: Week strip day mapper

**Files:**
- Create: `frontend/src/libs/datetime/week-strip-days.ts`
- Test: `frontend/src/libs/datetime/week-strip-days.test.ts`

**Interfaces:**
- Consumes: `CalendarCellStatus`, `StaffCalendarResponse` day shape from `@/libs/api/calendars`; `isoDate` from `./calendar-range` if useful
- Produces:
  - `type WeekStripDay = { date: string; status: CalendarCellStatus; leaveTypeName?: string | null; holidayName?: string | null; firstIn?: string | null; lastOut?: string | null; punches: CalendarDayPunch[]; workedMinutes: number }`
  - `buildWeekStripDays(from: string, to: string, days: StaffCalendarResponse['days']): WeekStripDay[]` — returns exactly 7 ISO dates Mon→Sun; missing dates become `status: 'planned'` with empty punches and `workedMinutes: 0`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { buildWeekStripDays } from './week-strip-days';

describe('buildWeekStripDays', () => {
  it('returns exactly 7 Mon–Sun dates and fills gaps as planned', () => {
    const result = buildWeekStripDays('2026-08-03', '2026-08-09', [
      {
        date: '2026-08-05',
        status: 'out',
        punches: [],
        workedMinutes: 480,
        firstIn: '2026-08-05T04:00:00.000Z',
        lastOut: '2026-08-05T12:00:00.000Z',
      },
    ]);
    expect(result).toHaveLength(7);
    expect(result.map(d => d.date)).toEqual([
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09',
    ]);
    expect(result[0]?.status).toBe('planned');
    expect(result[2]?.status).toBe('out');
    expect(result[2]?.workedMinutes).toBe(480);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/libs/datetime/week-strip-days.test.ts`

Expected: FAIL (module not found / export missing)

- [ ] **Step 3: Write minimal implementation**

```ts
import type {
  CalendarCellStatus,
  CalendarDayPunch,
  StaffCalendarResponse,
} from '@/libs/api/calendars';

export type WeekStripDay = {
  date: string;
  status: CalendarCellStatus;
  leaveTypeName?: string | null;
  holidayName?: string | null;
  firstIn?: string | null;
  lastOut?: string | null;
  punches: CalendarDayPunch[];
  workedMinutes: number;
};

function addDaysIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y!, m! - 1, d! + delta);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function buildWeekStripDays(
  from: string,
  to: string,
  days: StaffCalendarResponse['days'],
): WeekStripDay[] {
  const byDate = new Map(days.map(day => [day.date, day]));
  const out: WeekStripDay[] = [];
  let cursor = from;
  for (let i = 0; i < 7; i++) {
    const found = byDate.get(cursor);
    out.push(
      found
        ? {
            date: found.date,
            status: found.status,
            leaveTypeName: found.leaveTypeName,
            holidayName: found.holidayName,
            firstIn: found.firstIn,
            lastOut: found.lastOut,
            punches: found.punches ?? [],
            workedMinutes: found.workedMinutes ?? 0,
          }
        : {
            date: cursor,
            status: 'planned',
            punches: [],
            workedMinutes: 0,
          },
    );
    if (cursor === to) {
      break;
    }
    cursor = addDaysIso(cursor, 1);
  }
  while (out.length < 7) {
    const next = addDaysIso(out[out.length - 1]!.date, 1);
    out.push({ date: next, status: 'planned', punches: [], workedMinutes: 0 });
  }
  return out.slice(0, 7);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/libs/datetime/week-strip-days.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/libs/datetime/week-strip-days.ts frontend/src/libs/datetime/week-strip-days.test.ts
git commit -m "feat(frontend): add week strip day mapper for home"
```

---

### Task 2: Manager Home gate helper

**Files:**
- Create: `frontend/src/libs/home/home-role.ts`
- Test: `frontend/src/libs/home/home-role.test.ts`

**Interfaces:**
- Consumes: `ShellLayout` from `@/libs/api/shell`
- Produces: `shouldShowTeamAttendanceOnHome(primaryLayout: ShellLayout | null | undefined): boolean` — `true` only when `primaryLayout === 'manager'`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { shouldShowTeamAttendanceOnHome } from './home-role';

describe('shouldShowTeamAttendanceOnHome', () => {
  it('is true only for manager layout', () => {
    expect(shouldShowTeamAttendanceOnHome('manager')).toBe(true);
    expect(shouldShowTeamAttendanceOnHome('employee')).toBe(false);
    expect(shouldShowTeamAttendanceOnHome('people_ops')).toBe(false);
    expect(shouldShowTeamAttendanceOnHome(null)).toBe(false);
    expect(shouldShowTeamAttendanceOnHome(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/libs/home/home-role.test.ts`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
import type { ShellLayout } from '@/libs/api/shell';

export function shouldShowTeamAttendanceOnHome(
  primaryLayout: ShellLayout | null | undefined,
): boolean {
  return primaryLayout === 'manager';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/libs/home/home-role.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/libs/home/home-role.ts frontend/src/libs/home/home-role.test.ts
git commit -m "feat(frontend): gate team attendance strip to manager home"
```

---

### Task 3: `WeekAttendanceStrip` component + i18n

**Files:**
- Create: `frontend/src/components/calendar/WeekAttendanceStrip.tsx`
- Test: `frontend/src/components/calendar/WeekAttendanceStrip.test.ts`
- Modify: `frontend/src/locales/en.json` (`EmployeeHome` keys)

**Interfaces:**
- Consumes: `WeekStripDay` from `@/libs/datetime/week-strip-days`; `CALENDAR_STATUS_CLASS`; `CalendarDayDetailTrigger`; `Link` from `@/libs/I18nNavigation`
- Produces: `WeekAttendanceStrip(props)` where props are:

```ts
type WeekAttendanceStripProps = {
  days: WeekStripDay[];
  timezone: string;
  today: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};
```

- [ ] **Step 1: Add English strings**

In `EmployeeHome` add:

```json
"week_title": "This week",
"week_view_calendar": "View calendar",
"week_loading": "Loading this week's attendance",
"week_empty": "Weekly attendance will appear here once calendar data is available.",
"week_error": "Could not load this week's attendance.",
"team_today_title": "Team today",
"team_today_error": "Could not load team attendance."
```

Keep existing `retry` key for retry buttons.

- [ ] **Step 2: Write the failing component test**

```ts
import type { WeekStripDay } from '@/libs/datetime/week-strip-days';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { WeekAttendanceStrip } from './WeekAttendanceStrip';

vi.mock('@/libs/I18nNavigation', () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => createElement('a', { href, className }, children),
}));

const messages = {
  EmployeeHome: {
    week_title: 'This week',
    week_view_calendar: 'View calendar',
    week_loading: 'Loading this week\'s attendance',
    week_empty: 'Weekly attendance will appear here once calendar data is available.',
    week_error: 'Could not load this week\'s attendance.',
    retry: 'Try again',
  },
  EmployeeCalendar: {
    status_out: 'Out',
    status_planned: 'Planned',
    status_in: 'In',
    status_on_leave: 'On leave',
    status_missing: 'Missing',
    status_incomplete: 'Incomplete',
    status_holiday: 'Holiday',
    status_non_working: 'Non-working',
    detail_check_in: 'Check-in',
    detail_check_out: 'Check-out',
    detail_total: 'Total · {duration}',
    detail_in_progress: 'In progress',
    detail_no_punches: 'No punches this day',
    detail_punch_line: '{label} · {time}',
  },
};

const days: WeekStripDay[] = [
  '2026-08-03',
  '2026-08-04',
  '2026-08-05',
  '2026-08-06',
  '2026-08-07',
  '2026-08-08',
  '2026-08-09',
].map((date, i) => ({
  date,
  status: i === 2 ? 'out' : 'planned',
  punches: [],
  workedMinutes: i === 2 ? 480 : 0,
}));

function renderStrip(props: Partial<React.ComponentProps<typeof WeekAttendanceStrip>> = {}) {
  return renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      { locale: 'en', messages, timeZone: 'UTC' },
      createElement(WeekAttendanceStrip, {
        days,
        timezone: 'Asia/Karachi',
        today: '2026-08-05',
        ...props,
      }),
    ),
  );
}

describe('WeekAttendanceStrip', () => {
  it('renders seven weekday cells and view calendar link', () => {
    const html = renderStrip();
    expect(html).toContain('This week');
    expect(html).toContain('View calendar');
    expect(html).toContain('href="/employee/calendar"');
    expect(html).toContain('bg-sky-100'); // status out
    expect((html.match(/role="button"/g) ?? []).length).toBeGreaterThanOrEqual(7);
  });

  it('renders error with retry', () => {
    const html = renderStrip({ days: [], error: 'boom', onRetry: () => undefined });
    expect(html).toContain('boom');
    expect(html).toContain('Try again');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/components/calendar/WeekAttendanceStrip.test.ts`

Expected: FAIL (component missing)

- [ ] **Step 4: Write minimal `WeekAttendanceStrip`**

Implement:

- Header row: title (`week_title`) + `Link` to `/employee/calendar` (`week_view_calendar`)
- Loading: 7 skeletons, `aria-busy`, `aria-label={t('week_loading')}`
- Error: border red box + optional retry button (`t('retry')`); prefer showing `error` prop text, else `t('week_error')`
- Empty (`!loading && !error && days.length === 0`): dashed empty using `week_empty`
- Success: horizontal flex of 7 cells; each cell wrapped in `CalendarDayDetailTrigger` with:
  - `detail` mapped from `WeekStripDay` + `timezone` + `today` + `statusLabel` from `useTranslations('EmployeeCalendar')` → `t(\`status_${status}\`)`
  - `labels` same pattern as `StaffMonthHeatmap`
  - Cell UI: weekday short (`Mon`…) via `Intl.DateTimeFormat(undefined, { weekday: 'short' })` on `${date}T12:00:00`, day number, `CALENDAR_STATUS_CLASS[status]`
  - Today: ring (`ring-2 ring-blue-500`) when `date === today`
- Use Lucide `CalendarDays` only if needed for empty state; otherwise no icon required in header

Keep file focused; do not duplicate month heatmap.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/components/calendar/WeekAttendanceStrip.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/calendar/WeekAttendanceStrip.tsx \
  frontend/src/components/calendar/WeekAttendanceStrip.test.ts \
  frontend/src/locales/en.json
git commit -m "feat(frontend): add WeekAttendanceStrip for home week progress"
```

---

### Task 4: Wire personal week strip on Employee Home

**Files:**
- Modify: `frontend/src/app/[locale]/(auth)/employee/home/page.tsx`

**Interfaces:**
- Consumes: `getMyCalendar`, `weekRange`, `buildWeekStripDays`, `WeekAttendanceStrip`
- Produces: Home page renders week strip under Check-in section for all visitors of this route

- [ ] **Step 1: Extend Home state + load**

Add state:

```ts
const [weekDays, setWeekDays] = useState<WeekStripDay[]>([]);
const [weekTimezone, setWeekTimezone] = useState('UTC');
const [weekToday, setWeekToday] = useState(() => new Date().toISOString().slice(0, 10));
const [weekLoading, setWeekLoading] = useState(true);
const [weekError, setWeekError] = useState<string | null>(null);
```

Replace `load` so check-in and week load independently (or in `Promise.allSettled` / parallel callbacks) so week failure does not clear today:

```ts
const loadWeek = useCallback(async () => {
  setWeekLoading(true);
  setWeekError(null);
  try {
    const range = weekRange(new Date());
    const { data } = await getMyCalendar(range);
    setWeekDays(buildWeekStripDays(data.from, data.to, data.days));
    setWeekTimezone(data.timezone);
    // Prefer today in worker timezone when available
    try {
      setWeekToday(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: data.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date()),
      );
    } catch {
      setWeekToday(new Date().toISOString().slice(0, 10));
    }
  } catch (err) {
    setWeekDays([]);
    setWeekError(err instanceof ApiRequestError ? err.message : t('week_error'));
  } finally {
    setWeekLoading(false);
  }
}, [t]);
```

Keep existing today `load`. Page Refresh button calls both `load()` and `loadWeek()`.

- [ ] **Step 2: Render strip under Check-in**

After the check-in `<section id="check-in">` (still before leave balances), render:

```tsx
<section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" aria-labelledby="week-strip-heading">
  <h2 id="week-strip-heading" className="sr-only">{t('week_title')}</h2>
  <WeekAttendanceStrip
    days={weekDays}
    timezone={weekTimezone}
    today={weekToday}
    loading={weekLoading}
    error={weekError}
    onRetry={() => void loadWeek()}
  />
</section>
```

(Title is also inside the strip; `sr-only` heading is fine for landmark, or omit if strip header is an `h2` — prefer strip internal `h2` and drop wrapper heading to avoid duplicate.)

Prefer: strip owns the visible `h2`; wrapper is a plain `<section aria-label={t('week_title')}>`.

- [ ] **Step 3: Refresh week after successful punch**

In `handlePunch` success path, after updating `today`, call `void loadWeek()`.

- [ ] **Step 4: Manual sanity (optional in agent)**

Run: `cd frontend && pnpm exec vitest run src/libs/datetime/week-strip-days.test.ts src/components/calendar/WeekAttendanceStrip.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/[locale]/(auth)/employee/home/page.tsx
git commit -m "feat(frontend): show personal week attendance strip on home"
```

---

### Task 5: Manager team strip on Home

**Files:**
- Modify: `frontend/src/app/[locale]/(auth)/employee/home/page.tsx`

**Interfaces:**
- Consumes: `usePolarisShell`, `shouldShowTeamAttendanceOnHome`, `getTodayPunches`, `TeamAttendanceStrip`
- Produces: Team strip under week strip only for manager layout; no team API call otherwise

- [ ] **Step 1: Wire shell + team load**

```ts
const { shell } = usePolarisShell();
const showTeam = shouldShowTeamAttendanceOnHome(shell?.primaryLayout);

const [teamPunches, setTeamPunches] = useState<TeamPunchToday[]>([]);
const [teamLoading, setTeamLoading] = useState(false);
const [teamError, setTeamError] = useState<string | null>(null);

const loadTeam = useCallback(async () => {
  if (!shouldShowTeamAttendanceOnHome(shell?.primaryLayout)) {
    setTeamPunches([]);
    setTeamError(null);
    setTeamLoading(false);
    return;
  }
  setTeamLoading(true);
  setTeamError(null);
  try {
    const { data } = await getTodayPunches({ scope: 'team' });
    setTeamPunches(data);
  } catch (err) {
    setTeamPunches([]);
    setTeamError(err instanceof ApiRequestError ? err.message : t('team_today_error'));
  } finally {
    setTeamLoading(false);
  }
}, [shell?.primaryLayout, t]);
```

`useEffect` when `showTeam` becomes true → `void loadTeam()`. Refresh button includes `loadTeam` when `showTeam`.

- [ ] **Step 2: Render team section**

Between week strip and leave balances:

```tsx
{showTeam && (
  <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" aria-labelledby="team-today-heading">
    <h2 id="team-today-heading" className="text-sm font-semibold text-gray-900">
      {t('team_today_title')}
    </h2>
    <div className="mt-3">
      <TeamAttendanceStrip
        punches={teamPunches}
        loading={teamLoading}
        error={teamError}
        onRetry={() => void loadTeam()}
      />
    </div>
  </section>
)}
```

Note: `TeamAttendanceStrip` uses `useTranslations('ManagerCockpit')` for its own empty/loading copy — that is intentional reuse; Home only supplies the section title via `EmployeeHome.team_today_title`.

- [ ] **Step 3: Confirm Cockpit untouched**

Do not edit `manager/cockpit/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/[locale]/(auth)/employee/home/page.tsx
git commit -m "feat(frontend): show team attendance strip on manager home"
```

---

### Task 6: Spec status + full test pass

**Files:**
- Modify: `docs/superpowers/specs/2026-08-10-home-week-attendance-strip-design.md`

- [ ] **Step 1: Run all related tests**

Run:

```bash
cd frontend && pnpm exec vitest run \
  src/libs/datetime/week-strip-days.test.ts \
  src/libs/home/home-role.test.ts \
  src/components/calendar/WeekAttendanceStrip.test.ts
```

Expected: all PASS

- [ ] **Step 2: Update design status**

Set front-matter status line to:

`**Status:** Implemented — plan \`docs/superpowers/plans/2026-08-10-home-week-attendance-strip.md\``

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-08-10-home-week-attendance-strip-design.md
git commit -m "docs(design): mark home week attendance strip implemented"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Personal Mon–Sun strip under Check-in | 1, 3, 4 |
| Manager team strip on Home + Cockpit unchanged | 2, 5 |
| People Ops skip | 2 (gate false) + no People Ops edits |
| `getMyCalendar` + `getTodayPunches` only | 4, 5 |
| Day popover reuse | 3 |
| Skeleton / error / empty / punch refresh | 3, 4 |
| English-only i18n | 3 |
| Unit tests for strip + manager gate | 1, 2, 3 |

## Self-review notes

- No TBD / placeholder steps.
- Types `WeekStripDay` / `shouldShowTeamAttendanceOnHome` consistent across tasks.
- Home page grows but stays one file; extraction deferred unless it exceeds readability during implementation.
