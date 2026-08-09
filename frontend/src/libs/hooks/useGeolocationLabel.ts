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
