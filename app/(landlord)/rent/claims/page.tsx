import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { ClaimsList } from "@/features/claims/components/claims-list";
import { listPendingClaims } from "@/features/claims/queries";
import { getCurrentOrganization } from "@/lib/dal";

export const metadata: Metadata = { title: "Payment claims" };

export default async function PaymentClaimsPage() {
  const [claims, organization] = await Promise.all([listPendingClaims(), getCurrentOrganization()]);

  return (
    <>
      <PageHeader
        title="Payment claims"
        description="Tenants who say they've paid. Approve to record the payment, or reject with a reason."
        back={{ href: "/rent", label: "Rent" }}
      />
      {claims.length === 0 ? (
        <EmptyState icon={CircleCheck} title="No claims to review" description="You're all caught up." />
      ) : (
        <ClaimsList
          claims={claims}
          currency={organization?.currency ?? "BDT"}
          timeZone={organization?.timezone}
        />
      )}
    </>
  );
}
