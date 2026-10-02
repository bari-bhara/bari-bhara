import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/dal";
import type { UserRole } from "@/types/domain";

/**
 * Renders children only for users with `role`; redirects everyone else.
 * Reads the session — render inside <Suspense> (see PageSkeleton).
 */
export async function RoleGate({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  await requireRole(role);
  return children;
}

export function PageSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading">
      <div className="grid gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
