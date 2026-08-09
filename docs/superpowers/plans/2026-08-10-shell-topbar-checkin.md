# Shell Top Bar Check-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Left-align Search and an attendance-aware check-in CTA in the authenticated header, and show weekday, date, and browser geolocation locality by default.

**Architecture:** Extract `ShellTopBar` from `AuthenticatedShell`. Pure helpers derive CTA label/state and location display strings. `useTodayAttendance` loads `GET /api/v1/attendance/punches/today` (refetch on visibility). `useGeolocationLabel` requests GPS once per session and reverse-geocodes via BigDataCloud client API (display only — never POST coords). Header CTA is always a Link to `/employee/home#check-in`; punches stay on Employee Home.

**Tech Stack:** Next.js 16, React 19, Lucide, next-intl (`en.json` only), Vitest; existing `getTodayAttendance` client.

**Spec:** `docs/superpowers/specs/2026-08-10-shell-topbar-checkin-design.md`

## Global Constraints

- English only — edit `frontend/src/locales/en.json` only; do not edit `ar.json` / `fr.json`
- Lucide icons only; no emoji
- No header punch mutations; CTA navigates only
- Do not send geolocation coordinates to Polaris APIs from the header path
- Never log raw coordinates
- Check-in CTA only when `shell.primaryLayout` is `employee` or `manager`
- Hide CTA when today status is `on_leave`
- Conventional Commits: `feat(frontend): …`, `test(frontend): …`

---

## File map

### Create

| File | Responsibility |
|---|---|
| `frontend/src/libs/shell/shell-topbar.util.ts` | Pure: format header date; build location label; resolve CTA view model |
| `frontend/src/libs/shell/shell-topbar.util.test.ts` | Vitest for pure helpers |
| `frontend/src/libs/shell/reverse-geocode.ts` | Fetch BigDataCloud reverse-geocode; map to short label |
| `frontend/src/libs/shell/reverse-geocode.test.ts` | Vitest with mocked `fetch` |
| `frontend/src/libs/hooks/useTodayAttendance.ts` | Load/refetch today’s attendance |
| `frontend/src/libs/hooks/useGeolocationLabel.ts` | Geolocation + reverse geocode + retry |
| `frontend/src/components/shell/ShellTopBar.tsx` | Header layout: context + search + CTA |
| `frontend/src/components/shell/ShellContextStrip.tsx` | Day · date · location |
| `frontend/src/components/shell/ShellCheckInCta.tsx` | Attendance-aware link |
| `frontend/src/components/shell/ShellCheckInCta.test.tsx` | CTA label/href/visibility from props |

### Modify

| File | Change |
|---|---|
| `frontend/src/components/AuthenticatedShell.tsx` | Replace inline header with `ShellTopBar` |
| `frontend/src/locales/en.json` | Extend `AuthenticatedShell` keys |
| `docs/superpowers/specs/2026-08-10-shell-topbar-checkin-design.md` | Status → Implemented (after last task) |

---

### Task 1: Pure shell top-bar helpers

**Files:**
- Create: `frontend/src/libs/shell/shell-topbar.util.ts`
- Test: `frontend/src/libs/shell/shell-topbar.util.test.ts`

**Interfaces:**
- Consumes: `AttendanceDayStatus`, `TodayAttendance` from `@/libs/api/attendance`
- Produces:
  - `formatHeaderDate(date: Date, locale?: string): string` — e.g. `Mon, 10 Aug`
  - `buildLocationLabel(parts: { city?: string | null; locality?: string | null; principalSubdivision?: string | null }): string | null`
  - `type ShellCheckInCtaModel = { kind: 'check_in' | 'checked_in' | 'checked_out' | 'hidden'; timeLabel?: string }`
  - `resolveCheckInCta(today: TodayAttendance | null): ShellCheckInCtaModel`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  buildLocationLabel,
  formatHeaderDate,
  resolveCheckInCta,
} from './shell-topbar.util';
import type { TodayAttendance } from '@/libs/api/attendance';

describe('formatHeaderDate', () => {
  it('formats weekday short, day, month short in en-GB style', () => {
    const label = formatHeaderDate(new Date('2026-08-10T12:00:00'), 'en-GB');
    expect(label).toMatch(/Mon/);
    expect(label).toMatch(/10/);
    expect(label).toMatch(/Aug/);
  });
});

