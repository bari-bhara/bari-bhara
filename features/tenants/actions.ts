"use server";

import type { PostgrestError } from "@supabase/supabase-js";
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
import { todayIn } from "@/lib/format";
import {
  DB_ALREADY_LINKED,
  DB_NOT_FOUND,
  DB_TENANCY_FROZEN,
  DB_UNIT_UNAVAILABLE,
  PG_UNIQUE_VIOLATION,
} from "@/lib/postgres-errors";
import { createClient } from "@/lib/supabase/server";
import { id as idSchema } from "@/lib/zod-fields";
import {
  addTenantSchema,
  moveInSchema,
  moveOutSchema,
  tenantSchema,
  type AddTenantFormValues,
  type MoveInFormValues,
  type MoveOutFormValues,
  type TenantFormValues,
} from "./schema";

const TENANT_NOT_FOUND = "This tenant no longer exists.";
const TENANCY_NOT_FOUND = "This tenancy no longer exists.";

/** Turns tenancy constraint and trigger errors into messages; null if unexpected. */
function tenancyErrorMessage(error: PostgrestError): string | null {
  switch (error.code) {
    case PG_UNIQUE_VIOLATION:
      return "This unit already has a tenant. Move them out first.";
    case DB_UNIT_UNAVAILABLE:
      return "This unit isn't available: it's inactive or its property is archived.";
    case DB_TENANCY_FROZEN:
      return "This tenancy has ended and can't be changed.";
    case DB_NOT_FOUND:
      return "This unit no longer exists.";
    default:
      return null;
  }
}

export async function addTenant(input: AddTenantFormValues): Promise<ActionResult> {
  await requireRole("landlord");
  const parsed = addTenantSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const values = parsed.data;

  const supabase = await createClient();
  const { data: tenantId, error } = await supabase.rpc("add_tenant", {
    p_unit_id: values.unitId,
    p_full_name: values.fullName,
    p_phone: values.phone,
    p_email: values.email,
    p_notes: values.notes,
    p_monthly_rent: values.monthlyRent,
    p_security_deposit: values.securityDeposit,
    p_move_in_date: values.moveInDate,
  });

  if (error) {
    const message = tenancyErrorMessage(error);
    if (message) return fail(message);
    console.error("Add tenant failed", error);
    return fail(GENERIC_ERROR);
  }
  redirect(`/tenants/${tenantId}`);
}

export async function updateTenant(id: string, input: TenantFormValues): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(id).success) return fail(TENANT_NOT_FOUND);
  const parsed = tenantSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      notes: parsed.data.notes,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Update tenant failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail(TENANT_NOT_FOUND);
  redirect(`/tenants/${id}`);
}

/** Starts a new tenancy for an existing tenant (e.g. moving to another unit). */
export async function moveIn(tenantId: string, input: MoveInFormValues): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(tenantId).success) return fail(TENANT_NOT_FOUND);
  const parsed = moveInSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, org_id")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError) {
    console.error("Load tenant failed", tenantError);
    return fail(GENERIC_ERROR);
  }
  if (!tenant) return fail(TENANT_NOT_FOUND);

  const { error } = await supabase.from("tenancies").insert({
    org_id: tenant.org_id,
    tenant_id: tenant.id,
    unit_id: parsed.data.unitId,
    monthly_rent: parsed.data.monthlyRent,
    security_deposit: parsed.data.securityDeposit,
    move_in_date: parsed.data.moveInDate,
  });

  if (error) {
    const message = tenancyErrorMessage(error);
    if (message) return fail(message);
    console.error("Move in failed", error);
    return fail(GENERIC_ERROR);
  }
  redirect(`/tenants/${tenant.id}`);
}

/**
 * Ends a tenancy. The row is kept as history and the unit becomes vacant
 * (occupancy trigger).
 */
export async function moveOut(tenancyId: string, input: MoveOutFormValues): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(tenancyId).success) return fail(TENANCY_NOT_FOUND);
  const parsed = moveOutSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const [{ data: tenancy, error: loadError }, organization] = await Promise.all([
    supabase.from("tenancies").select("move_in_date, status").eq("id", tenancyId).maybeSingle(),
    getCurrentOrganization(),
  ]);

  if (loadError) {
    console.error("Load tenancy failed", loadError);
    return fail(GENERIC_ERROR);
  }
  if (!tenancy) return fail(TENANCY_NOT_FOUND);
  if (tenancy.status !== "active") return fail("This tenant has already moved out.");

  // "YYYY-MM-DD" strings compare correctly as text.
  const { moveOutDate, reason, notes } = parsed.data;
  if (moveOutDate < tenancy.move_in_date) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: { moveOutDate: ["The move-out date can't be before the move-in date."] },
    };
  }
  if (moveOutDate > todayIn(organization?.timezone)) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: { moveOutDate: ["Record the move-out on or after the day they leave."] },
    };
  }

  const { data, error } = await supabase
    .from("tenancies")
    .update({
      status: "moved_out",
      move_out_date: moveOutDate,
      move_out_reason: reason,
      move_out_notes: notes,
    })
    .eq("id", tenancyId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error) {
    const message = tenancyErrorMessage(error);
    if (message) return fail(message);
    console.error("Move out failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail("This tenant has already moved out.");
  refresh();
  return ok();
}

/**
 * Issues a new invite code (replacing any unused one). The plaintext is
 * returned once for the landlord to share; only its hash is stored.
 */
export async function createInvite(
  tenantId: string,
): Promise<ActionResult<{ code: string; expiresAt: string }>> {
  await requireRole("landlord");
  if (!idSchema.safeParse(tenantId).success) return fail(TENANT_NOT_FOUND);

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("create_tenant_invite", { p_tenant_id: tenantId })
    .single();

  if (error) {
    if (error.code === DB_NOT_FOUND) return fail(TENANT_NOT_FOUND);
    if (error.code === DB_ALREADY_LINKED) return fail("This tenant is already connected to the app.");
    console.error("Create invite failed", error);
    return fail(GENERIC_ERROR);
  }
  refresh();
  return ok({ code: data.invite_code, expiresAt: data.invite_expires_at });
}
