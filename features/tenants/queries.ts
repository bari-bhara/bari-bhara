import "server-only";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { id as idSchema } from "@/lib/zod-fields";
import type { Property, Tenancy, Tenant, TenantOverview, Unit } from "@/types/domain";
import type { TenantListSort, TenantListStatus } from "./schema";

/**
 * Tenant reads for landlord pages. RLS limits every query to the caller's
 * organizations. Call from inside a <Suspense> boundary.
 */

export const TENANTS_PAGE_SIZE = 20;

/** Removes characters that have meaning in PostgREST filter strings. */
function sanitizeSearch(q: string) {
  return q.replace(/[,()*%_\\"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export async function listTenants({
  q = "",
  status = "current",
  propertyId,
  sort = "name",
  page = 1,
}: {
  q?: string;
  status?: TenantListStatus;
  propertyId?: string | null;
  sort?: TenantListSort;
  page?: number;
}): Promise<{ tenants: TenantOverview[]; total: number }> {
  await requireRole("landlord");
  const supabase = await createClient();

  let query = supabase.from("tenant_overview").select("*", { count: "exact" });

  const search = sanitizeSearch(q);
  if (search) {
    const pattern = `*${search}*`;
    query = query.or(
      `full_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`,
    );
  }
  if (status === "current") query = query.eq("tenancy_status", "active");
  if (status === "past") query = query.eq("tenancy_status", "moved_out");
  if (propertyId && idSchema.safeParse(propertyId).success) {
    query = query.eq("property_id", propertyId);
  }

  if (sort === "newest") query = query.order("created_at", { ascending: false });
  else if (sort === "move_in") {
    query = query.order("move_in_date", { ascending: false, nullsFirst: false });
  }
  query = query.order("full_name").order("id");

  const from = (Math.max(page, 1) - 1) * TENANTS_PAGE_SIZE;
  const { data, error, count } = await query.range(from, from + TENANTS_PAGE_SIZE - 1);
  if (error) throw new Error(`Failed to load tenants: ${error.message}`);
  return { tenants: data as TenantOverview[], total: count ?? 0 };
}

export type TenancyWithUnit = Tenancy & {
  unit: Pick<Unit, "id" | "unit_number"> & { property: Pick<Property, "id" | "name"> };
};

export type TenantDetail = Tenant & {
  tenancies: TenancyWithUnit[];
  /** The unused, unexpired invite code, if any (the code itself is never readable). */
  pendingInvite: { expires_at: string; created_at: string } | null;
};

/** Returns null for malformed ids and for tenants outside the caller's org. */
export async function getTenant(id: string): Promise<TenantDetail | null> {
  await requireRole("landlord");
  if (!idSchema.safeParse(id).success) return null;

  const supabase = await createClient();
  const [tenantResult, tenanciesResult, inviteResult] = await Promise.all([
    supabase.from("tenants").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("tenancies")
      .select("*, unit:units!inner(id, unit_number, property:properties!inner(id, name))")
      .eq("tenant_id", id)
      .order("status")
      .order("move_in_date", { ascending: false }),
    supabase
      .from("tenant_invites")
      .select("expires_at, created_at")
      .eq("tenant_id", id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  for (const result of [tenantResult, tenanciesResult, inviteResult]) {
    if (result.error) throw new Error(`Failed to load tenant: ${result.error.message}`);
  }
  if (!tenantResult.data) return null;

  return {
    ...tenantResult.data,
    tenancies: tenanciesResult.data ?? [],
    pendingInvite: inviteResult.data,
  };
}

export type AvailableUnit = Pick<Unit, "id" | "unit_number" | "default_rent" | "status"> & {
  property: Pick<Property, "id" | "name">;
};

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Units a tenant can move into: vacant or under maintenance, in active properties. */
export async function listAvailableUnits(): Promise<AvailableUnit[]> {
  await requireRole("landlord");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .select("id, unit_number, default_rent, status, property:properties!inner(id, name, archived_at)")
    .in("status", ["vacant", "maintenance"])
    .is("property.archived_at", null);

  if (error) throw new Error(`Failed to load units: ${error.message}`);
  return data
    .map(({ property: { id, name }, ...unit }) => ({ ...unit, property: { id, name } }))
    .sort(
      (a, b) =>
        collator.compare(a.property.name, b.property.name) ||
        collator.compare(a.unit_number, b.unit_number),
    );
}

export type UnitTenancy = Tenancy & { tenant: Pick<Tenant, "id" | "full_name"> };

/** A unit's tenancies, current first. */
export async function listUnitTenancies(unitId: string): Promise<UnitTenancy[]> {
  await requireRole("landlord");
  if (!idSchema.safeParse(unitId).success) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenancies")
    .select("*, tenant:tenants!inner(id, full_name)")
    .eq("unit_id", unitId)
    .order("status")
    .order("move_in_date", { ascending: false });

  if (error) throw new Error(`Failed to load tenancies: ${error.message}`);
  return data;
}
