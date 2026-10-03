import { Building2, DoorOpen, Plus, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { FilterChips } from "@/components/app/filter-chips";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { listPropertyOptions } from "@/features/properties/queries";
import { UnitStatusFilter } from "@/features/units/components/unit-status-filter";
import { UnitsList } from "@/features/units/components/units-list";
import { countByStatus, listUnits } from "@/features/units/queries";
import { isUnitStatus } from "@/features/units/schema";
import { getCurrentOrganization } from "@/lib/dal";

export const metadata: Metadata = { title: "Units" };

export default async function UnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; property?: string }>;
}) {
  const { status: statusParam, property: propertyParam } = await searchParams;
  const status = isUnitStatus(statusParam) ? statusParam : null;

  const [allUnits, properties, organization] = await Promise.all([
    listUnits(),
    listPropertyOptions(),
    getCurrentOrganization(),
  ]);
  const currency = organization?.currency ?? "BDT";

  const propertyId = properties.some((p) => p.id === propertyParam) ? propertyParam! : null;
  const inProperty = propertyId
    ? allUnits.filter((unit) => unit.property_id === propertyId)
    : allUnits;
  const visibleUnits = status ? inProperty.filter((unit) => unit.status === status) : inProperty;

  const addUnitHref = propertyId ? `/units/new?propertyId=${propertyId}` : "/units/new";
  const addUnit = (
    <Button asChild>
      <Link href={addUnitHref}>
        <Plus aria-hidden /> Add unit
      </Link>
    </Button>
  );

  if (properties.length === 0) {
    return (
      <>
        <PageHeader title="Units" description="Flats across all your properties." />
        <EmptyState
          icon={Building2}
          title="Add a property first"
          description="Units belong to a property. Add one, then add its units."
          action={
            <Button asChild>
              <Link href="/properties/new">
                <Plus aria-hidden /> Add property
              </Link>
            </Button>
          }
        />
      </>
    );
  }

  const statusParams: Record<string, string> = propertyId ? { property: propertyId } : {};
  const propertyHref = (id: string | null) => {
    const query = new URLSearchParams();
    if (id) query.set("property", id);
    if (status) query.set("status", status);
    const search = query.toString();
    return search ? `/units?${search}` : "/units";
  };

  return (
    <>
      <PageHeader
        title="Units"
        description="Flats across all your properties."
        actions={addUnit}
      />
      {allUnits.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No units yet"
          description="Add the flats or spaces you rent out."
          action={addUnit}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {properties.length > 1 && (
            <FilterChips
              label="Filter by property"
              chips={[
                { label: "All properties", href: propertyHref(null), active: propertyId === null },
                ...properties.map((property) => ({
                  label: property.name,
                  href: propertyHref(property.id),
                  active: propertyId === property.id,
                })),
              ]}
            />
          )}
          <UnitStatusFilter
            basePath="/units"
            params={statusParams}
            current={status}
            counts={countByStatus(inProperty)}
          />
          {visibleUnits.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No units match"
              description="Try a different status or property."
            />
          ) : (
            <UnitsList units={visibleUnits} currency={currency} showProperty={!propertyId} />
          )}
        </div>
      )}
    </>
  );
}
