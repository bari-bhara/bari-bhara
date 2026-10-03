import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { ChargeStatusBadge } from "@/features/charges/components/charge-status-badge";
import {
  getMyOpenCharges,
  getMyPaidCharges,
  getMyTenancies,
  type MyCharge,
} from "@/features/tenant-portal/queries";
import { formatDay, formatMoney, formatMonth } from "@/lib/format";
import { PAGE_SIZE, parsePage, withPage } from "@/lib/pagination";

export const metadata: Metadata = { title: "My Rent" };

const OPEN_ORDER = { overdue: 0, unpaid: 1, partially_paid: 2 } as Record<string, number>;

function ChargeRow({ charge, currency }: { charge: MyCharge; currency: string }) {
  const open = charge.outstanding > 0;
  return (
    <li className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {charge.type_label} · {formatMonth(charge.billing_month)}
          <ChargeStatusBadge status={charge.effective_status} />
        </p>
        <p className="text-sm text-muted-foreground">
          {open ? `Due ${formatDay(charge.due_date)}` : `Was due ${formatDay(charge.due_date)}`}
          {charge.home && ` · ${charge.home}`}
        </p>
        {charge.description && <p className="text-sm text-muted-foreground">{charge.description}</p>}
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <p className="font-medium">{formatMoney(open ? charge.outstanding : charge.amount, currency)}</p>
        {open && charge.amount_paid > 0 && (
          <p className="text-xs text-muted-foreground">of {formatMoney(charge.amount, currency)}</p>
        )}
      </div>
    </li>
  );
}

/** Open charges are all shown; `?page=` pages through the paid history. */
export default async function TenantRentPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = parsePage((await searchParams).page);
  const [openCharges, { rows: settled, total: settledTotal }, tenancies] = await Promise.all([
    getMyOpenCharges(),
    getMyPaidCharges(page),
    getMyTenancies(),
  ]);
  const currency = tenancies[0]?.currency ?? "BDT";

  const open = openCharges.sort(
    (a, b) =>
      OPEN_ORDER[a.effective_status] - OPEN_ORDER[b.effective_status] ||
      a.due_date.localeCompare(b.due_date),
  );
  const owed = open.reduce((sum, c) => sum + c.outstanding, 0);
  const overdue = open
    .filter((c) => c.effective_status === "overdue")
    .reduce((sum, c) => sum + c.outstanding, 0);

  return (
    <>
      <PageHeader title="My Rent" description="Your rent and bills." />
      {open.length === 0 && settledTotal === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nothing due"
          description="Your rent and bills will appear here once your landlord adds them."
        />
      ) : (
        <div className="grid max-w-3xl grid-cols-1 gap-6">
          <Card>
            <CardContent className="grid gap-1 pt-6">
              <p className="text-sm text-muted-foreground">You owe</p>
              <p className="text-3xl font-semibold tabular-nums">{formatMoney(owed, currency)}</p>
              <p className={overdue > 0 ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
                {overdue > 0 ? `${formatMoney(overdue, currency)} is overdue` : "Nothing overdue"}
              </p>
            </CardContent>
          </Card>
          {open.length > 0 && (
            <section aria-labelledby="due-heading" className="grid gap-3">
              <h2 id="due-heading" className="text-lg font-semibold">
                To pay
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <ul className="divide-y">
                    {open.map((charge) => (
                      <ChargeRow key={charge.id} charge={charge} currency={currency} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          )}
          {settled.length > 0 && (
            <section aria-labelledby="paid-heading" className="grid gap-3">
              <h2 id="paid-heading" className="text-lg font-semibold">
                Paid
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <ul className="divide-y">
                    {settled.map((charge) => (
                      <ChargeRow key={charge.id} charge={charge} currency={currency} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={settledTotal}
                href={(p) => withPage("/tenant/rent", p)}
              />
            </section>
          )}
        </div>
      )}
    </>
  );
}
