import { Bell } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Notices" };

export default function TenantNoticesPage() {
  return (
    <>
      <PageHeader title="Notices" description="Announcements from your landlord." />
      <EmptyState
        icon={Bell}
        title="No notices"
        description="Notices from your landlord will appear here."
      />
    </>
  );
}
