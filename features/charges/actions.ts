"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  GENERIC_ERROR,
  fail,
  invalid,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import { getCurrentOrganization, requireRole } from "@/lib/dal";
import { todayIn } from "@/lib/format";
import {
  DB_CHARGE_HAS_PAYMENTS,
  DB_CHARGE_VOID,
  DB_NOT_FOUND,
  DB_OVERPAYMENT,
  DB_PAYMENT_ALREADY_VOID,
} from "@/lib/postgres-errors";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { id as idSchema } from "@/lib/zod-fields";
import {
  billSchema,
  isMonth,
  recordPaymentSchema,
  voidSchema,
  type BillFormValues,
  type RecordPaymentFormValues,
  type VoidInput,
} from "./schema";

const CHARGE_NOT_FOUND = "This charge no longer exists.";
const PAYMENT_NOT_FOUND = "This payment no longer exists.";

/** Turns charge/payment trigger errors into messages; null if unexpected. */
function chargeErrorMessage(error: PostgrestError): string | null {
  switch (error.code) {
    case DB_CHARGE_VOID:
      return "This charge is void and can't change.";
    case DB_CHARGE_HAS_PAYMENTS:
      return "Void this charge's payments first.";
    case DB_OVERPAYMENT:
      return "That's more than the amount due.";
    case DB_PAYMENT_ALREADY_VOID:
      return "This payment is already void.";
    case DB_NOT_FOUND:
      return CHARGE_NOT_FOUND;
    default:
      return null;
  }
}

function fieldError(field: string, message: string): ActionResult<never> {
  return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: { [field]: [message] } };
}

/** Creates rent for every current tenancy for `month` ("YYYY-MM"). Safe to repeat. */
export async function generateRent(month: string): Promise<ActionResult<{ created: number }>> {
  await requireRole("landlord");
  if (!isMonth(month)) return fail("Choose a month.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_monthly_rent", { p_month: `${month}-01` });
  if (error) {
    console.error("Generate rent failed", error);
    return fail(GENERIC_ERROR);
  }
  refresh();
  return ok({ created: data });
}

export async function createBill(input: BillFormValues): Promise<ActionResult> {
  await requireRole("landlord");
  const parsed = billSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const bill = parsed.data;

  const supabase = await createClient();
  const { data: tenancy, error: tenancyError } = await supabase
    .from("tenancies")
    .select("org_id")
    .eq("id", bill.tenancyId)
    .maybeSingle();
  if (tenancyError) {
    console.error("Load tenancy failed", tenancyError);
    return fail(GENERIC_ERROR);
  }
  if (!tenancy) return fieldError("tenancyId", "This tenancy no longer exists.");

  // unit_id and category are filled by the charges_prepare trigger (and aren't
  // insertable by users), so they're omitted despite the generated type.
  const row = {
    org_id: tenancy.org_id,
    tenancy_id: bill.tenancyId,
    charge_type_id: bill.chargeTypeId,
    billing_month: `${bill.billingMonth}-01`,
    amount: bill.amount,
    due_date: bill.dueDate,
    description: bill.description,
  } as TablesInsert<"charges">;
  const { data, error } = await supabase.from("charges").insert(row).select("id").single();

  if (error) {
    const message = chargeErrorMessage(error);
    if (message) return fail(message);
    console.error("Create bill failed", error);
    return fail(GENERIC_ERROR);
  }
  redirect(`/bills/${data.id}`);
}

export async function recordPayment(
  chargeId: string,
  input: RecordPaymentFormValues,
): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(chargeId).success) return fail(CHARGE_NOT_FOUND);
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const payment = parsed.data;

  const supabase = await createClient();
  const [{ data: charge, error: loadError }, organization] = await Promise.all([
    supabase
      .from("charge_balances")
      .select("org_id, outstanding, status")
      .eq("id", chargeId)
      .maybeSingle(),
    getCurrentOrganization(),
  ]);
  if (loadError) {
    console.error("Load charge failed", loadError);
    return fail(GENERIC_ERROR);
  }
  if (!charge?.org_id) return fail(CHARGE_NOT_FOUND);
  if (charge.status === "void") return fail("This charge is void and can't take payments.");
  if (payment.amount > (charge.outstanding ?? 0)) {
    return fieldError("amount", "That's more than the amount due.");
  }
  if (payment.paidOn > todayIn(organization?.timezone)) {
    return fieldError("paidOn", "The payment date can't be in the future.");
  }

  const { error } = await supabase.from("payments").insert({
    org_id: charge.org_id,
    charge_id: chargeId,
    amount: payment.amount,
    paid_on: payment.paidOn,
    method: payment.method,
    reference: payment.reference,
  });
  if (error) {
    const message = chargeErrorMessage(error);
    if (message) return fail(message);
    console.error("Record payment failed", error);
    return fail(GENERIC_ERROR);
  }
  refresh();
  return ok();
}

/** Voids a payment (kept for the record); the charge's balance goes back up. */
export async function voidPayment(paymentId: string, input: VoidInput): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(paymentId).success) return fail(PAYMENT_NOT_FOUND);
  const parsed = voidSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .update({ voided_at: new Date().toISOString(), void_reason: parsed.data.reason })
    .eq("id", paymentId)
    .is("voided_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    const message = chargeErrorMessage(error);
    if (message) return fail(message);
    console.error("Void payment failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail("This payment is already void.");
  refresh();
  return ok();
}

/** Voids a charge with no live payments. It stays in the record as void. */
export async function voidCharge(chargeId: string, input: VoidInput): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(chargeId).success) return fail(CHARGE_NOT_FOUND);
  const parsed = voidSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charges")
    .update({ status: "void", void_reason: parsed.data.reason })
    .eq("id", chargeId)
    .select("id")
    .maybeSingle();

  if (error) {
    const message = chargeErrorMessage(error);
    if (message) return fail(message);
    console.error("Void charge failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail(CHARGE_NOT_FOUND);
  refresh();
  return ok();
}
