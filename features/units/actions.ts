"use server";

import { redirect } from "next/navigation";
import {
  GENERIC_ERROR,
  fail,
  type ActionResult,
  invalid,
} from "@/lib/action-result";
import { requireRole } from "@/lib/dal";
import { PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION } from "@/lib/postgres-errors";
import { createClient } from "@/lib/supabase/server";
import { id as idSchema } from "@/lib/zod-fields";
import {
  createUnitSchema,
  statusChangeError,
  unitSchema,
  type CreateUnitFormValues,
  type UnitFormValues,
  type UnitInput,
} from "./schema";

const NOT_FOUND = "This unit no longer exists.";

const DUPLICATE_UNIT_NUMBER: ActionResult<never> = {
  ok: false,
  error: "Please fix the highlighted fields.",
  fieldErrors: { unitNumber: ["This property already has a unit with this number."] },
};

function toRow(input: UnitInput) {
  return {
    unit_number: input.unitNumber,
    floor: input.floor,
    unit_type: input.unitType,
    bedrooms: input.bedrooms,
    default_rent: input.defaultRent,
    status: input.status,
    notes: input.notes,
  };
}

export async function createUnit(input: CreateUnitFormValues): Promise<ActionResult> {
  await requireRole("landlord");
  const parsed = createUnitSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const statusError = statusChangeError(null, parsed.data.status);
  if (statusError) return fail(statusError);

  const supabase = await createClient();
  // The unit joins its property's organization. RLS hides other orgs' properties.
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, org_id, archived_at")
    .eq("id", parsed.data.propertyId)
    .maybeSingle();

  if (propertyError) {
    console.error("Load property for new unit failed", propertyError);
    return fail(GENERIC_ERROR);
  }
  if (!property) return fail("This property no longer exists.");
  if (property.archived_at) return fail("Restore this property before adding units.");

  const { error } = await supabase.from("units").insert({
    org_id: property.org_id,
    property_id: property.id,
    ...toRow(parsed.data),
  });

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) return DUPLICATE_UNIT_NUMBER;
    console.error("Create unit failed", error);
    return fail(GENERIC_ERROR);
  }
  redirect(`/properties/${property.id}`);
}

export async function updateUnit(id: string, input: UnitFormValues): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(id).success) return fail(NOT_FOUND);
  const parsed = unitSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data: current, error: loadError } = await supabase
    .from("units")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("Load unit failed", loadError);
    return fail(GENERIC_ERROR);
  }
  if (!current) return fail(NOT_FOUND);

  const statusError = statusChangeError(current.status, parsed.data.status);
  if (statusError) return fail(statusError);

  const { data, error } = await supabase
    .from("units")
    .update(toRow(parsed.data))
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) return DUPLICATE_UNIT_NUMBER;
    console.error("Update unit failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail(NOT_FOUND);
  redirect(`/units/${id}`);
}

export async function deleteUnit(id: string): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(id).success) return fail(NOT_FOUND);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .delete()
    .eq("id", id)
    .select("property_id")
    .maybeSingle();

  if (error) {
    // From Phase 3, tenancies keep a unit's history and block deletion.
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      return fail("This unit has tenancy history and can't be deleted. Mark it inactive instead.");
    }
    console.error("Delete unit failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail(NOT_FOUND);
  redirect(`/properties/${data.property_id}`);
}
