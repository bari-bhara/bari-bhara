import { Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { PageSkeleton } from "@/components/app/page-skeletons";
import { RoleGate } from "@/components/app/role-gate";
import { getPendingClaimCount } from "@/features/claims/queries";

async function loadLandlordBadges() {
  // Tenants' "already paid" claims waiting for review.
  return { "/rent": await getPendingClaimCount() };
}

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell variant="landlord" loadBadges={loadLandlordBadges}>
      <Suspense fallback={<PageSkeleton />}>
        <RoleGate role="landlord">{children}</RoleGate>
      </Suspense>
    </AppShell>
  );
}
