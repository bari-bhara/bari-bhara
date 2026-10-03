import { DoorOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { AddTenantForm } from "@/features/tenants/components/add-tenant-form";
import { listAvailableUnits } from "@/features/tenants/queries";
import { EMPTY_TENANT } from "@/features/tenants/schema";
import { getCurrentOrganization } from "@/lib/dal";
import { todayIn } from "@/lib/format";

export const metadata: Metadata = { title: "Add tenant" };

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ unitId?: string }>;
}) {
  const [{ unitId }, units, organization] = await Promise.all([
    searchParams,
    listAvailableUnits(),
    getCurrentOrganization(),
  ]);

  // Coming from a unit page preselects that unit (if it's available).
  const unit = units.find((u) => u.id === unitId);
  const back = unit
    ? { href: `/units/${unit.id}`, label: `Unit ${unit.unit_number}` }
    : { href: "/tenants", label: "Tenants" };

  if (units.length === 0) {
    return (
      <>
        <PageHeader title="Add tenant" back={back} />
        <EmptyState
          icon={DoorOpen}
          title="No vacant units"
          description="Tenants move into a unit. Add a unit, or move a current tenant out first."
          action={
            <Button asChild>
              <Link href="/units">Go to Units</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Add tenant"
        description="Add their details and move them into a unit."
        back={back}
      />
      <AddTenantForm
        units={units}
        currency={organization?.currency ?? "BDT"}
        cancelHref={back.href}
        defaultValues={{
          ...EMPTY_TENANT,
          unitId: unit?.id ?? "",
          monthlyRent: unit ? String(unit.default_rent) : "",
          securityDeposit: "0",
          moveInDate: todayIn(organization?.timezone),
        }}
      />
    </>
  );
}
