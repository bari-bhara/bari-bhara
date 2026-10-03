import { Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { PageSkeleton } from "@/components/app/page-skeletons";
import { RoleGate } from "@/components/app/role-gate";
import { getUnreadNoticeCount } from "@/features/notices/queries";
import { getUnreadNotificationCount } from "@/features/notifications/queries";

async function loadTenantBadges() {
  const [notices, reminders] = await Promise.all([getUnreadNoticeCount(), getUnreadNotificationCount()]);
  return { "/tenant/notices": notices, "/tenant/notifications": reminders };
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
