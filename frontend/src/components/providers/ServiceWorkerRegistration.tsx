'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker when available.
 * Failures are ignored — offline queue is Phase 1 and optional in local dev.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW asset may be absent until PWA offline support is wired.
    });
  }, []);

  return null;
}
