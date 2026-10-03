import { requireRole } from "@/lib/dal";
import type { UserRole } from "@/types/domain";

/**
 * Renders children only for users with `role`; redirects everyone else.
 * Reads the session — render inside <Suspense> (see page-skeletons).
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
