import { Building2, DoorOpen, Home, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { getCurrentOrganization, requireRole } from "@/lib/dal";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [user, organization] = await Promise.all([
    requireRole("landlord"),
    getCurrentOrganization(),
  ]);
  const firstName = user.fullName.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        description={organization?.name}
      />
      <section aria-label="Property summary" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Properties" value="0" icon={Building2} />
        <StatCard label="Units" value="0" icon={DoorOpen} />
        <StatCard label="Occupied" value="0" icon={KeyRound} />
        <StatCard label="Vacant" value="0" icon={Home} />
      </section>
      <EmptyState
        icon={Building2}
        title="Let's set up your first property"
        description="Add a building and its flats, then add tenants to start tracking rent."
        action={
          <Button asChild className="h-11">
            <Link href="/properties">Go to Properties</Link>
          </Button>
        }
      />
    </>
  );
}
