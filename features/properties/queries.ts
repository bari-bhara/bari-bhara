import "server-only";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { id as idSchema } from "@/lib/zod-fields";
import type { Property, PropertyOverview } from "@/types/domain";

/**
 * Property reads for landlord pages. RLS limits every query to the caller's
 * organizations; requireRole() only keeps tenants from reaching them at all.
 * Call from inside a <Suspense> boundary.
 */

export async function listProperties({
  archived = false,
}: { archived?: boolean } = {}): Promise<PropertyOverview[]> {
  await requireRole("landlord");
  const supabase = await createClient();

  let query = supabase.from("property_overview").select("*").order("name");
  query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load properties: ${error.message}`);
  return data as PropertyOverview[];
}

/** Names of active properties, for pickers and filters. */
export async function listPropertyOptions(): Promise<Pick<Property, "id" | "name">[]> {
  await requireRole("landlord");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, name")
    .is("archived_at", null)
    .order("name");

  if (error) throw new Error(`Failed to load properties: ${error.message}`);
  return data;
}

/** Returns null for malformed ids and for properties outside the caller's org. */
export async function getProperty(id: string): Promise<Property | null> {
  await requireRole("landlord");
  if (!idSchema.safeParse(id).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load property: ${error.message}`);
  return data;
}
