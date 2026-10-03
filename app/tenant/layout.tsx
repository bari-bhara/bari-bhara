import { Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { PageSkeleton, RoleGate } from "@/components/app/role-gate";
import { getUnreadNoticeCount } from "@/features/notices/queries";

async function loadTenantBadges() {
  return { "/tenant/notices": await getUnreadNoticeCount() };
}

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell variant="tenant" loadBadges={loadTenantBadges}>
      <Suspense fallback={<PageSkeleton />}>
        <RoleGate role="tenant">{children}</RoleGate>
      </Suspense>
    </AppShell>
  );
}
