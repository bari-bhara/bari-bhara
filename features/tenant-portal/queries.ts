import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { MyTenancy } from "@/types/domain";

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
