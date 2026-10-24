import { CalendarClock, Pencil, Plus, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailList } from "@/components/app/detail-list";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRentTypeId, listUtilityTypes } from "@/features/charges/queries";
import { TenancyHistory } from "@/features/tenants/components/tenancy-history";
import { listUnitTenancies } from "@/features/tenants/queries";
import { DeleteUnitButton } from "@/features/units/components/delete-unit-button";
import { ScheduleChargeDialog } from "@/features/units/components/schedule-charge-dialog";
import { UnitSchedule } from "@/features/units/components/unit-schedule";
import { UnitStatusBadge } from "@/features/units/components/unit-status-badge";
import { getUnit, getUnitSchedule } from "@/features/units/queries";
import { getCurrentOrganization } from "@/lib/dal";
import { formatDay, formatMoney, shiftMonth, todayIn } from "@/lib/format";

export const metadata: Metadata = { title: "Unit" };

export default async function UnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organization = await getCurrentOrganization();
  const thisMonth = todayIn(organization?.timezone).slice(0, 7);
  const [unit, tenancies, schedule, rentTypeId, utilityTypes] = await Promise.all([
    getUnit(id),
    listUnitTenancies(id),
    getUnitSchedule(id, thisMonth),
    getRentTypeId(),
    listUtilityTypes(),
  ]);
  if (!unit) notFound();

  const currency = organization?.currency ?? "BDT";
  const rent = schedule.find((line) => line.isRent);
  const current = tenancies.find((t) => t.status === "active");
  const canAddTenant =
    !current && unit.status !== "inactive" && unit.property.archived_at === null;

  return (
    <>
      <PageHeader
        title={`Unit ${unit.unit_number}`}
        description={unit.property.name}
        back={{ href: `/properties/${unit.property.id}`, label: unit.property.name }}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/units/${unit.id}/edit`}>
                <Pencil aria-hidden /> Edit
              </Link>
            </Button>
            {canAddTenant && (
              <Button asChild>
                <Link href={`/tenants/new?unitId=${unit.id}`}>
                  <UserPlus aria-hidden /> Add tenant
                </Link>
              </Button>
            )}
            {tenancies.length === 0 && (
              <DeleteUnitButton unitId={unit.id} unitNumber={unit.unit_number} />
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: "Status", value: <UnitStatusBadge status={unit.status} /> },
                {
                  label: "Monthly rent",
                  value: formatMoney(unit.default_rent, currency),
                },
                { label: "Type", value: unit.unit_type || "—" },
                { label: "Bedrooms", value: unit.bedrooms ?? "—" },
                { label: "Floor", value: unit.floor || "—" },
                ...(unit.electricity_account_no || unit.electricity_meter_no || unit.gas_meter_no
                  ? [
                      {
                        label: "Prepaid meters",
                        value: (
                          <ul className="grid gap-0.5 font-normal">
                            {unit.electricity_account_no && (
                              <li>Electricity account: {unit.electricity_account_no}</li>
                            )}
                            {unit.electricity_meter_no && <li>Electricity meter: {unit.electricity_meter_no}</li>}
                            {unit.gas_meter_no && <li>Gas meter: {unit.gas_meter_no}</li>}
                          </ul>
                        ),
                      },
                    ]
                  : []),
                {
                  label: "Property",
                  value: (
                    <Link href={`/properties/${unit.property.id}`} className="hover:underline">
                      {unit.property.name}
                    </Link>
                  ),
                },
                {
                  label: "Notes",
                  value: unit.notes ? (
                    <span className="whitespace-pre-line font-normal">{unit.notes}</span>
                  ) : (
                    "—"
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <CardTitle>Monthly charges</CardTitle>
              <div className="flex flex-wrap gap-2">
                <ScheduleChargeDialog
                  unitId={unit.id}
                  title="Change rent"
                  description="Set a new monthly rent from a future month. Rent already billed doesn't change."
                  rentTypeId={rentTypeId}
                  currentAmount={rent?.current || current?.monthly_rent || unit.default_rent}
                  currency={currency}
                  firstMonth={shiftMonth(thisMonth, 1)}
                  hasTenant={current !== undefined}
                  trigger={
                    <Button variant="outline" size="sm">
                      <CalendarClock aria-hidden /> Change rent
                    </Button>
                  }
                />
                <ScheduleChargeDialog
                  unitId={unit.id}
                  title="Add a monthly bill"
                  description="A fixed amount billed every month with the rent, such as a service charge or flat-rate water."
                  types={utilityTypes}
                  currency={currency}
                  firstMonth={shiftMonth(thisMonth, 1)}
                  hasTenant={current !== undefined}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Plus aria-hidden /> Monthly bill
                    </Button>
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <UnitSchedule lines={schedule} currency={currency} />
              <p className="text-xs text-muted-foreground">
                Billed automatically on the 1st of each month while the unit has a tenant.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tenant</CardTitle>
            </CardHeader>
            <CardContent>
              {current ? (
                <DetailList
                  items={[
                    {
                      label: "Name",
                      value: (
                        <Link href={`/tenants/${current.tenant.id}`} className="hover:underline">
                          {current.tenant.full_name}
                        </Link>
                      ),
                    },
                    { label: "Rent", value: formatMoney(current.monthly_rent, currency) },
                    { label: "Moved in", value: formatDay(current.move_in_date) },
                  ]}
                />
              ) : (
                <EmptyState
                  icon={Users}
                  title="No tenant"
                  description={
                    canAddTenant
                      ? "This unit is free. Add a tenant to move someone in."
                      : "Set the unit to vacant to move someone in."
                  }
                  action={
                    canAddTenant && (
                      <Button asChild>
                        <Link href={`/tenants/new?unitId=${unit.id}`}>
                          <UserPlus aria-hidden /> Add tenant
                        </Link>
                      </Button>
                    )
                  }
                />
              )}
            </CardContent>
          </Card>
          {tenancies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tenancy history</CardTitle>
              </CardHeader>
              <CardContent>
                <TenancyHistory
                  currency={currency}
                  tenancies={tenancies.map((t) => ({
                    ...t,
                    title: t.tenant.full_name,
                    href: `/tenants/${t.tenant.id}`,
                  }))}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
