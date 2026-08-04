'use client';

import type { ShellSearchHit } from '@/libs/api/shell';
import { ApiRequestError } from '@/libs/api/client';
import { searchShell } from '@/libs/api/shell';
import { useRouter } from '@/libs/I18nNavigation';
import { Loader2, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from 'primereact/dialog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const GROUP_ORDER: ShellSearchHit['type'][] = [
  'action',
  'module',
  'worker',
  'hub_item',
  'policy',
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('CommandPalette');
  const tNav = useTranslations('AppSidebar');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<ShellSearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const load = useCallback(async (q: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await searchShell(q, 20);
      setHits(data ?? []);
      setActiveIndex(0);
    } catch (err) {
      setHits([]);
      setError(
        err instanceof ApiRequestError ? err.message : t('error_load'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery('');
    void load('');
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open, load]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handle = window.setTimeout(() => {
      void load(query);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query, open, load]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const grouped = useMemo(() => {
    const map = new Map<ShellSearchHit['type'], ShellSearchHit[]>();
    for (const hit of hits) {
      const list = map.get(hit.type) ?? [];
      list.push(hit);
      map.set(hit.type, list);
    }
    return GROUP_ORDER.filter((type) => map.has(type)).map((type) => ({
      type,
      items: map.get(type) ?? [],
    }));
  }, [hits]);

  const flatHits = useMemo(
    () => grouped.flatMap((group) => group.items),
    [grouped],
  );

  function hitTitle(hit: ShellSearchHit): string {
    if (hit.type === 'module') {
      try {
        return tNav(hit.title as 'hub_link');
      } catch {
        return hit.title;
      }
    }
    return hit.title;
  }

  function selectHit(hit: ShellSearchHit) {
    onOpenChange(false);
    router.push(hit.href);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) =>
        flatHits.length === 0 ? 0 : (index + 1) % flatHits.length,
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) =>
        flatHits.length === 0
          ? 0
          : (index - 1 + flatHits.length) % flatHits.length,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const hit = flatHits[activeIndex];
      if (hit) {
        selectHit(hit);
      }
    } else if (event.key === 'Escape') {
      onOpenChange(false);
    }
  }

  let flatIndex = -1;

  return (
    <Dialog
      visible={open}
      onHide={() => onOpenChange(false)}
      header={t('title')}
      modal
      dismissableMask
      style={{ width: 'min(560px, 92vw)' }}
      contentClassName="!p-0"
    >
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <Search className="size-4 shrink-0 text-gray-400" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={t('placeholder')}
            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            aria-label={t('placeholder')}
          />
          {isLoading && (
            <Loader2 className="size-4 shrink-0 animate-spin text-gray-400" aria-hidden />
          )}
        </div>
      </div>

      <div className="max-h-[360px] overflow-y-auto px-2 py-2">
        {error && (
          <div className="px-3 py-4 text-center text-sm text-red-600">
            <p>{error}</p>
            <button
              type="button"
              className="mt-2 text-sm font-medium text-blue-600 hover:underline"
              onClick={() => void load(query)}
            >
              {t('retry')}
            </button>
          </div>
        )}

        {!error && flatHits.length === 0 && !isLoading && (
          <p className="px-3 py-8 text-center text-sm text-gray-500">
            {t('no_results')}
          </p>
        )}

        {!error
          && grouped.map((group) => (
            <div key={group.type} className="mb-2">
              <p className="px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                {t(`group_${group.type}`)}
              </p>
              <ul>
                {group.items.map((hit) => {
                  flatIndex += 1;
                  const index = flatIndex;
                  const active = index === activeIndex;
                  return (
                    <li key={`${hit.type}-${hit.id}`}>
                      <button
                        type="button"
                        onClick={() => selectHit(hit)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`flex w-full flex-col rounded-md px-3 py-2 text-left ${
                          active ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-sm font-medium text-gray-900">
                          {hitTitle(hit)}
                        </span>
                        {hit.subtitle && (
                          <span className="text-xs text-gray-500">{hit.subtitle}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
      </div>
    </Dialog>
  );
}
