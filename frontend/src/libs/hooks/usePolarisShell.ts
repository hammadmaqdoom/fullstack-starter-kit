'use client';

import type { ShellPayload } from '@/libs/api/shell';
import { getShell } from '@/libs/api/shell';
import { useCallback, useEffect, useState } from 'react';

export type UsePolarisShellResult = {
  shell: ShellPayload | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

export function usePolarisShell(): UsePolarisShellResult {
  const [shell, setShell] = useState<ShellPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const { data } = await getShell();
        if (!cancelled) {
          setShell(data);
        }
      } catch (err) {
        if (!cancelled) {
          setShell(null);
          setError(err instanceof Error ? err : new Error('Failed to load shell'));
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

  return { shell, isLoading, error, refetch };
}
