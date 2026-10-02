import { Megaphone } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Notices" };

export default function NoticesPage() {
  return (
    <>
      <PageHeader title="Notices" description="Announcements for your tenants." />
      <EmptyState
        icon={Megaphone}
        title="No notices yet"
        description="Create a notice to keep your tenants informed."
      />
    </>
  );
}
