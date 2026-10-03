import { Skeleton } from "@/components/ui/skeleton";

/** Dashboard-shaped placeholder: header, stat cards, a panel. */
export function PageSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading">
      <HeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

/** List-shaped placeholder: header, filter row, rows. Used while a page loads. */
export function ListSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading">
      <HeaderSkeleton />
      <div className="flex gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}
