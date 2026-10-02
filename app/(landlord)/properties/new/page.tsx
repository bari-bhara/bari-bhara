import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { PropertyForm } from "@/features/properties/components/property-form";

export const metadata: Metadata = { title: "Add property" };

export default function NewPropertyPage() {
  return (
    <>
      <PageHeader
        title="Add property"
        description="You can add units once the property is saved."
        back={{ href: "/properties", label: "Properties" }}
      />
      <PropertyForm cancelHref="/properties" />
    </>
  );
}
