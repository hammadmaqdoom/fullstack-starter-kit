'use client';

import { useEffect, useState } from 'react';
import { probeApiAccess } from '@/libs/api/client';

export type PolarisNavAccess = {
  peopleOps: boolean;
  employee: boolean;
  manager: boolean;
  finance: boolean;
  contractor: boolean;
  isLoading: boolean;
};

export function usePolarisNavAccess(): PolarisNavAccess {
  const [access, setAccess] = useState<PolarisNavAccess>({
    peopleOps: false,
    employee: false,
    manager: false,
    finance: false,
    contractor: false,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [peopleOps, directory, performance, contractorInvoices] = await Promise.all([
        probeApiAccess('/api/v1/workers'),
        probeApiAccess('/api/v1/org/directory'),
        probeApiAccess('/api/v1/talent/performance/dashboard'),
        probeApiAccess('/api/v1/contractor-invoices'),
      ]);

      if (cancelled) {
        return;
      }

      setAccess({
        peopleOps,
        employee: directory || performance,
        manager: peopleOps || directory || performance,
        finance: peopleOps,
        contractor: contractorInvoices,
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
