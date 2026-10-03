import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { HomeCard } from "@/features/tenant-portal/components/home-card";
import { requireLinkedTenant } from "@/features/tenant-portal/queries";
import { requireRole } from "@/lib/dal";

export const metadata: Metadata = { title: "Dashboard" };

export default async function TenantDashboardPage() {
  const [user, tenancies] = await Promise.all([requireRole("tenant"), requireLinkedTenant()]);
  const firstName = user.fullName.split(" ")[0];
  const current = tenancies.filter((t) => t.status === "active");
  const past = tenancies.filter((t) => t.status !== "active");

  return (
    <>
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : "Hi there"}
        description={current.length > 0 ? "Your home at a glance." : "You don't have a current home with us."}
      />
      <div className="grid gap-6">
        {current.length > 0 && (
          <section aria-labelledby="home-heading" className="grid gap-4">
            <h2 id="home-heading" className="sr-only">
              Your home
            </h2>
            {current.map((tenancy) => (
              <HomeCard key={tenancy.tenancy_id} tenancy={tenancy} />
            ))}
          </section>
        )}
        {past.length > 0 && (
          <section aria-labelledby="past-heading" className="grid gap-4">
            <h2 id="past-heading" className="text-lg font-semibold">
              Previous homes
            </h2>
            {past.map((tenancy) => (
              <HomeCard key={tenancy.tenancy_id} tenancy={tenancy} />
            ))}
          </section>
        )}
        <p className="text-sm text-muted-foreground">
          Renting from another landlord too?{" "}
          <Link href="/tenant/join" className="font-medium text-foreground underline underline-offset-4">
            Enter an invite code
          </Link>
        </p>
      </div>
    </>
  );
}
