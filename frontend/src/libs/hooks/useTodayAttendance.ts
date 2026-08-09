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
