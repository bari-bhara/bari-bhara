import { DoorOpen } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Units" };

export default function UnitsPage() {
  return (
    <>
      <PageHeader title="Units" description="Flats across all your properties." />
      <EmptyState
        icon={DoorOpen}
        title="No units yet"
        description="Units appear here once you add them to a property."
      />
    </>
  );
}
