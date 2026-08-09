'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import type { DirectoryEntry, OrgChartNode } from '@/libs/api/org';
import {
  directoryDisplayName,
  getOrgChart,
  orgNodeDisplayName,
  searchDirectory,
} from '@/libs/api/org';
import {
  ChevronDown,
  ChevronRight,
  Network,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Skeleton } from 'primereact/skeleton';
import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

function OrgSubtree({
  nodes,
  depth = 0,
}: {
  nodes: OrgChartNode[];
  depth?: number;
}) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <ul className={depth === 0 ? 'space-y-2' : 'mt-2 space-y-2 border-l border-gray-200 pl-3'}>
      {nodes.map(node => (
        <li key={node.workerId}>
          <div className="rounded-md bg-gray-50 px-2.5 py-1.5">
            <p className="text-sm font-medium text-gray-900">
              {orgNodeDisplayName(node)}
            </p>
            <p className="truncate text-xs text-gray-500">
              {[node.employmentTypeName, node.departmentName, node.divisionName]
                .filter(Boolean)
                .join(' · ') || node.email}
            </p>
          </div>
          {node.directReports?.length > 0 && (
            <OrgSubtree nodes={node.directReports} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

function ResultRow({
  entry,
  expanded,
  chartLoading,
  chartError,
  chart,
  onToggle,
  onRetryChart,
}: {
  entry: DirectoryEntry;
  expanded: boolean;
  chartLoading: boolean;
  chartError: string | null;
  chart: OrgChartNode[] | null;
  onToggle: () => void;
  onRetryChart: () => void;
}) {
  const t = useTranslations('Directory');
  const name = directoryDisplayName(entry);
  const meta = [
    entry.employmentTypeName,
    entry.departmentName,
    entry.divisionName,
    entry.countryCode,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
        aria-expanded={expanded}
      >
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
          {`${entry.firstName?.[0] ?? ''}${entry.lastName?.[0] ?? ''}`.toUpperCase() || '?'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-900">{name}</span>
          <span className="mt-0.5 block truncate text-xs text-gray-500">{entry.email}</span>
          {meta && (
            <span className="mt-1 block text-xs text-gray-500">{meta}</span>
          )}
          {entry.phone && (
            <span className="mt-0.5 block text-xs text-gray-500">{entry.phone}</span>
          )}
        </span>
        {expanded
          ? <ChevronDown className="size-4 shrink-0 text-gray-400" aria-hidden />
          : <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">
            <Network className="size-3.5" aria-hidden />
            {t('org_subtree')}
          </p>

          {chartLoading && (
            <div className="space-y-2">
              <Skeleton height="2.25rem" />
              <Skeleton height="2.25rem" className="ml-4 w-11/12" />
            </div>
          )}

          {!chartLoading && chartError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
              <p className="text-sm text-red-700">{chartError}</p>
              <Button
                type="button"
                size="small"
                className="mt-2 gap-1"
                onClick={onRetryChart}
              >
                <RefreshCw className="size-3.5" aria-hidden />
                {t('retry')}
              </Button>
            </div>
          )}

          {!chartLoading && !chartError && chart && chart.length === 0 && (
            <p className="text-sm text-gray-500">{t('org_empty')}</p>
          )}

          {!chartLoading && !chartError && chart && chart.length > 0 && (
            <OrgSubtree nodes={chart} />
          )}
        </div>
      )}
    </li>
  );
}

export default function EmployeeDirectoryPage() {
  const t = useTranslations('Directory');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [chartById, setChartById] = useState<Record<string, OrgChartNode[]>>({});
  const [chartLoadingId, setChartLoadingId] = useState<string | null>(null);
  const [chartErrorById, setChartErrorById] = useState<Record<string, string>>({});
  const requestIdRef = useRef(0);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query]);

  const loadChart = useCallback(async (workerId: string) => {
    setChartLoadingId(workerId);
    setChartErrorById(prev => {
      const next = { ...prev };
      delete next[workerId];
      return next;
    });
    try {
      const { data } = await getOrgChart({ rootId: workerId, depth: 2 });
      setChartById(prev => ({ ...prev, [workerId]: data ?? [] }));
    } catch (err) {
      setChartErrorById(prev => ({
        ...prev,
        [workerId]: err instanceof ApiRequestError ? err.message : t('error_chart'),
      }));
    } finally {
      setChartLoadingId(null);
    }
  }, [t]);

  const toggleExpand = (workerId: string) => {
    if (expandedId === workerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(workerId);
    if (!chartById[workerId] && !chartErrorById[workerId]) {
      void loadChart(workerId);
    }
  };

  const runSearch = useCallback(async (q: string) => {
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError(null);
      setSearched(false);
      setLoading(false);
      setExpandedId(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const { data } = await searchDirectory({ q, limit: 25 });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setResults(data ?? []);
      setExpandedId(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setError(err instanceof ApiRequestError ? err.message : t('error_search'));
      setResults([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    void runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  const showIdle = !searched && !loading && debouncedQuery.length < MIN_QUERY_LENGTH;
  const showTooShort = query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH && !loading;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <OfflineBanner />

      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
        <InputText
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('search_placeholder')}
          className="w-full pl-9"
          aria-label={t('search_placeholder')}
          autoComplete="off"
        />
      </div>

      {showTooShort && (
        <p className="text-sm text-gray-500">{t('min_chars')}</p>
      )}

      {showIdle && (
        <EmptyState
          icon={Search}
          title={t('idle_title')}
          description={t('idle_description')}
        />
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton height="4.5rem" />
          <Skeleton height="4.5rem" />
          <Skeleton height="4.5rem" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <Button
            type="button"
            className="mt-4 gap-2"
            onClick={() => void runSearch(debouncedQuery)}
          >
            <RefreshCw className="size-4" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!loading && !error && searched && results.length === 0 && (
        <EmptyState
          icon={Users}
          title={t('empty_title')}
          description={t('empty_description', { query: debouncedQuery })}
        />
      )}

      {!loading && !error && results.length > 0 && (
        <ul className="space-y-2">
          {results.map(entry => (
            <ResultRow
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              chartLoading={chartLoadingId === entry.id}
              chartError={chartErrorById[entry.id] ?? null}
              chart={chartById[entry.id] ?? null}
              onToggle={() => toggleExpand(entry.id)}
              onRetryChart={() => void loadChart(entry.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
