import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { DetailList } from "@/components/app/detail-list";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentOrganization } from "@/lib/dal";
import { formatDate, formatDay, formatMoney, formatMonth, todayIn } from "@/lib/format";
import type { ChargeCategory } from "@/types/domain";
import { getCharge } from "../queries";
import { PAYMENT_METHOD_LABELS } from "../schema";
import { ChargeStatusBadge } from "./charge-status-badge";
import { chargeHref } from "./charges-list";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { RemindersList } from "@/features/notifications/components/reminders-list";
import { SendReminderButton } from "@/features/notifications/components/send-reminder-button";
import { describeReach } from "@/features/notifications/labels";
import { getTenantContact, listReminders } from "@/features/notifications/queries";
import { ClaimsList } from "@/features/claims/components/claims-list";
import { listChargeClaims } from "@/features/claims/queries";
import { VoidDialog } from "./void-dialog";
import { meterSummary } from "../schema";

/** One charge with its payments and actions. Used by /rent/[id] and /bills/[id]. */
export async function ChargeDetailView({ id, category }: { id: string; category: ChargeCategory }) {
  const [charge, organization] = await Promise.all([getCharge(id), getCurrentOrganization()]);
  if (!charge) notFound();
  // Keep URLs canonical: rent lives under /rent, utilities under /bills.
  if (charge.category !== category) redirect(chargeHref(charge));
  const [reminders, contact, claims] = await Promise.all([
    listReminders({ chargeId: charge.id }),
    getTenantContact(charge.tenant_id),
    listChargeClaims(charge.id),
  ]);
  const pendingClaims = claims.filter((c) => c.status === "pending");
  const reviewedClaims = claims.filter((c) => c.status !== "pending");
  const reach = contact ? describeReach(contact) : null;

  const currency = organization?.currency ?? "BDT";
  const timezone = organization?.timezone;
  const isVoid = charge.status === "void";
  const livePayments = charge.payments.filter((p) => p.voided_at === null);
  const title = `${charge.type_label} · ${formatMonth(charge.billing_month)}`;
  const back =
    category === "rent"
      ? { href: `/rent?month=${charge.billing_month.slice(0, 7)}`, label: "Rent" }
      : { href: `/bills?month=${charge.billing_month.slice(0, 7)}`, label: "Utility bills" };

  return (
    <>
      <PageHeader
        title={title}
        description={`${charge.tenant_name} · ${charge.property_name} · Unit ${charge.unit_number}`}
        back={back}
        actions={
          !isVoid && (
            <>
              {charge.outstanding > 0 && (
                <RecordPaymentDialog
                  chargeId={charge.id}
                  outstanding={charge.outstanding}
                  outstandingLabel={formatMoney(charge.outstanding, currency)}
                  currency={currency}
                  today={todayIn(timezone)}
                />
              )}
              {charge.outstanding > 0 && reach && (
                <SendReminderButton chargeId={charge.id} tenantName={charge.tenant_name} reach={reach} />
              )}
              {livePayments.length === 0 && <VoidDialog kind="charge" id={charge.id} />}
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Charge</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: "Status", value: <ChargeStatusBadge status={charge.effective_status} /> },
                { label: "Amount", value: formatMoney(charge.amount, currency) },
                { label: "Paid", value: formatMoney(charge.amount_paid, currency) },
                { label: "Outstanding", value: formatMoney(charge.outstanding, currency) },
                { label: "Due", value: formatDay(charge.due_date) },
                {
                  label: "Tenant",
                  value: (
                    <Link href={`/tenants/${charge.tenant_id}`} className="hover:underline">
                      {charge.tenant_name}
                    </Link>
                  ),
                },
                ...(charge.meter_current !== null && charge.meter_previous !== null && charge.unit_rate !== null
                  ? [{ label: "Meter", value: meterSummary(charge, currency) }]
                  : []),
                ...(charge.description ? [{ label: "Description", value: charge.description }] : []),
                ...(isVoid && charge.voided_at
                  ? [
                      {
                        label: "Voided",
                        value: `${formatDate(charge.voided_at, timezone)}${charge.void_reason ? `: ${charge.void_reason}` : ""}`,
                      },
                    ]
                  : []),
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {charge.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <ol className="divide-y" aria-label="Payments">
                {charge.payments.map((payment) => {
                  const voided = payment.voided_at !== null;
                  const amount = formatMoney(payment.amount, currency);
                  return (
                    <li key={payment.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className={voided ? "text-muted-foreground" : undefined}>
                        <p className={`font-medium tabular-nums ${voided ? "line-through" : ""}`}>
                          {amount}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDay(payment.paid_on)} · {PAYMENT_METHOD_LABELS[payment.method]}
                          {payment.reference && ` · ${payment.reference}`}
                        </p>
                        {voided && (
                          <p className="text-sm text-muted-foreground">
                            Void{payment.void_reason ? `: ${payment.void_reason}` : ""}
                          </p>
                        )}
                      </div>
                      {!voided && (
                        <VoidDialog
                          kind="payment"
                          id={payment.id}
                          triggerLabel={`Void payment of ${amount}`}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        {claims.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tenant says they paid</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {pendingClaims.length > 0 && (
                <ClaimsList claims={pendingClaims} currency={currency} timeZone={timezone} />
              )}
              {reviewedClaims.length > 0 && (
                <ul className="grid gap-1 text-sm text-muted-foreground" aria-label="Reviewed claims">
                  {reviewedClaims.map((claim) => (
                    <li key={claim.id}>
                      {formatMoney(claim.amount, currency)} on {formatDay(claim.paid_on)}:{" "}
                      {claim.status === "approved" ? "approved" : `rejected${claim.review_note ? ` (${claim.review_note})` : ""}`}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Reminders</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!reach && (
              <p className="text-sm text-muted-foreground">
                {charge.tenant_name} has no app login or email address, so reminders can&apos;t reach them.
              </p>
            )}
            <RemindersList reminders={reminders} timeZone={timezone} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
