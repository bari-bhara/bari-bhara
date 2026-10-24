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

export type ScheduleLine = {
  chargeTypeId: string;
  label: string;
  isRent: boolean;
  /** Billed this month; 0 if the item hasn't started or has ended. */
  current: number;
  /** Changes from next month on, earliest first. */
  upcoming: { id: string; amount: number; month: string }[];
};

/**
 * What the unit is billed each month (ADR 0010): the amount in force this
 * month and any scheduled changes, per charge type. Rent first.
 */
export async function getUnitSchedule(unitId: string, currentMonth: string): Promise<ScheduleLine[]> {
  await requireRole("landlord");
  if (!idSchema.safeParse(unitId).success) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("unit_charge_items")
    .select("id, amount, effective_month, charge_type:charge_types!inner(id, label, category)")
    .eq("unit_id", unitId)
    .order("effective_month");
  if (error) throw new Error(`Failed to load monthly charges: ${error.message}`);

  const month = `${currentMonth}-01`;
  const lines = new Map<string, ScheduleLine>();
  for (const row of data) {
    const type = row.charge_type;
    const line = lines.get(type.id) ?? {
      chargeTypeId: type.id,
      label: type.label,
      isRent: type.category === "rent",
      current: 0,
      upcoming: [],
    };
    // Rows are in month order, so the last one on or before this month wins.
    if (row.effective_month <= month) line.current = row.amount;
    else line.upcoming.push({ id: row.id, amount: row.amount, month: row.effective_month });
    lines.set(type.id, line);
  }
  return [...lines.values()]
    .filter((line) => line.current > 0 || line.upcoming.length > 0)
    .sort((a, b) => Number(b.isRent) - Number(a.isRent) || a.label.localeCompare(b.label));
}
