import { Skeleton } from "./skeleton";

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
  title?: string;
}

export function TableSkeleton({
  columns = 5,
  rows = 8,
  showHeader = true,
  title
}: TableSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Header with title and actions */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            {title ? (
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            ) : (
              <Skeleton className="h-7 w-48" />
            )}
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        {/* Table content */}
        <div className="p-4">
          {/* Column headers */}
          <div className="flex gap-4 pb-3 border-b border-border mb-3">
            {[...Array(columns)].map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>

          {/* Rows */}
          <div className="space-y-3">
            {[...Array(rows)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                {[...Array(columns)].map((_, j) => (
                  <Skeleton key={j} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SimpleTableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="p-4 space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            {[...Array(columns)].map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({ title }: { title?: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {title ? (
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          ) : (
            <Skeleton className="h-7 w-48" />
          )}
        </div>
      </div>
      <TableSkeleton showHeader={false} />
    </div>
  );
}
