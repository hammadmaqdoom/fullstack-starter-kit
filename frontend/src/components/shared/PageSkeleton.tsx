'use client';

import { Skeleton } from 'primereact/skeleton';

type PageSkeletonProps = {
  variant?: 'list' | 'table' | 'detail';
  rows?: number;
  showHeader?: boolean;
  className?: string;
};

export function PageSkeleton({
  variant = 'list',
  rows = 4,
  showHeader = true,
  className = '',
}: PageSkeletonProps) {
  const count = Math.max(1, rows);

  return (
    <div className={`space-y-4 ${className}`} aria-busy="true">
      {showHeader && (
        <div className="space-y-2">
          <Skeleton height="1.75rem" width="40%" />
          <Skeleton height="0.875rem" width="60%" />
        </div>
      )}

      {variant === 'detail' && (
        <div className="space-y-3 rounded-2xl border border-gray-100 p-4">
          {Array.from({ length: count }).map((_, index) => (
            <Skeleton key={index} height="1.25rem" className="w-full" />
          ))}
        </div>
      )}

      {variant === 'list' && (
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, index) => (
            <Skeleton key={index} height="4.5rem" className="w-full rounded-xl" />
          ))}
        </div>
      )}

      {variant === 'table' && (
        <div className="space-y-2 rounded-xl border border-gray-100 p-3">
          <Skeleton height="2rem" className="w-full" />
          {Array.from({ length: count }).map((_, index) => (
            <Skeleton key={index} height="2.5rem" className="w-full" />
          ))}
        </div>
      )}
    </div>
  );
}
