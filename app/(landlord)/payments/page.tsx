import { ChevronRight, CreditCard } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { FilterChips } from "@/components/app/filter-chips";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { chargeHref } from "@/features/charges/components/charges-list";
import { PAYMENTS_PAGE_SIZE, listPayments } from "@/features/charges/queries";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  isPaymentMethod,
} from "@/features/charges/schema";
import { getCurrentOrganization } from "@/lib/dal";
import { formatDay, formatMoney, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentOverview } from "@/types/domain";

export const metadata: Metadata = { title: "Payments" };

type Params = { method?: string; voided?: string; page?: string };

function forWhat(payment: PaymentOverview) {
  return `${payment.type_label} · ${formatMonth(payment.billing_month)}`;
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const method = isPaymentMethod(params.method) ? params.method : null;
  const includeVoided = params.voided === "1";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [{ payments, total }, organization] = await Promise.all([
    listPayments({ method, includeVoided, page }),
    getCurrentOrganization(),
  ]);
  const currency = organization?.currency ?? "BDT";

  const href = (changes: Partial<Record<keyof Params, string | null>>) => {
    const next = { method, voided: includeVoided ? "1" : null, page: null, ...changes };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) query.set(key, value);
    const search = query.toString();
    return search ? `/payments?${search}` : "/payments";
  };

  return (
    <>
      <PageHeader title="Payments" description="Every payment you've recorded, newest first." />
      <div className="mb-4 grid grid-cols-1 gap-3">
        <FilterChips
          label="Filter by method"
          chips={[
            { label: "All methods", href: href({ method: null }), active: !method },
            ...PAYMENT_METHODS.map((m) => ({
              label: PAYMENT_METHOD_LABELS[m],
              href: href({ method: m }),
              active: method === m,
            })),
          ]}
        />
        <FilterChips
          label="Voided payments"
          chips={[
            { label: "Hide voided", href: href({ voided: null }), active: !includeVoided },
            { label: "Show voided", href: href({ voided: "1" }), active: includeVoided },
          ]}
        />
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={method ? "No payments match" : "No payments yet"}
          description="Record payments from a rent charge or bill."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <ul className="grid grid-cols-1 gap-2 md:hidden">
            {payments.map((payment) => (
              <li key={payment.id}>
                <Link
                  href={chargeHref({ id: payment.charge_id, category: payment.category })}
                  className="flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{payment.tenant_name}</p>
                    <p className="truncate text-sm text-muted-foreground">{forWhat(payment)}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {formatDay(payment.paid_on)} · {PAYMENT_METHOD_LABELS[payment.method]}
                      {payment.voided_at && " · Void"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-medium tabular-nums",
                      payment.voided_at && "text-muted-foreground line-through",
                    )}
                  >
                    {formatMoney(payment.amount, currency)}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden rounded-lg border bg-background md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>For</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} className={payment.voided_at ? "text-muted-foreground" : undefined}>
                    <TableCell className="whitespace-nowrap">{formatDay(payment.paid_on)}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/tenants/${payment.tenant_id}`} className="hover:underline">
                        {payment.tenant_name}
                      </Link>
                      <div className="text-xs font-normal text-muted-foreground">
                        {payment.property_name} · Unit {payment.unit_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={chargeHref({ id: payment.charge_id, category: payment.category })}
                        className="hover:underline"
                      >
                        {forWhat(payment)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {PAYMENT_METHOD_LABELS[payment.method]}
                      {payment.reference && (
                        <div className="text-xs text-muted-foreground">{payment.reference}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={payment.voided_at ? "line-through" : undefined}>
                        {formatMoney(payment.amount, currency)}
                      </span>
                      {payment.voided_at && <div className="text-xs">Void</div>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            pageSize={PAYMENTS_PAGE_SIZE}
            total={total}
            href={(p) => {
              const base = href({});
              return p === 1 ? base : `${base}${base.includes("?") ? "&" : "?"}page=${p}`;
            }}
          />
        </div>
      )}
    </>
  );
}
