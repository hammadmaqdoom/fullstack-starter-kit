'use client';

import { useEffect, useState } from 'react';
import { probeApiAccess } from '@/libs/api/client';

export type PolarisNavAccess = {
  peopleOps: boolean;
  employee: boolean;
  manager: boolean;
  finance: boolean;
  isLoading: boolean;
};

export function usePolarisNavAccess(): PolarisNavAccess {
  const [access, setAccess] = useState<PolarisNavAccess>({
    peopleOps: false,
    employee: false,
    manager: false,
    finance: false,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [peopleOps, directory] = await Promise.all([
        probeApiAccess('/api/v1/workers'),
        probeApiAccess('/api/v1/org/directory'),
      ]);

      if (cancelled) {
        return;
      }

      setAccess({
        peopleOps,
        employee: directory,
        manager: peopleOps || directory,
        finance: peopleOps,
        isLoading: false,
      });
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return access;
}
