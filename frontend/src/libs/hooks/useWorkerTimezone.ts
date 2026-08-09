'use client';

import { useEffect, useState } from 'react';
import { resolveDisplayTimezone } from '@/libs/datetime/format-in-timezone';
import { getMyWorker } from '@/libs/api/workers';

type UseWorkerTimezoneResult = {
  timezone: string;
  isLoading: boolean;
};

/** Resolve the signed-in worker's timezone for display; falls back to browser zone. */
export function useWorkerTimezone(): UseWorkerTimezoneResult {
  const [timezone, setTimezone] = useState(() => resolveDisplayTimezone(null));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { data } = await getMyWorker();
        if (!cancelled) {
          setTimezone(resolveDisplayTimezone(data.timezone));
        }
      } catch {
        if (!cancelled) {
          setTimezone(resolveDisplayTimezone(null));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { timezone, isLoading };
}
