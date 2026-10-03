import { DoorOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { MoveInForm } from "@/features/tenants/components/move-in-form";
import { getTenant, listAvailableUnits } from "@/features/tenants/queries";
import { getCurrentOrganization } from "@/lib/dal";
import { todayIn } from "@/lib/format";

export const metadata: Metadata = { title: "Move into a unit" };

export default async function MoveInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tenant, units, organization] = await Promise.all([
    getTenant(id),
    listAvailableUnits(),
    getCurrentOrganization(),
  ]);
  if (!tenant) notFound();
  // v1: one home at a time per tenant from this screen; move out first.
  if (tenant.tenancies.some((t) => t.status === "active")) redirect(`/tenants/${tenant.id}`);

  const back = { href: `/tenants/${tenant.id}`, label: tenant.full_name };

  return (
    <>
      <PageHeader
        title="Move into a unit"
        description={`Start a new tenancy for ${tenant.full_name}.`}
        back={back}
      />
      {units.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No vacant units"
          description="Add a unit, or move a current tenant out first."
          action={
            <Button asChild>
              <Link href="/units">Go to Units</Link>
            </Button>
          }
        />
      ) : (
        <MoveInForm
          tenantId={tenant.id}
          units={units}
          currency={organization?.currency ?? "BDT"}
          defaultValues={{
            unitId: "",
            monthlyRent: "",
            securityDeposit: "0",
            moveInDate: todayIn(organization?.timezone),
          }}
        />
      )}
    </>
  );
}
