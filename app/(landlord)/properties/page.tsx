import { Archive, Building2, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { FilterChips } from "@/components/app/filter-chips";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/features/properties/components/property-card";
import { PropertiesTable } from "@/features/properties/components/properties-table";
import { listProperties } from "@/features/properties/queries";

export const metadata: Metadata = { title: "Properties" };

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string; view?: string }>;
}) {
  const params = await searchParams;
  const archived = params.archived === "1";
  const view = params.view === "list" ? "list" : "grid";
  const properties = await listProperties({ archived });

  const href = (changes: { archived?: boolean; view?: "grid" | "list" }) => {
    const query = new URLSearchParams();
    if (changes.archived ?? archived) query.set("archived", "1");
    if ((changes.view ?? view) === "list") query.set("view", "list");
    const search = query.toString();
    return search ? `/properties?${search}` : "/properties";
  };

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label="Show"
          chips={[
            { label: "Active", href: href({ archived: false }), active: !archived },
            { label: "Archived", href: href({ archived: true }), active: archived },
          ]}
        />
        <FilterChips
          label="View"
          chips={[
            { label: "Grid", href: href({ view: "grid" }), active: view === "grid" },
            { label: "List", href: href({ view: "list" }), active: view === "list" },
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
      ) : view === "list" ? (
        <PropertiesTable properties={properties} />
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
