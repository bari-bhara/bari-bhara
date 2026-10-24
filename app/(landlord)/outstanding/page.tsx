import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { ChargeStatusBadge } from "@/features/charges/components/charge-status-badge";
import { chargeHref } from "@/features/charges/components/charges-list";
import { listOutstanding } from "@/features/charges/queries";
import { getCurrentOrganization } from "@/lib/dal";
import { formatDay, formatMoney, formatMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Outstanding" };

export default async function OutstandingPage() {
  const [{ tenants, outstanding, overdue }, organization] = await Promise.all([
    listOutstanding(),
    getCurrentOrganization(),
  ]);
  const currency = organization?.currency ?? "BDT";

  return (
    <>
      <PageHeader
        title="Outstanding"
        description="Everything your tenants still owe, overdue first."
        back={{ href: "/dashboard", label: "Dashboard" }}
      />
      {tenants.length === 0 ? (
        <EmptyState icon={CircleCheck} title="Nothing outstanding" description="Every charge is paid." />
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Outstanding" value={formatMoney(outstanding, currency)} />
            <StatCard label="Overdue" value={formatMoney(overdue, currency)} />
            <StatCard label="Tenants owing" value={tenants.length} />
          </div>
          <ul className="grid grid-cols-1 gap-3" aria-label="Tenants owing">
            {tenants.map((tenant) => (
              <li key={tenant.tenantId} className="surface grid gap-3 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/tenants/${tenant.tenantId}`} className="font-semibold hover:underline">
                      {tenant.tenantName}
                    </Link>
                    <p className="text-sm text-muted-foreground">{tenant.homes.join(", ")}</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-semibold">{formatMoney(tenant.outstanding, currency)}</p>
                    {tenant.overdue > 0 && (
                      <p className="text-sm text-destructive">{formatMoney(tenant.overdue, currency)} overdue</p>
                    )}
                  </div>
                </div>
                <ul className="divide-y rounded-xl border">
                  {tenant.charges.map((charge) => (
                    <li key={charge.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                      <span className="flex flex-wrap items-center gap-2">
                        <Link href={chargeHref(charge)} className="hover:underline">
                          {charge.type_label} · {formatMonth(charge.billing_month)}
                        </Link>
                        <ChargeStatusBadge status={charge.effective_status} />
                      </span>
                      <span className="text-muted-foreground">
                        Due {formatDay(charge.due_date)} ·{" "}
                        <span className="font-medium text-foreground tabular-nums">
                          {formatMoney(charge.outstanding, currency)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
