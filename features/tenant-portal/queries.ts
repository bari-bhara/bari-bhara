import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { pageRange, type Paged } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import type { ChargeBalance, MyTenancy, Payment } from "@/types/domain";

/**
 * The signed-in tenant's homes, current first. Reads through my_tenancies(),
 * which returns tenant-safe columns only (ADR 0007). Empty until the tenant
 * claims an invite code.
 */
export const getMyTenancies = cache(async (): Promise<MyTenancy[]> => {
  await requireRole("tenant");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_tenancies");
  if (error) throw new Error(`Failed to load your home: ${error.message}`);
  return data;
});

/** For portal pages: tenants who haven't linked a home yet go to /tenant/join. */
export async function requireLinkedTenant(): Promise<MyTenancy[]> {
  const tenancies = await getMyTenancies();
  if (tenancies.length === 0) redirect("/tenant/join");
  return tenancies;
}

/** "Green View · Unit A1". */
export function homeLabel(t: Pick<MyTenancy, "property_name" | "unit_number">) {
  return `${t.property_name} · Unit ${t.unit_number}`;
}

/**
 * Labels for the rows tenant pages list. Tenants can't read units or
 * properties directly (ADR 0007), so names come from my_tenancies().
 */
export async function getHomeLabels() {
  const tenancies = await getMyTenancies();
  return {
    byTenancy: new Map(tenancies.map((t) => [t.tenancy_id, homeLabel(t)])),
    byUnit: new Map(tenancies.map((t) => [t.unit_id, homeLabel(t)])),
    /**
     * For a notice: the tenant's homes it's about. Property notices name the
     * homes in that property; others name every current home (units notices
     * only reach units the tenant lives in).
     */
    forNotice(notice: { org_id: string; audience: string; property_id: string | null }) {
      const current = tenancies.filter((t) => t.status === "active" && t.org_id === notice.org_id);
      const homes =
        notice.audience === "property" ? current.filter((t) => t.property_id === notice.property_id) : current;
      return homes.map(homeLabel).join(", ");
    },
  };
}

export type MyCharge = ChargeBalance & { home: string };

/**
 * charges has no landlord-only columns, so tenants read it directly under RLS
 * (ADR 0007). Labels each charge with its home.
 */
async function withHomes(charges: ChargeBalance[]): Promise<MyCharge[]> {
  const { byTenancy } = await getHomeLabels();
  return charges.map((charge) => ({ ...charge, home: byTenancy.get(charge.tenancy_id) ?? "" }));
}

/** Everything the tenant still owes (all of it: it's what they need to see). */
export async function getMyOpenCharges(): Promise<MyCharge[]> {
  await requireRole("tenant");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charge_balances")
    .select("*")
    .in("status", ["unpaid", "partially_paid"])
    .order("due_date")
    .order("id");
  if (error) throw new Error(`Failed to load your charges: ${error.message}`);
  return withHomes(data as ChargeBalance[]);
}

/** A page of fully paid charges, newest first. */
export async function getMyPaidCharges(page = 1): Promise<Paged<MyCharge>> {
  await requireRole("tenant");
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("charge_balances")
    .select("*", { count: "exact" })
    .eq("status", "paid")
    .order("billing_month", { ascending: false })
    .order("due_date", { ascending: false })
    .order("id")
    .range(...pageRange(page));
  if (error) throw new Error(`Failed to load your charges: ${error.message}`);
  return { rows: await withHomes(data as ChargeBalance[]), total: count ?? 0 };
}

export type MyPayment = Pick<Payment, "id" | "amount" | "paid_on" | "method" | "reference"> & {
  charge: { id: string; billing_month: string; tenancy_id: string; charge_type: { label: string } };
  home: string;
};

/** A page of the tenant's payments (non-void), newest first. */
export async function getMyPayments(page = 1): Promise<Paged<MyPayment>> {
  await requireRole("tenant");
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("payments")
    .select(
      "id, amount, paid_on, method, reference, charge:charges!inner(id, billing_month, tenancy_id, charge_type:charge_types!inner(label))",
      { count: "exact" },
    )
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id")
    .range(...pageRange(page));
  if (error) throw new Error(`Failed to load your payments: ${error.message}`);
  const { byTenancy } = await getHomeLabels();
  return {
    rows: data.map((p) => ({ ...p, home: byTenancy.get(p.charge.tenancy_id) ?? "" })),
    total: count ?? 0,
  };
}
