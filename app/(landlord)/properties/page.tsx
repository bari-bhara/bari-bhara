import { Archive, Building2, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { FilterChips } from "@/components/app/filter-chips";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/features/properties/components/property-card";
import { listProperties } from "@/features/properties/queries";

export const metadata: Metadata = { title: "Properties" };

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const archived = (await searchParams).archived === "1";
  const properties = await listProperties({ archived });

  return (
    <>
      <PageHeader
        title="Properties"
        description="Buildings you manage."
        actions={
          <Button asChild>
            <Link href="/properties/new">
              <Plus aria-hidden /> Add property
            </Link>
          </Button>
        }
      />
      <div className="mb-4">
        <FilterChips
          label="Show"
          chips={[
            { label: "Active", href: "/properties", active: !archived },
            { label: "Archived", href: "/properties?archived=1", active: archived },
          ]}
        />
      </div>
      {properties.length === 0 ? (
        archived ? (
          <EmptyState
            icon={Archive}
            title="No archived properties"
            description="Properties you archive are kept here with their history."
          />
        ) : (
          <EmptyState
            icon={Building2}
            title="No properties yet"
            description="Add your first property to start managing units and tenants."
            action={
              <Button asChild>
                <Link href="/properties/new">
                  <Plus aria-hidden /> Add property
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <li key={property.id}>
              <PropertyCard property={property} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
