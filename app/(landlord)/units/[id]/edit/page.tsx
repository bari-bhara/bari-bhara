import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { UnitForm } from "@/features/units/components/unit-form";
import { getUnit } from "@/features/units/queries";
import { getCurrentOrganization } from "@/lib/dal";

export const metadata: Metadata = { title: "Edit unit" };

export default async function EditUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [unit, organization] = await Promise.all([getUnit(id), getCurrentOrganization()]);
  if (!unit) notFound();

  return (
    <>
      <PageHeader
        title={`Edit unit ${unit.unit_number}`}
        description={`In ${unit.property.name}`}
        back={{ href: `/units/${unit.id}`, label: `Unit ${unit.unit_number}` }}
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
        }}
      />
    </>
  );
}
