import "server-only";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { id as idSchema } from "@/lib/zod-fields";
import type { Property, Unit, UnitStatus } from "@/types/domain";

/**
 * Unit reads for landlord pages. RLS limits every query to the caller's
 * organizations. Call from inside a <Suspense> boundary.
 */

export type UnitWithProperty = Unit & {
  property: Pick<Property, "id" | "name" | "archived_at">;
};

const UNIT_WITH_PROPERTY = "*, property:properties!inner(id, name, archived_at)";

const unitNumberCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function byPropertyThenUnit(a: UnitWithProperty, b: UnitWithProperty) {
  return (
    unitNumberCollator.compare(a.property.name, b.property.name) ||
    unitNumberCollator.compare(a.unit_number, b.unit_number)
  );
}

/**
 * Units in one property, or across all active (non-archived) properties.
 * Returns every unit in scope so the page can show per-status counts and
 * filter without a second query. Pagination comes with Phase 9.
 */
export async function listUnits({
  propertyId,
}: { propertyId?: string } = {}): Promise<UnitWithProperty[]> {
  await requireRole("landlord");
  if (propertyId && !idSchema.safeParse(propertyId).success) return [];

  const supabase = await createClient();
  let query = supabase.from("units").select(UNIT_WITH_PROPERTY);
  query = propertyId
    ? query.eq("property_id", propertyId)
    : query.is("property.archived_at", null);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load units: ${error.message}`);
  return data.sort(byPropertyThenUnit);
}

/** Returns null for malformed ids and for units outside the caller's org. */
export async function getUnit(id: string): Promise<UnitWithProperty | null> {
  await requireRole("landlord");
  if (!idSchema.safeParse(id).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .select(UNIT_WITH_PROPERTY)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load unit: ${error.message}`);
  return data;
}

export function countByStatus(units: Pick<Unit, "status">[]) {
  const counts: Record<UnitStatus, number> = {
    vacant: 0,
    occupied: 0,
    maintenance: 0,
    inactive: 0,
  };
  for (const unit of units) counts[unit.status] += 1;
  return counts;
}
