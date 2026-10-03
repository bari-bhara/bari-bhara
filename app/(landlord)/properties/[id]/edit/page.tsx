import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { PropertyForm } from "@/features/properties/components/property-form";
import { getProperty } from "@/features/properties/queries";

export const metadata: Metadata = { title: "Edit property" };

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getProperty(id);
  if (!property) notFound();

  return (
    <>
      <PageHeader
        title="Edit property"
        back={{ href: `/properties/${property.id}`, label: property.name }}
      />
      <PropertyForm
        propertyId={property.id}
        cancelHref={`/properties/${property.id}`}
        defaultValues={{
          name: property.name,
          address: property.address,
          city: property.city,
          rentDueDay: String(property.rent_due_day),
          notes: property.notes,
        }}
      />
    </>
  );
}
