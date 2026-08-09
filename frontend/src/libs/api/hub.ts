import type { TrackerStep } from '@/components/shared/StatusTracker';
import { apiRequest, ApiRequestError } from '@/libs/api/client';

export type HubTab = 'mine' | 'for_me';

export type HubItemType =
  | 'leave'
  | 'punch_correction'
  | 'expense'
  | 'travel'
  | 'invoice'
  | 'esign'
  | 'ticket'
  | 'onboarding'
  | 'other';

export type HubItemStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'in'
  | 'out'
  | 'on_leave'
  | 'missing'
  | string;

export type HubItem = {
  id: string;
  type: HubItemType | string;
  title: string;
  subtitle?: string | null;
  status: HubItemStatus;
  requesterName?: string | null;
  requesterWorkerId?: string | null;
  /** Domain entity id for leave / punch-correction mutations; falls back to id */
  referenceId?: string;
  actionable?: boolean;
  nextStepText?: string | null;
  /** Status tracker steps (Hub / StatusTracker) */
  steps?: TrackerStep[];
  leaveTypeName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
};

export type HubInbox = {
  mine: HubItem[];
  forMe: HubItem[];
};

export type HubCounts = {
  forMe: number;
  mine: number;
};

type HubInboxRaw =
  | HubItem[]
  | {
      mine?: HubItem[];
      forMe?: HubItem[];
      for_me?: HubItem[];
      items?: HubItem[];
    };

function normalizeInbox(data: HubInboxRaw): HubInbox {
  if (Array.isArray(data)) {
    return { mine: [], forMe: data };
  }
  return {
    mine: data.mine ?? [],
    forMe: data.forMe ?? data.for_me ?? data.items ?? [],
  };
}

/** Full inbox (mine + for-me) — used by Hub page. Empty on 404. */
export async function getHubInbox() {
  try {
    const { data, meta } = await apiRequest<HubInboxRaw>('/api/v1/hub');
    return { data: normalizeInbox(data), meta };
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { data: { mine: [], forMe: [] }, meta: { unavailable: true } };
    }
    throw err;
  }
}

/** Tab-scoped list — used by manager cockpit approvals */
export async function listHubItems(tab: HubTab = 'for_me') {
  try {
    const { data, meta } = await apiRequest<HubInboxRaw>('/api/v1/hub', {
      params: { tab },
    });
    const inbox = normalizeInbox(data);
    return {
      data: tab === 'mine' ? inbox.mine : inbox.forMe,
      meta,
    };
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { data: [] as HubItem[], meta: { unavailable: true } };
    }
    throw err;
  }
}

/** Derive badge counts from the inbox payload (no dedicated /hub/counts route). */
export async function getHubCounts() {
  const { data, meta } = await getHubInbox();
  return {
    data: { forMe: data.forMe.length, mine: data.mine.length } satisfies HubCounts,
    meta,
  };
}

export function hubItemReferenceId(item: HubItem): string {
  return item.referenceId ?? item.id;
}
