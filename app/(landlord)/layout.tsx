import { Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { PageSkeleton, RoleGate } from "@/components/app/role-gate";

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell variant="landlord">
      <Suspense fallback={<PageSkeleton />}>
        <RoleGate role="landlord">{children}</RoleGate>
      </Suspense>
    </AppShell>
  );
}
