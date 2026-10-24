"use server";

import { refresh } from "next/cache";
import { GENERIC_ERROR, fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getCurrentOrganization, requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { accountSchema, businessSchema, type AccountInput, type BusinessInput } from "./schema";

export async function updateAccount(input: AccountInput): Promise<ActionResult> {
  const user = await requireRole("landlord");
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
    .eq("id", user.id);
  if (error) {
    console.error("Update account failed", error);
    return fail(GENERIC_ERROR);
  }
  refresh();
  return ok();
}

export async function updateBusiness(input: BusinessInput): Promise<ActionResult> {
  await requireRole("landlord");
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const organization = await getCurrentOrganization();
  if (!organization) return fail(GENERIC_ERROR);

  const supabase = await createClient();
  // RLS lets only the organization's owner update it; nothing changes otherwise.
  const { data, error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", organization.id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Update business failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail("Only the business owner can change these details.");
  refresh();
  return ok();
}
