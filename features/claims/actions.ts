"use server";

import { refresh } from "next/cache";
import { GENERIC_ERROR, fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getCurrentOrganization, requireRole } from "@/lib/dal";
import { formatMonth, todayIn } from "@/lib/format";
import { deliver } from "@/lib/notifications/dispatch";
import { providerFor } from "@/lib/notifications/providers";
import { channelsFor } from "@/lib/notifications/recipients";
import { paymentClaimReviewed, paymentClaimSubmitted } from "@/lib/notifications/templates";
import {
  DB_CHARGE_VOID,
  DB_CLAIM_ALREADY_PENDING,
  DB_CLAIM_ALREADY_REVIEWED,
  DB_NOT_FOUND,
  DB_OVERPAYMENT,
  DB_PAYMENT_IN_FUTURE,
} from "@/lib/postgres-errors";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { id as idSchema } from "@/lib/zod-fields";
import { PAYMENT_METHOD_LABELS } from "@/features/charges/schema";
import { getMyTenancies, homeLabel } from "@/features/tenant-portal/queries";
import type { ChargeBalance, PaymentClaimOverview } from "@/types/domain";
import { claimSchema, rejectSchema, type ClaimFormValues, type RejectInput } from "./schema";

const CHARGE_NOT_FOUND = "This charge no longer exists.";

/**
 * The tenant says they already paid a charge. The landlord's team gets an
 * email; the claim waits on their Rent & Bills page until they review it.
 */
export async function submitPaymentClaim(
  chargeId: string,
  input: ClaimFormValues,
): Promise<ActionResult> {
  await requireRole("tenant");
  if (!idSchema.safeParse(chargeId).success) return fail(CHARGE_NOT_FOUND);
  const parsed = claimSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const claim = parsed.data;

  const supabase = await createClient();
  const [{ data: chargeRow, error: chargeError }, tenancies] = await Promise.all([
    supabase.from("charge_balances").select("*").eq("id", chargeId).maybeSingle(),
    getMyTenancies(),
  ]);
  if (chargeError) {
    console.error("Load charge for claim failed", chargeError);
    return fail(GENERIC_ERROR);
  }
  if (!chargeRow) return fail(CHARGE_NOT_FOUND);
  const charge = chargeRow as ChargeBalance;
  const tenancy = tenancies.find((t) => t.tenancy_id === charge.tenancy_id);
  if (tenancy && claim.paidOn > todayIn(tenancy.timezone)) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: { paidOn: ["The payment date can't be in the future."] },
    };
  }

  const { data: claimId, error } = await supabase.rpc("submit_payment_claim", {
    p_charge_id: chargeId,
    p_amount: claim.amount,
    p_paid_on: claim.paidOn,
    p_method: claim.method,
    p_reference: claim.reference,
    p_note: claim.note,
  });
  if (error) {
    switch (error.code) {
      case DB_CLAIM_ALREADY_PENDING:
        return fail("You've already told your landlord about a payment for this. They'll review it soon.");
      case DB_OVERPAYMENT:
        return fail("That's more than the amount due.");
      case DB_PAYMENT_IN_FUTURE:
        return fail("The payment date can't be in the future.");
      case DB_CHARGE_VOID:
      case DB_NOT_FOUND:
        return fail(CHARGE_NOT_FOUND);
    }
    console.error("Submit payment claim failed", error);
    return fail(GENERIC_ERROR);
  }

  // Email the landlord's team. A failure here doesn't undo the claim: it's
  // waiting on their Rent & Bills page either way.
  const { data: recipients, error: recipientsError } = await supabase.rpc("payment_claim_recipients", {
    p_claim_id: claimId,
  });
  const email = providerFor("email");
  if (recipientsError) console.error("Load claim recipients failed", recipientsError);
  if (email && recipients && recipients.length > 0 && tenancy) {
    const user = await requireRole("tenant");
    const content = paymentClaimSubmitted({
      tenantName: user.fullName || user.email,
      home: homeLabel(tenancy),
      charge: `${charge.type_label}, ${formatMonth(charge.billing_month)}`,
      amount: claim.amount,
      currency: tenancy.currency,
      paidOn: claim.paidOn,
      method: PAYMENT_METHOD_LABELS[claim.method],
      note: claim.note,
      link: `${getSiteUrl()}/rent/claims`,
    });
    await Promise.all(
      recipients.map(async (r) => {
        try {
          const result = await email.send({ recipientEmail: r.email, ...content });
          if (!result.ok) console.error(`Claim email to a landlord failed: ${result.error}`);
        } catch (cause) {
          console.error("Claim email to a landlord failed", cause);
        }
      }),
    );
  }
  refresh();
  return ok();
}

/** The landlord approves a claim (recording the payment) or rejects it with a reason. */
export async function reviewPaymentClaim(
  claimId: string,
  decision: { approve: true } | ({ approve: false } & RejectInput),
): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(claimId).success) return fail("This claim no longer exists.");
  let note = "";
  if (!decision.approve) {
    const parsed = rejectSchema.safeParse(decision);
    if (!parsed.success) return invalid(parsed.error);
    note = parsed.data.note;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_payment_claim", {
    p_claim_id: claimId,
    p_approve: decision.approve,
    p_note: note,
  });
  if (error) {
    switch (error.code) {
      case DB_CLAIM_ALREADY_REVIEWED:
        return fail("This claim was already reviewed.");
      case DB_OVERPAYMENT:
        return fail("That's more than is now due on this charge. Reject it, or void a payment first.");
      case DB_CHARGE_VOID:
        return fail("This charge is void. Reject the claim instead.");
      case DB_NOT_FOUND:
        return fail("This claim no longer exists.");
    }
    console.error("Review payment claim failed", error);
    return fail(GENERIC_ERROR);
  }

  // Tell the tenant the outcome.
  const [{ data: claimRow }, organization] = await Promise.all([
    supabase.from("payment_claim_overview").select("*").eq("id", claimId).maybeSingle(),
    getCurrentOrganization(),
  ]);
  const claim = claimRow as PaymentClaimOverview | null;
  const { data: tenant } = claim
    ? await supabase.from("tenants").select("id, full_name, email, user_id").eq("id", claim.tenant_id).maybeSingle()
    : { data: null };
  if (claim && tenant && organization && channelsFor(tenant).length > 0) {
    const content = paymentClaimReviewed({
      tenantName: tenant.full_name,
      landlordName: organization.name,
      approved: decision.approve,
      charge: `${claim.type_label}, ${formatMonth(claim.billing_month)}`,
      amount: claim.amount,
      currency: organization.currency,
      note,
      link: `${getSiteUrl()}/tenant/rent`,
    });
    await deliver(supabase, {
      type: "payment_claim_reviewed",
      orgId: organization.id,
      tenantId: tenant.id,
      chargeId: claim.charge_id,
      channels: channelsFor(tenant),
      ...content,
    });
  }
  refresh();
  return ok();
}