describe('buildLocationLabel', () => {
  it('prefers city then locality then subdivision', () => {
    expect(buildLocationLabel({ city: 'Karachi', locality: 'Clifton' })).toBe('Karachi');
    expect(buildLocationLabel({ city: null, locality: 'Clifton' })).toBe('Clifton');
    expect(
      buildLocationLabel({
        city: null,
        locality: null,
        principalSubdivision: 'Sindh',
      }),
    ).toBe('Sindh');
    expect(buildLocationLabel({})).toBeNull();
  });
});

function baseToday(overrides: Partial<TodayAttendance> = {}): TodayAttendance {
  return {
    workerId: 'w1',
    workDate: '2026-08-10',
    daySummary: null,
    punches: [],
    ...overrides,
  };
}

describe('resolveCheckInCta', () => {
  it('defaults to check_in when no summary', () => {
    expect(resolveCheckInCta(null)).toEqual({ kind: 'check_in' });
    expect(resolveCheckInCta(baseToday())).toEqual({ kind: 'check_in' });
  });

  it('returns checked_in with firstIn for status in', () => {
    const model = resolveCheckInCta(
      baseToday({
        daySummary: {
          id: 'd1',
          workerId: 'w1',
          workDate: '2026-08-10',
          status: 'in',
          firstIn: '2026-08-10T04:00:00.000Z',
          lastOut: null,
        },
      }),
    );
    expect(model.kind).toBe('checked_in');
    expect(model.timeLabel).toBeTruthy();
  });

  it('returns checked_out for status out', () => {
    expect(
      resolveCheckInCta(
        baseToday({
          daySummary: {
            id: 'd1',
            workerId: 'w1',
            workDate: '2026-08-10',
            status: 'out',
            firstIn: '2026-08-10T04:00:00.000Z',
            lastOut: '2026-08-10T13:00:00.000Z',
          },
        }),
      ).kind,
    ).toBe('checked_out');
  });

  it('hides CTA on leave', () => {
    expect(
      resolveCheckInCta(
        baseToday({
          daySummary: {
            id: 'd1',
            workerId: 'w1',
            workDate: '2026-08-10',
            status: 'on_leave',
            firstIn: null,
            lastOut: null,
          },
        }),
      ),
    ).toEqual({ kind: 'hidden' });
  });

  it('treats missing/incomplete as check_in', () => {
    expect(
      resolveCheckInCta(
        baseToday({
          daySummary: {
            id: 'd1',
            workerId: 'w1',
            workDate: '2026-08-10',
            status: 'missing',
            firstIn: null,
            lastOut: null,
          },
        }),
      ).kind,
    ).toBe('check_in');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/libs/shell/shell-topbar.util.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/libs/shell/shell-topbar.util.ts
import type { TodayAttendance } from '@/libs/api/attendance';

export function formatHeaderDate(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function buildLocationLabel(parts: {
  city?: string | null;
  locality?: string | null;
  principalSubdivision?: string | null;
}): string | null {
  const candidate
    = parts.city?.trim()
      || parts.locality?.trim()
      || parts.principalSubdivision?.trim()
      || '';
  return candidate.length > 0 ? candidate : null;
}

export type ShellCheckInCtaModel = {
  kind: 'check_in' | 'checked_in' | 'checked_out' | 'hidden';
  timeLabel?: string;
};

function formatPunchTime(iso: string | null | undefined): string | undefined {
  if (!iso) {
    return undefined;
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return undefined;
  }
}

export function resolveCheckInCta(today: TodayAttendance | null): ShellCheckInCtaModel {
  const status = today?.daySummary?.status ?? null;
  if (status === 'on_leave') {
    return { kind: 'hidden' };
  }
  if (status === 'in') {
    return {
      kind: 'checked_in',
      timeLabel: formatPunchTime(today?.daySummary?.firstIn),
    };
  }
  if (status === 'out') {
    return { kind: 'checked_out' };
  }
  return { kind: 'check_in' };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && pnpm exec vitest run src/libs/shell/shell-topbar.util.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/libs/shell/shell-topbar.util.ts frontend/src/libs/shell/shell-topbar.util.test.ts
git commit -m "$(cat <<'EOF'
feat(frontend): add shell top-bar date and check-in helpers

EOF
)"
```

---

### Task 2: Reverse geocode client helper

**Files:**
- Create: `frontend/src/libs/shell/reverse-geocode.ts`
- Test: `frontend/src/libs/shell/reverse-geocode.test.ts`

**Interfaces:**
- Consumes: `buildLocationLabel` from `./shell-topbar.util`
- Produces: `reverseGeocodeLabel(latitude: number, longitude: number): Promise<string | null>`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { reverseGeocodeLabel } from './reverse-geocode';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('reverseGeocodeLabel', () => {
  it('returns city from BigDataCloud response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          city: 'Karachi',
          locality: 'Clifton',
          principalSubdivision: 'Sindh',
        }),
      }),
    );
    await expect(reverseGeocodeLabel(24.86, 67.0)).resolves.toBe('Karachi');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.bigdatacloud.net/data/reverse-geocode-client'),
    );
  });

  it('returns null on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    await expect(reverseGeocodeLabel(0, 0)).resolves.toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    await expect(reverseGeocodeLabel(0, 0)).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/libs/shell/reverse-geocode.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/libs/shell/reverse-geocode.ts
import { buildLocationLabel } from './shell-topbar.util';

const ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

type BigDataCloudResponse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
};

export async function reverseGeocodeLabel(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const url = new URL(ENDPOINT);
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('localityLanguage', 'en');
    const res = await fetch(url.toString());
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as BigDataCloudResponse;
    return buildLocationLabel({
      city: data.city,
      locality: data.locality,
      principalSubdivision: data.principalSubdivision,
    });
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && pnpm exec vitest run src/libs/shell/reverse-geocode.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/libs/shell/reverse-geocode.ts frontend/src/libs/shell/reverse-geocode.test.ts
git commit -m "$(cat <<'EOF'
feat(frontend): add BigDataCloud reverse-geocode helper for shell location

EOF
)"
```

---

### Task 3: Attendance + geolocation hooks

**Files:**
- Create: `frontend/src/libs/hooks/useTodayAttendance.ts`
- Create: `frontend/src/libs/hooks/useGeolocationLabel.ts`

**Interfaces:**
- Consumes: `getTodayAttendance` from `@/libs/api/attendance`; `reverseGeocodeLabel` from `@/libs/shell/reverse-geocode`
- Produces:
  - `useTodayAttendance(): { today: TodayAttendance | null; isLoading: boolean; error: Error | null; refetch: () => void }`
  - `useGeolocationLabel(): { label: string | null; status: 'idle' | 'loading' | 'ready' | 'unavailable'; retry: () => void }`

- [ ] **Step 1: Implement `useTodayAttendance`**

```ts
// frontend/src/libs/hooks/useTodayAttendance.ts
'use client';

import type { TodayAttendance } from '@/libs/api/attendance';
import { getTodayAttendance } from '@/libs/api/attendance';
import { useCallback, useEffect, useState } from 'react';

export function useTodayAttendance() {
  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick(value => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const { data } = await getTodayAttendance();
        if (!cancelled) {
          setToday(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load attendance'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };
    const onFocus = () => {
      refetch();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [refetch]);

  return { today, isLoading, error, refetch };
}
```

- [ ] **Step 2: Implement `useGeolocationLabel`**

```ts
// frontend/src/libs/hooks/useGeolocationLabel.ts
'use client';

import { reverseGeocodeLabel } from '@/libs/shell/reverse-geocode';
import { useCallback, useEffect, useState } from 'react';

export type GeolocationLabelStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

export function useGeolocationLabel() {
  const [label, setLabel] = useState<string | null>(null);
  const [status, setStatus] = useState<GeolocationLabelStatus>('idle');
  const [tick, setTick] = useState(0);

  const retry = useCallback(() => {
    setTick(value => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      setLabel(null);
      return;
    }

    setStatus('loading');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void (async () => {
          const next = await reverseGeocodeLabel(
            position.coords.latitude,
            position.coords.longitude,
          );
          if (cancelled) {
            return;
          }
          if (next) {
            setLabel(next);
            setStatus('ready');
          } else {
            setLabel(null);
            setStatus('unavailable');
          }
        })();
      },
      () => {
        if (!cancelled) {
          setLabel(null);
          setStatus('unavailable');
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { label, status, retry };
}
```

Do **not** `console.log` coordinates. Do not call Polaris APIs with coords.

- [ ] **Step 3: Typecheck hooks**

Run: `cd frontend && pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | head -n 40`

Expected: no errors from these new files (ignore unrelated pre-existing noise if any)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/libs/hooks/useTodayAttendance.ts frontend/src/libs/hooks/useGeolocationLabel.ts
git commit -m "$(cat <<'EOF'
feat(frontend): add shell attendance and geolocation hooks

EOF
)"
```

---

### Task 4: Shell UI components + i18n + wire shell

**Files:**
- Create: `frontend/src/components/shell/ShellCheckInCta.tsx`
- Create: `frontend/src/components/shell/ShellContextStrip.tsx`
- Create: `frontend/src/components/shell/ShellTopBar.tsx`
- Test: `frontend/src/components/shell/ShellCheckInCta.test.tsx`
- Modify: `frontend/src/components/AuthenticatedShell.tsx`
- Modify: `frontend/src/locales/en.json` (`AuthenticatedShell` block)

**Interfaces:**
- Consumes: hooks + utils from Tasks 1–3; `usePolarisShell` for `showCheckIn`
- Produces: `ShellTopBar` props `{ showCheckIn: boolean; onOpenCommandPalette: () => void; onOpenMobileMenu: () => void }`

- [ ] **Step 1: Add i18n keys**

In `frontend/src/locales/en.json`, replace the `AuthenticatedShell` object with:

```json
"AuthenticatedShell": {
  "check_in": "Check in",
  "checked_in_with_time": "Checked in · {time}",
  "checked_out": "Checked out",
  "search": "Search",
  "location_unavailable": "Location unavailable",
  "retry_location": "Retry location",
  "open_menu": "Open menu"
}
```

Note: `open_menu` may already live under `AppSidebar` — keep using `AppSidebar.open_menu` for the hamburger if already wired; only add the new keys that are missing. Minimum required new keys: `checked_in_with_time`, `checked_out`, `location_unavailable`, `retry_location`.

- [ ] **Step 2: Write failing CTA test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ShellCheckInCta } from './ShellCheckInCta';

vi.mock('@/libs/I18nNavigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const messages = {
  AuthenticatedShell: {
    check_in: 'Check in',
    checked_in_with_time: 'Checked in · {time}',
    checked_out: 'Checked out',
  },
};

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe('ShellCheckInCta', () => {
  it('renders Check in when kind is check_in', () => {
    render(wrap(<ShellCheckInCta model={{ kind: 'check_in' }} />));
    expect(screen.getByRole('link', { name: /check in/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/employee/home'),
    );
  });

  it('renders checked-in time', () => {
    render(wrap(<ShellCheckInCta model={{ kind: 'checked_in', timeLabel: '9:00 AM' }} />));
    expect(screen.getByRole('link', { name: /checked in · 9:00 am/i })).toBeTruthy();
  });

  it('renders nothing when hidden', () => {
    const { container } = render(wrap(<ShellCheckInCta model={{ kind: 'hidden' }} />));
    expect(container).toBeEmptyDOMElement();
  });
});
```

If `@testing-library/react` / `toHaveAttribute` / `toBeEmptyDOMElement` matchers are unavailable in this repo, assert with `getByText` / `queryByRole` + `expect(...).toBeNull()` instead — do not add new test deps.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/components/shell/ShellCheckInCta.test.tsx`

Expected: FAIL

- [ ] **Step 4: Implement components**

`ShellCheckInCta.tsx` — map `model.kind` to Lucide icon (`LogIn` / `Check` / `LogOut`), label via `useTranslations('AuthenticatedShell')`, Link to `/employee/home#check-in`. Primary filled styles for `check_in`; outline / muted for status kinds.

`ShellContextStrip.tsx` — show `formatHeaderDate(new Date())` · location label or unavailable + retry button when `status === 'unavailable'`.

`ShellTopBar.tsx`:

```tsx
'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ShellCheckInCta } from '@/components/shell/ShellCheckInCta';
import { ShellContextStrip } from '@/components/shell/ShellContextStrip';
import { useGeolocationLabel } from '@/libs/hooks/useGeolocationLabel';
import { useTodayAttendance } from '@/libs/hooks/useTodayAttendance';
import { resolveCheckInCta } from '@/libs/shell/shell-topbar.util';

type Props = {
  showCheckIn: boolean;
  onOpenCommandPalette: () => void;
  onOpenMobileMenu: () => void;
};

export function ShellTopBar({ showCheckIn, onOpenCommandPalette, onOpenMobileMenu }: Props) {
  const t = useTranslations('AppSidebar');
  const tShell = useTranslations('AuthenticatedShell');
  const { today } = useTodayAttendance();
  const geo = useGeolocationLabel();
  const ctaModel = showCheckIn ? resolveCheckInCta(today) : { kind: 'hidden' as const };

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-gray-200 bg-white px-4">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 lg:hidden"
        aria-label={t('open_menu')}
      >
        <Menu className="size-5" aria-hidden />
      </button>
      <span className="text-sm font-semibold text-gray-900 lg:hidden">
        {t('workspace_name')}
      </span>

      {/* Left cluster — no ml-auto */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <ShellContextStrip
          dateLabel={/* formatHeaderDate(new Date()) */}
          locationLabel={geo.label}
          locationStatus={geo.status}
          onRetryLocation={geo.retry}
        />
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden shrink-0 items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 lg:inline-flex"
          aria-label={t('quick_actions')}
        >
          <span>{tShell('search')}</span>
          <kbd className="rounded border border-gray-200 bg-gray-50 px-1 text-[10px]">⌘K</kbd>
        </button>
        {showCheckIn && <ShellCheckInCta model={ctaModel} />}
      </div>
    </header>
  );
}
```

Fill `dateLabel` with `formatHeaderDate(new Date())` from the util (compute in render — fine for day granularity).

- [ ] **Step 5: Wire `AuthenticatedShell`**

Replace the inline `<header>…</header>` with:

```tsx
<ShellTopBar
  showCheckIn={showCheckIn}
  onOpenCommandPalette={() => setCommandOpen(true)}
  onOpenMobileMenu={() => setMobileOpen(true)}
/>
```

Remove unused `LogIn` / Link imports from the shell if no longer needed.

- [ ] **Step 6: Run CTA tests + typecheck**

Run:

```bash
cd frontend && pnpm exec vitest run src/components/shell/ShellCheckInCta.test.tsx src/libs/shell/
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/shell frontend/src/components/AuthenticatedShell.tsx frontend/src/locales/en.json
git commit -m "$(cat <<'EOF'
feat(frontend): left-align shell search and attendance-aware check-in

EOF
)"
```

---

### Task 5: Manual verification + spec status

**Files:**
- Modify: `docs/superpowers/specs/2026-08-10-shell-topbar-checkin-design.md` (Status line)

- [ ] **Step 1: Manual QA checklist (employee or manager demo account)**

1. Desktop: header shows **date/day · location**, then **Search**, then CTA on the **left** (not far right).
2. Allow location → locality appears; deny → “Location unavailable” + retry.
3. Check in on Employee Home → return / refocus app → header shows **Checked in · {time}**.
4. Check out → header shows **Checked out**.
5. CTA click → `/employee/home#check-in`; no punch from header network tab.
6. People Ops primary layout → no check-in CTA.

- [ ] **Step 2: Update spec status**

Change Status to: `Implemented — see docs/superpowers/plans/2026-08-10-shell-topbar-checkin.md`

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-08-10-shell-topbar-checkin-design.md
git commit -m "$(cat <<'EOF'
docs: mark shell top-bar check-in design implemented

EOF
)"
```

---

## Spec coverage self-review

| Spec requirement | Task |
|---|---|
| Left-align Search + CTA | Task 4 |
| Day + date + live GPS location | Tasks 1–4 |
| BigDataCloud reverse geocode | Task 2 |
| Soft location failure + retry | Tasks 3–4 |
| Checked in · {time} / Checked out / hide on leave | Tasks 1, 4 |
| Link to home only (no header punch) | Task 4 |
| showCheckIn gating | Task 4 |
| Refetch on visibility/focus | Task 3 |
| en.json only / Lucide | Tasks 4 + Global Constraints |

No placeholders remaining. Types `ShellCheckInCtaModel` and hook return shapes are consistent across tasks.
