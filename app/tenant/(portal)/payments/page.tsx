import { CreditCard } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { PAYMENT_METHOD_LABELS } from "@/features/charges/schema";
import { getMyPayments, getMyTenancies } from "@/features/tenant-portal/queries";
import { formatDay, formatMoney, formatMonth } from "@/lib/format";
import { PAGE_SIZE, parsePage, withPage } from "@/lib/pagination";

export const metadata: Metadata = { title: "Payments" };

export default async function TenantPaymentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = parsePage((await searchParams).page);
  const [{ rows: payments, total }, tenancies] = await Promise.all([getMyPayments(page), getMyTenancies()]);
  const currency = tenancies[0]?.currency ?? "BDT";

  return (
    <>
      <PageHeader title="Payments" description="Payments your landlord has recorded." />
      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
          description="Payments your landlord records will appear here."
        />
      ) : (
        <div className="grid max-w-3xl gap-4">
          <Card>
            <CardContent className="pt-6">
              <ul className="divide-y" aria-label="Payments">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {payment.charge.charge_type.label} · {formatMonth(payment.charge.billing_month)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDay(payment.paid_on)} · {PAYMENT_METHOD_LABELS[payment.method]}
                        {payment.reference && ` · ${payment.reference}`}
                      </p>
                    </div>
                    <p className="shrink-0 font-medium tabular-nums">
                      {formatMoney(payment.amount, currency)}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={(p) => withPage("/tenant/payments", p)} />
        </div>
      )}
    </>
  );
}
