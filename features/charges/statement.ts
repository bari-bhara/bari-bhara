import "server-only";
import { getCurrentUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { id as idSchema } from "@/lib/zod-fields";
import type { ChargeBalance, EffectiveStatus, PaymentMethod } from "@/types/domain";

/**
 * Monthly statements (ADR 0010): a tenancy's charges grouped by billing
 * month, with the payments applied to each. A read model over
 * charge_balances and payments; either role, scoped by RLS.
 */

export type StatementPayment = { id: string; amount: number; paid_on: string; method: PaymentMethod; reference: string };
export type StatementLine = {
  id: string;
  category: ChargeBalance["category"];
  label: string;
  description: string;
  amount: number;
  paid: number;
  outstanding: number;
  status: EffectiveStatus;
  meter: { previous: number; current: number; rate: number } | null;
  payments: StatementPayment[];
};
export type StatementMonth = {
  /** "YYYY-MM-01". */
  month: string;
  lines: StatementLine[];
  billed: number;
  paid: number;
  outstanding: number;
};

/** How many months a statement shows. */
const MONTHS = 6;

function build(charges: ChargeBalance[], payments: (StatementPayment & { charge_id: string })[]): StatementMonth[] {
  const byCharge = new Map<string, StatementPayment[]>();
  for (const { charge_id, ...payment } of payments) {
    byCharge.set(charge_id, [...(byCharge.get(charge_id) ?? []), payment]);
  }
  const months = new Map<string, StatementMonth>();
  for (const c of charges) {
    const month = months.get(c.billing_month) ?? {
      month: c.billing_month,
      lines: [],
      billed: 0,
      paid: 0,
      outstanding: 0,
    };
    month.lines.push({
      id: c.id,
      category: c.category,
      label: c.type_label,
      description: c.description,
      amount: c.amount,
      paid: c.amount_paid,
      outstanding: c.outstanding,
      status: c.effective_status,
      meter:
        c.meter_previous !== null && c.meter_current !== null && c.unit_rate !== null
          ? { previous: c.meter_previous, current: c.meter_current, rate: c.unit_rate }
          : null,
      payments: (byCharge.get(c.id) ?? []).sort((a, b) => a.paid_on.localeCompare(b.paid_on)),
    });
    month.billed += c.amount;
    month.paid += c.amount_paid;
    month.outstanding += c.outstanding;
    months.set(c.billing_month, month);
  }
  for (const month of months.values()) {
    // Rent first, then bills by name.
    month.lines.sort((a, b) => Number(b.category === "rent") - Number(a.category === "rent") || a.label.localeCompare(b.label));
  }
  return [...months.values()].sort((a, b) => b.month.localeCompare(a.month));
}

async function load(filter: { tenancyIds: string[] }): Promise<StatementMonth[]> {
  if (filter.tenancyIds.length === 0) return [];
  const supabase = await createClient();
  const { data: charges, error } = await supabase
    .from("charge_balances")
    .select("*")
    .in("tenancy_id", filter.tenancyIds)
    .neq("status", "void")
    .order("billing_month", { ascending: false })
    .limit(MONTHS * 8);
  if (error) throw new Error(`Failed to load the statement: ${error.message}`);
  const recentMonths = [...new Set(charges.map((c) => c.billing_month))].slice(0, MONTHS);
  const shown = (charges as ChargeBalance[]).filter((c) => recentMonths.includes(c.billing_month));
  if (shown.length === 0) return [];

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("id, charge_id, amount, paid_on, method, reference")
    .in(
      "charge_id",
      shown.map((c) => c.id),
    )
    .is("voided_at", null);
  if (paymentsError) throw new Error(`Failed to load the statement: ${paymentsError.message}`);
  return build(shown, payments);
}

/** The last few months for one tenant's tenancies (landlord) or the caller's own (tenant). */
export async function getStatement(tenancyIds: string[]): Promise<StatementMonth[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return load({ tenancyIds: tenancyIds.filter((id) => idSchema.safeParse(id).success) });
}
