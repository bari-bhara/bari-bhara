import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { requireRole } from "@/lib/dal";

export const metadata: Metadata = { title: "Dashboard" };

export default async function TenantDashboardPage() {
  const user = await requireRole("tenant");
  const firstName = user.fullName.split(" ")[0];

  return (
    <>
      <PageHeader title={firstName ? `Hi, ${firstName}` : "Hi there"} />
      <EmptyState
        icon={KeyRound}
        title="Connect to your home"
        description="Ask your landlord for an invite code. Once you're connected, your rent, payments and notices will show up here."
      />
    </>
  );
}
