import { Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { PageSkeleton, RoleGate } from "@/components/app/role-gate";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell variant="tenant">
      <Suspense fallback={<PageSkeleton />}>
        <RoleGate role="tenant">{children}</RoleGate>
      </Suspense>
    </AppShell>
  );
}
