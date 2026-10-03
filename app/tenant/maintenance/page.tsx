import { Wrench } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Maintenance" };

export default function TenantMaintenancePage() {
  return (
    <>
      <PageHeader title="Maintenance" description="Report and track issues in your home." />
      <EmptyState
        icon={Wrench}
        title="No requests yet"
        description="Report a problem and track its progress here."
      />
    </>
  );
}
