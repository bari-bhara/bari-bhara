import Link from "next/link";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { chargeHref } from "@/features/charges/components/charges-list";
import { PAYMENT_METHOD_LABELS } from "@/features/charges/schema";
import { formatDate, formatDay, formatMoney, formatMonth } from "@/lib/format";
import type { PaymentClaimOverview } from "@/types/domain";
import { reviewPaymentClaim } from "../actions";
import { RejectClaimDialog } from "./reject-claim-dialog";

/** Tenants' "already paid" claims waiting for the landlord, with approve and reject. */
export function ClaimsList({
  claims,
  currency,
  timeZone,
}: {
  claims: PaymentClaimOverview[];
  currency: string;
  timeZone?: string;
}) {
  return (
    <ul className="grid grid-cols-1 gap-2" aria-label="Payment claims">
      {claims.map((claim) => {
        const amount = formatMoney(claim.amount, currency);
        return (
          <li key={claim.id} className="surface grid gap-3 p-4 sm:flex sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold">
                {claim.tenant_name} says they paid {amount}
              </p>
              <p className="text-sm text-muted-foreground">
                <Link
                  href={chargeHref({ id: claim.charge_id, category: claim.category })}
                  className="hover:underline"
                >
                  {claim.type_label} · {formatMonth(claim.billing_month)}
                </Link>{" "}
                · {claim.property_name} · Unit {claim.unit_number}
              </p>
              <p className="text-sm text-muted-foreground">
                Paid {formatDay(claim.paid_on)} by {PAYMENT_METHOD_LABELS[claim.method]}
                {claim.reference && ` · ${claim.reference}`} · sent {formatDate(claim.created_at, timeZone)}
              </p>
              {claim.note && <p className="text-sm">“{claim.note}”</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <RejectClaimDialog claimId={claim.id} tenantName={claim.tenant_name} />
              <ConfirmDialog
                trigger={
                  <Button size="sm" aria-label={`Approve ${claim.tenant_name}'s claim`}>
                    Approve
                  </Button>
                }
                title={`Record ${amount} from ${claim.tenant_name}?`}
                description={`A ${PAYMENT_METHOD_LABELS[claim.method]} payment of ${amount} on ${formatDay(claim.paid_on)} is recorded against ${claim.type_label}, ${formatMonth(claim.billing_month)}. The tenant is told.`}
                confirmLabel="Approve and record"
                pendingLabel="Recording…"
                successMessage="Payment recorded."
                onConfirm={reviewPaymentClaim.bind(null, claim.id, { approve: true })}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
