import { CreditCard } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" description="Every payment you've recorded." />
      <EmptyState
        icon={CreditCard}
        title="No payments yet"
        description="Payments you record against rent and bills will appear here."
      />
    </>
  );
}
