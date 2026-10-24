import { CalendarClock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { getRentTypeId } from "@/features/charges/queries";
import { listUnitTenancies } from "@/features/tenants/queries";
import { ScheduleChargeDialog } from "@/features/units/components/schedule-charge-dialog";
import { UnitForm } from "@/features/units/components/unit-form";
import { getUnit, getUnitSchedule } from "@/features/units/queries";
import { getCurrentOrganization } from "@/lib/dal";
import { shiftMonth, todayIn } from "@/lib/format";

export const metadata: Metadata = { title: "Edit unit" };

export default async function EditUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organization = await getCurrentOrganization();
  const thisMonth = todayIn(organization?.timezone).slice(0, 7);
  const [unit, tenancies, schedule, rentTypeId] = await Promise.all([
    getUnit(id),
    listUnitTenancies(id),
    getUnitSchedule(id, thisMonth),
    getRentTypeId(),
  ]);
  if (!unit) notFound();
  const current = tenancies.find((t) => t.status === "active");
  const rent = schedule.find((line) => line.isRent);

  return (
    <>
      <PageHeader
        title={`Edit unit ${unit.unit_number}`}
        description={`In ${unit.property.name}`}
        back={{ href: `/units/${unit.id}`, label: `Unit ${unit.unit_number}` }}
        actions={
          <ScheduleChargeDialog
            unitId={unit.id}
            title="Change rent"
            description="Set a new monthly rent from a future month. Rent already billed doesn't change."
            rentTypeId={rentTypeId}
            currentAmount={rent?.current || current?.monthly_rent || unit.default_rent}
            currency={organization?.currency ?? "BDT"}
            firstMonth={shiftMonth(thisMonth, 1)}
            hasTenant={current !== undefined}
            trigger={
              <Button variant="outline">
                <CalendarClock aria-hidden /> Change rent
              </Button>
            }
          />
        }
      />
      <UnitForm
        unitId={unit.id}
        currency={organization?.currency ?? "BDT"}
        cancelHref={`/units/${unit.id}`}
        defaultValues={{
          propertyId: unit.property_id,
          unitNumber: unit.unit_number,
          floor: unit.floor,
          unitType: unit.unit_type,
          bedrooms: unit.bedrooms === null ? "" : String(unit.bedrooms),
          defaultRent: String(unit.default_rent),
          status: unit.status,
          notes: unit.notes,
          electricityAccountNo: unit.electricity_account_no,
          electricityMeterNo: unit.electricity_meter_no,
          gasMeterNo: unit.gas_meter_no,
        }}
      />
    </>
  );
}
