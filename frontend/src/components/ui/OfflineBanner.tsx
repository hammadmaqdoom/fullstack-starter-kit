'use client';

import { WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Message } from 'primereact/message';
import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    function update() {
      setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    }

    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return isOnline;
}

export function OfflineBanner({ className = '' }: { className?: string }) {
  const t = useTranslations('CommonUi');
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <Message
      severity="warn"
      className={`w-full justify-start ${className}`}
      content={(
        <span className="flex items-center gap-2 text-sm">
          <WifiOff className="size-4 shrink-0" aria-hidden />
          {t('offline_banner')}
        </span>
      )}
    />
  );
}
