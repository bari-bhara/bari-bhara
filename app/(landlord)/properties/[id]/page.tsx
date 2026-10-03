import { Archive, DoorOpen, Pencil, Plus, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailList } from "@/components/app/detail-list";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyActions } from "@/features/properties/components/property-actions";
import { getProperty } from "@/features/properties/queries";
import { UnitStatusFilter } from "@/features/units/components/unit-status-filter";
import { UnitsList } from "@/features/units/components/units-list";
import { countByStatus, listUnits } from "@/features/units/queries";
import { isUnitStatus } from "@/features/units/schema";
import { getCurrentOrganization } from "@/lib/dal";
import { formatDate, ordinal } from "@/lib/format";

export const metadata: Metadata = { title: "Property" };

export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ id }, { status: statusParam }] = await Promise.all([params, searchParams]);
  const status = isUnitStatus(statusParam) ? statusParam : null;

  const [property, units, organization] = await Promise.all([
    getProperty(id),
    listUnits({ propertyId: id }),
    getCurrentOrganization(),
  ]);
  if (!property) notFound();

  const currency = organization?.currency ?? "BDT";
  const counts = countByStatus(units);
  const visibleUnits = status ? units.filter((unit) => unit.status === status) : units;
  const archived = property.archived_at !== null;
  const location = [property.address, property.city].filter(Boolean).join(", ");

  return (
    <>
      <PageHeader
        title={property.name}
        description={location || undefined}
        back={{ href: "/properties", label: "Properties" }}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/properties/${property.id}/edit`}>
                <Pencil aria-hidden /> Edit
              </Link>
            </Button>
            <PropertyActions
              propertyId={property.id}
              name={property.name}
              archived={archived}
              unitCount={units.length}
            />
          </>
        }
      />

      {archived && (
        <Alert className="mb-6">
          <Archive className="h-4 w-4" aria-hidden />
          <AlertDescription>
            Archived on {formatDate(property.archived_at!, organization?.timezone)}. It&apos;s
            hidden from your lists. Restore it to add units.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Units" value={units.length} />
        <StatCard label="Occupied" value={counts.occupied} />
        <StatCard label="Vacant" value={counts.vacant} />
        <StatCard label="Rent due" value={ordinal(property.rent_due_day)} hint="of each month" />
      </div>

      <section aria-labelledby="units-heading" className="mb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="units-heading" className="text-lg font-semibold">
            Units
          </h2>
          {!archived && (
            <Button asChild size="sm">
              <Link href={`/units/new?propertyId=${property.id}`}>
                <Plus aria-hidden /> Add unit
              </Link>
            </Button>
          )}
        </div>
        {units.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="No units yet"
            description="Add the flats or spaces in this property you rent out."
            action={
              !archived && (
                <Button asChild>
                  <Link href={`/units/new?propertyId=${property.id}`}>
                    <Plus aria-hidden /> Add unit
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <UnitStatusFilter
              basePath={`/properties/${property.id}`}
              current={status}
              counts={counts}
            />
            {visibleUnits.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No units match"
                description="No units in this property have that status."
              />
            ) : (
              <UnitsList units={visibleUnits} currency={currency} />
            )}
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList
            items={[
              { label: "Address", value: property.address || "—" },
              { label: "City", value: property.city || "—" },
              { label: "Rent due day", value: `${ordinal(property.rent_due_day)} of the month` },
              {
                label: "Notes",
                value: property.notes ? (
                  <span className="whitespace-pre-line font-normal">{property.notes}</span>
                ) : (
                  "—"
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </>
  );
}
