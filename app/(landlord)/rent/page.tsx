import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Rent" };

export default function RentPage() {
  return (
    <>
      <PageHeader title="Rent" description="Monthly rent charges and their status." />
      <EmptyState
        icon={Receipt}
        title="No rent records yet"
        description="Monthly rent appears here once you have tenants."
      />
    </>
  );
}
