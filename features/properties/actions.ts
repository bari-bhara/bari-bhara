"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  GENERIC_ERROR,
  fail,
  invalid,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import { getCurrentOrganization, requireRole } from "@/lib/dal";
import { PG_FOREIGN_KEY_VIOLATION } from "@/lib/postgres-errors";
import { createClient } from "@/lib/supabase/server";
import { id as idSchema } from "@/lib/zod-fields";
import { propertySchema, type PropertyFormValues, type PropertyInput } from "./schema";

const NOT_FOUND = "This property no longer exists.";

function toRow(input: PropertyInput) {
  return {
    name: input.name,
    address: input.address,
    city: input.city,
    rent_due_day: input.rentDueDay,
    notes: input.notes,
  };
}

export async function createProperty(input: PropertyFormValues): Promise<ActionResult> {
  await requireRole("landlord");
  const parsed = propertySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const organization = await getCurrentOrganization();
  if (!organization) return fail(GENERIC_ERROR);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({ org_id: organization.id, ...toRow(parsed.data) })
    .select("id")
    .single();

  if (error) {
    console.error("Create property failed", error);
    return fail(GENERIC_ERROR);
  }
  redirect(`/properties/${data.id}`);
}

export async function updateProperty(
  id: string,
  input: PropertyFormValues,
): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(id).success) return fail(NOT_FOUND);
  const parsed = propertySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .update(toRow(parsed.data))
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Update property failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail(NOT_FOUND);
  redirect(`/properties/${id}`);
}

/** Archived properties drop out of lists and pickers but keep their history. */
export async function setPropertyArchived(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(id).success) return fail(NOT_FOUND);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Archive property failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail(NOT_FOUND);
  refresh();
  return ok();
}

/** Only empty properties can be deleted; the units FK restricts the rest. */
export async function deleteProperty(id: string): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(id).success) return fail(NOT_FOUND);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      return fail("This property still has units. Delete them first, or archive the property.");
    }
    console.error("Delete property failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail(NOT_FOUND);
  redirect("/properties");
}
