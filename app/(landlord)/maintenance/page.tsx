import { Wrench } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Maintenance" };

export default function MaintenancePage() {
  return (
    <>
      <PageHeader title="Maintenance" description="Issues reported by your tenants." />
      <EmptyState
        icon={Wrench}
        title="No maintenance requests"
        description="When tenants report an issue, it will show up here."
      />
    </>
  );
}
