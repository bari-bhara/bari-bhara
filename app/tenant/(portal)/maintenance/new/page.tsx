import { Home } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { TenantRequestForm } from "@/features/maintenance/components/tenant-request-form";
import { getMyTenancies } from "@/features/tenant-portal/queries";

export const metadata: Metadata = { title: "Report a problem" };

export default async function NewTenantRequestPage() {
  const tenancies = await getMyTenancies();
  const homes = tenancies
    .filter((t) => t.status === "active")
    .map((t) => ({ tenancyId: t.tenancy_id, label: `${t.property_name} · Unit ${t.unit_number}` }));

  return (
    <>
      <PageHeader
        title="Report a problem"
        description="Tell your landlord what needs fixing. Photos help."
        back={{ href: "/tenant/maintenance", label: "Maintenance" }}
      />
      {homes.length === 0 ? (
        <EmptyState icon={Home} title="No current home" description="You can report problems for a home you currently rent." />
      ) : (
        <TenantRequestForm homes={homes} />
      )}
    </>
  );
}
