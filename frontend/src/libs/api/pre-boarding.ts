import { ApiRequestError, apiRequest } from '@/libs/api/client';

export type PreBoardingPacketStatus =
  | 'draft'
  | 'invited'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'complete'
  | 'cancelled';

export type PreBoardingPacket = {
  id: string;
  status: PreBoardingPacketStatus | string;
  personalEmail?: string | null;
  workerId?: string | null;
  candidateId?: string | null;
  inviteToken?: string | null;
  createdAt?: string;
  worker?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    countryCode?: string | null;
  } | null;
};

const BASE = '/api/v1/pre-boarding';

export async function listPreBoardingPackets() {
  try {
    return await apiRequest<PreBoardingPacket[]>(BASE);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { data: [] as PreBoardingPacket[], meta: { unavailable: true } };
    }
    throw err;
  }
}

export async function createPreBoardingPacket(input: {
  workerId: string;
  personalEmail: string;
  candidateId?: string;
  templateVersionId?: string;
}) {
  return apiRequest<PreBoardingPacket>(BASE, {
    method: 'POST',
    body: input,
  });
}

export async function invitePreBoardingCandidate(packetId: string) {
  return apiRequest<PreBoardingPacket>(`${BASE}/${packetId}/invite`, {
    method: 'POST',
    body: {},
  });
}

/** Public candidate portal URL for copying invite links in People Ops UI. */
export function candidatePortalUrl(packetId: string): string {
  if (typeof window === 'undefined') {
    return `/pre-boarding/${packetId}`;
  }
  return `${window.location.origin}/en/pre-boarding/${packetId}`;
}
