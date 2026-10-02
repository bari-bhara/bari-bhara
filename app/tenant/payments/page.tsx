import { CreditCard } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Payments" };

export default function TenantPaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" description="Your payment history." />
      <EmptyState
        icon={CreditCard}
        title="No payments yet"
        description="Payments your landlord records will appear here."
      />
    </>
  );
}
