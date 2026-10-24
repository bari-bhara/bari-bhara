import "server-only";
import { cache } from "react";
import { getCurrentUser, requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { id as idSchema } from "@/lib/zod-fields";
import type { PaymentClaim, PaymentClaimOverview } from "@/types/domain";

/** Claims waiting for the landlord, oldest first (first come, first served). */
export async function listPendingClaims(): Promise<PaymentClaimOverview[]> {
  await requireRole("landlord");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_claim_overview")
    .select("*")
    .eq("status", "pending")
    .order("created_at");
  if (error) throw new Error(`Failed to load payment claims: ${error.message}`);
  return data as PaymentClaimOverview[];
}

/** Every claim on one charge, newest first, for its landlord page. */
export async function listChargeClaims(chargeId: string): Promise<PaymentClaimOverview[]> {
  await requireRole("landlord");
  if (!idSchema.safeParse(chargeId).success) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_claim_overview")
    .select("*")
    .eq("charge_id", chargeId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load payment claims: ${error.message}`);
  return data as PaymentClaimOverview[];
}

/** For the landlord's nav badge (0 for anyone else). */
export const getPendingClaimCount = cache(async (): Promise<number> => {
  const user = await getCurrentUser();
  if (user?.role !== "landlord") return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("payment_claims")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) {
    console.error("Failed to count payment claims", error);
    return 0;
  }
  return count ?? 0;
});

/** The tenant's latest claim per charge, for their rent page. */
export async function getMyLatestClaims(): Promise<Map<string, PaymentClaim>> {
  await requireRole("tenant");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_claims")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Failed to load your payment claims: ${error.message}`);
  const latest = new Map<string, PaymentClaim>();
  for (const claim of data) if (!latest.has(claim.charge_id)) latest.set(claim.charge_id, claim);
  return latest;
}
