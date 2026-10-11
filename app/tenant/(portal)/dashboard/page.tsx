import { Bell, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HeroPanel } from "@/components/app/hero-panel";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { getTenantDashboard } from "@/features/dashboard/queries";
import { HomeCard } from "@/features/tenant-portal/components/home-card";
import { requireLinkedTenant } from "@/features/tenant-portal/queries";
import { requireRole } from "@/lib/dal";
import { formatDay, formatMoney, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

function CountLink({
  href,
  icon: Icon,
  count,
  one,
  many,
  none,
}: {
  href: string;
  icon: typeof Bell;
  count: number;
  one: string;
  many: string;
  none: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "surface-interactive flex items-center gap-3 p-4 text-sm",
        count > 0 && "border-primary/40 font-medium",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      {count === 0 ? none : `${count} ${count === 1 ? one : many}`}
      {count > 0 && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
    </Link>
  );
}

export default async function TenantDashboardPage() {
  const [user, tenancies, data] = await Promise.all([
    requireRole("tenant"),
    requireLinkedTenant(),
    getTenantDashboard(),
  ]);
  const firstName = user.fullName.split(" ")[0];
  const currency = tenancies[0]?.currency ?? "BDT";
  const current = tenancies.filter((t) => t.status === "active");
  const past = tenancies.filter((t) => t.status !== "active");

  return (
    <>
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : "Hi there"}
        description={current.length > 0 ? "Your home at a glance." : "You don't have a current home with us."}
      />
      <div className="grid grid-cols-1 gap-6">
        <section aria-label="Balance" className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <HeroPanel
            label="You owe"
            value={formatMoney(data.owed, currency)}
            hint={
              <span className={cn(data.overdue > 0 && "font-medium text-destructive")}>
                {data.overdue > 0 ? `${formatMoney(data.overdue, currency)} is overdue` : "Nothing overdue"}
              </span>
            }
          >
            <div className="mt-4">
              <Button asChild variant="brand">
                <Link href="/tenant/rent">See rent and bills</Link>
              </Button>
            </div>
          </HeroPanel>
          <div className="grid content-start gap-3">
            <div className="surface grid gap-1 p-5 text-sm">
              {data.next_due ? (
                <>
                  <p className="text-muted-foreground">Next to pay</p>
                  <p className="font-display text-lg font-normal">
                    {data.next_due.type_label} · {formatMonth(data.next_due.billing_month)}
                  </p>
                  <p className="tabular-nums">
                    {formatMoney(data.next_due.outstanding, currency)} · due {formatDay(data.next_due.due_date)}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">You&apos;re all paid up.</p>
              )}
              {data.last_payment && (
                <p className="mt-2 border-t pt-3 text-muted-foreground">
                  Last payment: {formatMoney(data.last_payment.amount, currency)} on {formatDay(data.last_payment.paid_on)}
                </p>
              )}
            </div>
            <CountLink
              href="/tenant/notices"
              icon={Bell}
              count={data.unread_notices}
              one="unread notice"
              many="unread notices"
              none="No unread notices"
            />
            <CountLink
              href="/tenant/maintenance"
              icon={Wrench}
              count={data.open_requests}
              one="open maintenance request"
              many="open maintenance requests"
              none="No open maintenance requests"
            />
          </div>
        </section>

        {current.length > 0 && (
          <section aria-labelledby="home-heading" className="grid gap-4">
            <h2 id="home-heading" className="font-display text-xl font-normal">
              Your home
            </h2>
            {current.map((tenancy) => (
              <HomeCard key={tenancy.tenancy_id} tenancy={tenancy} />
            ))}
          </section>
        )}
        {past.length > 0 && (
          <section aria-labelledby="past-heading" className="grid gap-4">
            <h2 id="past-heading" className="font-display text-xl font-normal">
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
