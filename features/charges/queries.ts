import "server-only";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { id as idSchema } from "@/lib/zod-fields";
import type {
  ChargeCategory,
  ChargeOverview,
  ChargeType,
  EffectiveStatus,
  Payment,
  PaymentMethod,
  PaymentOverview,
} from "@/types/domain";

/**
 * Charge and payment reads for landlord pages. Balances and overdue come from
 * the charge_balances-based views (ADR 0004). RLS limits everything to the
 * caller's organizations. Call from inside a <Suspense> boundary.
 */

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Every non-void charge of a category for one billing month ("YYYY-MM"). */
export async function listMonthCharges(
  category: ChargeCategory,
  month: string,
): Promise<ChargeOverview[]> {
  await requireRole("landlord");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charge_overview")
    .select("*")
    .eq("category", category)
    .eq("billing_month", `${month}-01`)
    .neq("status", "void");

  if (error) throw new Error(`Failed to load charges: ${error.message}`);
  return (data as ChargeOverview[]).sort(
    (a, b) =>
      collator.compare(a.property_name, b.property_name) ||
      collator.compare(a.unit_number, b.unit_number) ||
      collator.compare(a.type_label, b.type_label),
  );
}

export type ChargeTotals = {
  billed: number;
  collected: number;
  outstanding: number;
  overdue: number;
  overdueCount: number;
  counts: Record<EffectiveStatus, number>;
};

export function totalCharges(charges: ChargeOverview[]): ChargeTotals {
  const totals: ChargeTotals = {
    billed: 0,
    collected: 0,
    outstanding: 0,
    overdue: 0,
    overdueCount: 0,
    counts: { unpaid: 0, partially_paid: 0, paid: 0, overdue: 0, void: 0 },
  };
  for (const charge of charges) {
    totals.counts[charge.effective_status] += 1;
    if (charge.status === "void") continue;
    totals.billed += charge.amount;
    totals.collected += charge.amount_paid;
    totals.outstanding += charge.outstanding;
    if (charge.effective_status === "overdue") {
      totals.overdue += charge.outstanding;
      totals.overdueCount += 1;
    }
  }
  return totals;
}

export type ChargeDetail = ChargeOverview & { payments: Payment[] };

/** Returns null for malformed ids and for charges outside the caller's org. */
export async function getCharge(id: string): Promise<ChargeDetail | null> {
  await requireRole("landlord");
  if (!idSchema.safeParse(id).success) return null;

  const supabase = await createClient();
  const [chargeResult, paymentsResult] = await Promise.all([
    supabase.from("charge_overview").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("payments")
      .select("*")
      .eq("charge_id", id)
      .order("paid_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (chargeResult.error) throw new Error(`Failed to load charge: ${chargeResult.error.message}`);
  if (paymentsResult.error) {
    throw new Error(`Failed to load payments: ${paymentsResult.error.message}`);
  }
  if (!chargeResult.data) return null;
  return { ...(chargeResult.data as ChargeOverview), payments: paymentsResult.data };
}

/** Utility bill types the caller can use (system defaults + their own). */
export async function listUtilityTypes(): Promise<Pick<ChargeType, "id" | "label">[]> {
  await requireRole("landlord");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charge_types")
    .select("id, label, org_id")
    .eq("category", "utility")
    .order("label");
  if (error) throw new Error(`Failed to load bill types: ${error.message}`);
  // "Other" last.
  return data.sort((a, b) => Number(a.label === "Other") - Number(b.label === "Other"));
}

export type BillableTenancy = {
  id: string;
  label: string;
  dueDay: number;
};

/** Current tenancies, labelled "Property · Unit — Tenant", for the bill form. */
export async function listBillableTenancies(): Promise<BillableTenancy[]> {
  await requireRole("landlord");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenancies")
    .select(
      "id, tenant:tenants!inner(full_name), unit:units!inner(unit_number, property:properties!inner(name, rent_due_day))",
    )
    .eq("status", "active");
  if (error) throw new Error(`Failed to load tenancies: ${error.message}`);

  return data
    .map((t) => ({
      id: t.id,
      label: `${t.unit.property.name} · Unit ${t.unit.unit_number} — ${t.tenant.full_name}`,
      dueDay: t.unit.property.rent_due_day,
    }))
    .sort((a, b) => collator.compare(a.label, b.label));
}

/** A tenant's balance and latest charges, for their page. */
export async function getTenantChargeSummary(tenantId: string) {
  await requireRole("landlord");
  if (!idSchema.safeParse(tenantId).success) return { outstanding: 0, overdue: 0, recent: [] };

  const supabase = await createClient();
  const [openResult, recentResult] = await Promise.all([
    supabase
      .from("charge_overview")
      .select("outstanding, effective_status")
      .eq("tenant_id", tenantId)
      .in("status", ["unpaid", "partially_paid"]),
    supabase
      .from("charge_overview")
      .select("*")
      .eq("tenant_id", tenantId)
      .neq("status", "void")
      .order("billing_month", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6),
  ]);
  if (openResult.error) throw new Error(`Failed to load balance: ${openResult.error.message}`);
  if (recentResult.error) throw new Error(`Failed to load charges: ${recentResult.error.message}`);

  let outstanding = 0;
  let overdue = 0;
  for (const row of openResult.data) {
    outstanding += row.outstanding ?? 0;
    if (row.effective_status === "overdue") overdue += row.outstanding ?? 0;
  }
  return { outstanding, overdue, recent: recentResult.data as ChargeOverview[] };
}

export const PAYMENTS_PAGE_SIZE = 20;

export async function listPayments({
  method,
  includeVoided = false,
  page = 1,
}: {
  method?: PaymentMethod | null;
  includeVoided?: boolean;
  page?: number;
}): Promise<{ payments: PaymentOverview[]; total: number }> {
  await requireRole("landlord");
  const supabase = await createClient();

  let query = supabase.from("payment_overview").select("*", { count: "exact" });
  if (method) query = query.eq("method", method);
  if (!includeVoided) query = query.is("voided_at", null);

  const from = (Math.max(page, 1) - 1) * PAYMENTS_PAGE_SIZE;
  const { data, error, count } = await query
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAYMENTS_PAGE_SIZE - 1);

  if (error) throw new Error(`Failed to load payments: ${error.message}`);
  return { payments: data as PaymentOverview[], total: count ?? 0 };
}
