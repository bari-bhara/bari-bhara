import { Users } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Tenants" };

export default function TenantsPage() {
  return (
    <>
      <PageHeader title="Tenants" description="Everyone renting from you, current and past." />
      <EmptyState
        icon={Users}
        title="No tenants yet"
        description="Add your first tenant to start managing your property."
      />
    </>
  );
}
