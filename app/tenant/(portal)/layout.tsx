import { requireLinkedTenant } from "@/features/tenant-portal/queries";

/**
 * Tenant pages that need a home. Rendered inside the tenant layout's
 * Suspense boundary, which already checked the role.
 */
export default async function TenantPortalLayout({ children }: { children: React.ReactNode }) {
  await requireLinkedTenant();
  return children;
}
