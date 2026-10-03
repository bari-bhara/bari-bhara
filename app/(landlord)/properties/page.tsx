import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Properties" };

export default function PropertiesPage() {
  return (
    <>
      <PageHeader title="Properties" description="Buildings you manage." />
      <EmptyState
        icon={Building2}
        title="No properties yet"
        description="Add your first property to start managing units and tenants."
      />
    </>
  );
}
