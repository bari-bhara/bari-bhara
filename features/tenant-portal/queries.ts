import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
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

export type MyCharge = ChargeBalance & { home: string };

/**
 * The tenant's non-void charges, newest first. charges has no landlord-only
 * columns, so tenants read it directly under RLS (ADR 0007).
 */
export async function getMyCharges(): Promise<MyCharge[]> {
  const tenancies = await getMyTenancies();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charge_balances")
    .select("*")
    .neq("status", "void")
    .order("billing_month", { ascending: false })
    .order("due_date", { ascending: false });
  if (error) throw new Error(`Failed to load your charges: ${error.message}`);

  const homes = new Map(
    tenancies.map((t) => [t.tenancy_id, `${t.property_name} · Unit ${t.unit_number}`]),
  );
  return (data as ChargeBalance[]).map((charge) => ({
    ...charge,
    home: homes.get(charge.tenancy_id) ?? "",
  }));
}

export type MyPayment = Pick<Payment, "id" | "amount" | "paid_on" | "method" | "reference"> & {
  charge: { id: string; billing_month: string; charge_type: { label: string } };
};

/** The tenant's payments (non-void), newest first. */
export async function getMyPayments(): Promise<MyPayment[]> {
  await requireRole("tenant");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, amount, paid_on, method, reference, charge:charges!inner(id, billing_month, charge_type:charge_types!inner(label))",
    )
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load your payments: ${error.message}`);
  return data;
}
