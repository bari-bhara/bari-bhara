import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "My Rent" };

export default function TenantRentPage() {
  return (
    <>
      <PageHeader title="My Rent" description="Your rent and bills." />
      <EmptyState
        icon={Receipt}
        title="Nothing due"
        description="Your rent and bills will appear here once your landlord adds them."
      />
    </>
  );
}
