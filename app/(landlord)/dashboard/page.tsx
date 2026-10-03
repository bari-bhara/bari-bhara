import { AlertTriangle, Building2, CircleCheck, DoorOpen, UserPlus, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { describeActivity } from "@/features/dashboard/activity";
import { getLandlordDashboard } from "@/features/dashboard/queries";
import { MaintenanceStatusBadge } from "@/features/maintenance/components/maintenance-status-badge";
import { getCurrentOrganization, requireRole } from "@/lib/dal";
import { formatDate, formatDay, formatMoney, formatMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

function ListCard({
  title,
  href,
  linkLabel,
  empty,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  empty: string | null;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <Link href={href} className="text-sm text-muted-foreground hover:text-foreground">
          {linkLabel}
        </Link>
      </CardHeader>
      <CardContent>{empty ? <p className="text-sm text-muted-foreground">{empty}</p> : children}</CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [user, organization, data] = await Promise.all([
    requireRole("landlord"),
    getCurrentOrganization(),
    getLandlordDashboard(),
  ]);
  const firstName = user.fullName.split(" ")[0];
  const currency = organization?.currency ?? "BDT";
  const timezone = organization?.timezone;
  const header = (
    <PageHeader title={firstName ? `Welcome, ${firstName}` : "Welcome"} description={organization?.name} />
  );

  if (!data || data.properties === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={Building2}
          title="Let's set up your first property"
          description="Add a building and its flats, then add tenants to start tracking rent."
          action={
            <Button asChild className="h-11">
              <Link href="/properties/new">Add a property</Link>
            </Button>
          }
        />
      </>
    );
  }

  const percent = data.month_billed > 0 ? Math.round((data.month_collected / data.month_billed) * 100) : null;
  const occupancy = data.units.total > 0 ? Math.round((data.units.occupied / data.units.total) * 100) : 0;

  return (
    <>
      {header}
      <section aria-label="This month at a glance" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={`Collected in ${formatMonth(data.month).split(" ")[0]}`}
          value={formatMoney(data.month_collected, currency)}
          hint={
            percent === null
              ? "No charges billed yet"
              : `${percent}% of ${formatMoney(data.month_billed, currency)} billed`
          }
          icon={CircleCheck}
        />
        <StatCard
          label="Outstanding"
          value={formatMoney(data.outstanding, currency)}
          hint={
            data.overdue.count > 0
              ? `${formatMoney(data.overdue.amount, currency)} overdue`
              : "Nothing overdue"
          }
          icon={AlertTriangle}
        />
        <StatCard
          label="Occupancy"
          value={`${occupancy}%`}
          hint={`${data.units.occupied} of ${data.units.total} units · ${data.units.vacant} vacant`}
          icon={DoorOpen}
        />
        <StatCard
          label="Open maintenance"
          value={data.maintenance.open}
          hint={`${data.maintenance.pending} waiting for you`}
          icon={Wrench}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ListCard
          title="Overdue"
          href="/rent"
          linkLabel="Rent & bills"
          empty={data.overdue_tenants.length === 0 ? "Everyone is up to date." : null}
        >
          <ul className="divide-y" aria-label="Overdue tenants">
            {data.overdue_tenants.map((row) => (
              <li key={`${row.tenant_id}-${row.unit_number}`} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/tenants/${row.tenant_id}`} className="font-medium hover:underline">
                    {row.full_name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.property_name} · Unit {row.unit_number} · since {formatDay(row.oldest_due)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-destructive">
                  {formatMoney(row.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        </ListCard>

        <ListCard
          title="Open maintenance"
          href="/maintenance"
          linkLabel="All requests"
          empty={data.open_requests.length === 0 ? "No open requests." : null}
        >
          <ul className="divide-y" aria-label="Open maintenance">
            {data.open_requests.map((request) => (
              <li key={request.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/maintenance/${request.id}`} className="font-medium hover:underline">
                    {request.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {request.property_name} · Unit {request.unit_number} · {formatDate(request.created_at, timezone)}
                  </p>
                </div>
                <MaintenanceStatusBadge status={request.status} />
              </li>
            ))}
          </ul>
        </ListCard>

        <ListCard
          title="Vacant units"
          href="/units?status=vacant"
          linkLabel="All units"
          empty={data.vacant_units.length === 0 ? "Every unit is occupied or unavailable." : null}
        >
          <ul className="divide-y" aria-label="Vacant units">
            {data.vacant_units.map((unit) => (
              <li key={unit.unit_id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <Link href={`/units/${unit.unit_id}`} className="font-medium hover:underline">
                    {unit.property_name} · Unit {unit.unit_number}
                  </Link>
                  <p className="text-xs text-muted-foreground">{formatMoney(unit.default_rent, currency)}/month</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/tenants/new?unitId=${unit.unit_id}`} aria-label={`Add tenant to ${unit.property_name} unit ${unit.unit_number}`}>
                    <UserPlus aria-hidden /> Add tenant
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </ListCard>

        <ListCard
          title="Recent activity"
          href="/tenants"
          linkLabel="Tenants"
          empty={data.activity.length === 0 ? "Nothing yet." : null}
        >
          <ol className="divide-y" aria-label="Recent activity">
            {data.activity.map((entry) => {
              const line = describeActivity(entry, currency);
              return (
                <li key={entry.id} className="grid gap-0.5 py-2.5">
                  {line.href ? (
                    <Link href={line.href} className="text-sm font-medium hover:underline">
                      {line.text}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">{line.text}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {[line.detail, formatDate(entry.created_at, timezone)].filter(Boolean).join(" · ")}
                  </span>
                </li>
              );
            })}
          </ol>
        </ListCard>
      </div>
    </>
  );
}
