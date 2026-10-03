import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { LandlordRequestForm } from "@/features/maintenance/components/landlord-request-form";
import { listUnitOptions } from "@/features/maintenance/queries";

export const metadata: Metadata = { title: "New maintenance request" };

export default async function NewMaintenanceRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ unitId?: string }>;
}) {
  const [{ unitId }, units] = await Promise.all([searchParams, listUnitOptions()]);
  return (
    <>
      <PageHeader
        title="New request"
        description="Log an issue you've noticed or one reported by phone."
        back={{ href: "/maintenance", label: "Maintenance" }}
      />
      <LandlordRequestForm units={units} defaultUnitId={units.some((u) => u.id === unitId) ? unitId! : ""} />
    </>
  );
}
