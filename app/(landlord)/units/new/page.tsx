import { Building2, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { listPropertyOptions } from "@/features/properties/queries";
import { UnitForm } from "@/features/units/components/unit-form";
import { EMPTY_UNIT } from "@/features/units/schema";
import { getCurrentOrganization } from "@/lib/dal";

export const metadata: Metadata = { title: "Add unit" };

export default async function NewUnitPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const [{ propertyId: propertyParam }, properties, organization] = await Promise.all([
    searchParams,
    listPropertyOptions(),
    getCurrentOrganization(),
  ]);

  // Coming from a property page fixes the property; otherwise the user picks one.
  const fixedProperty = properties.find((p) => p.id === propertyParam);
  const back = fixedProperty
    ? { href: `/properties/${fixedProperty.id}`, label: fixedProperty.name }
    : { href: "/units", label: "Units" };

  if (properties.length === 0) {
    return (
      <>
        <PageHeader title="Add unit" back={back} />
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

  return (
    <>
      <PageHeader
        title="Add unit"
        description={fixedProperty ? `In ${fixedProperty.name}` : undefined}
        back={back}
      />
      <UnitForm
        defaultValues={{
          ...EMPTY_UNIT,
          propertyId: fixedProperty?.id ?? (properties.length === 1 ? properties[0].id : ""),
        }}
        properties={fixedProperty ? undefined : properties}
        currency={organization?.currency ?? "BDT"}
        cancelHref={back.href}
      />
    </>
  );
}
