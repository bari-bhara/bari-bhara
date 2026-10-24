"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  GENERIC_ERROR,
  fail,
  type ActionResult,
  invalid,
  ok,
} from "@/lib/action-result";
import { getCurrentOrganization, requireRole } from "@/lib/dal";
import { todayIn } from "@/lib/format";
import { deliver } from "@/lib/notifications/dispatch";
import { channelsFor } from "@/lib/notifications/recipients";
import { chargeChange } from "@/lib/notifications/templates";
import {
  DB_NOT_FOUND,
  DB_SCHEDULE_NOT_FUTURE,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
} from "@/lib/postgres-errors";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { id as idSchema } from "@/lib/zod-fields";
import {
  createUnitSchema,
  scheduleChargeSchema,
  statusChangeError,
  type ScheduleChargeFormValues,
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
    electricity_account_no: input.electricityAccountNo,
    electricity_meter_no: input.electricityMeterNo,
    gas_meter_no: input.gasMeterNo,
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

/**
 * Changes the unit's rent or a fixed monthly bill from a future month, then
 * tells the current tenant (in-app and/or email). Returns who was told.
 */
export async function scheduleUnitCharge(
  unitId: string,
  input: ScheduleChargeFormValues,
): Promise<ActionResult<{ notified: boolean }>> {
  await requireRole("landlord");
  if (!idSchema.safeParse(unitId).success) return fail(NOT_FOUND);
  const parsed = scheduleChargeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const change = parsed.data;

  const organization = await getCurrentOrganization();
  if (!organization) return fail(GENERIC_ERROR);
  if (change.effectiveMonth <= todayIn(organization.timezone).slice(0, 7)) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: { effectiveMonth: ["Choose next month or later."] },
    };
  }

  const supabase = await createClient();
  const { data: previous, error } = await supabase.rpc("set_unit_charge_item", {
    p_unit_id: unitId,
    p_charge_type_id: change.chargeTypeId,
    p_amount: change.amount,
    p_effective_month: `${change.effectiveMonth}-01`,
  });
  if (error) {
    if (error.code === DB_SCHEDULE_NOT_FUTURE) return fail("Choose next month or later.");
    if (error.code === DB_NOT_FOUND) return fail(NOT_FOUND);
    console.error("Schedule unit charge failed", error);
    return fail(GENERIC_ERROR);
  }

  // Tell the current tenant, if they can be reached.
  const [{ data: unit }, { data: type }] = await Promise.all([
    supabase
      .from("units")
      .select(
        "unit_number, property:properties!inner(name), tenancies(status, tenant:tenants!inner(id, full_name, email, user_id))",
      )
      .eq("id", unitId)
      .maybeSingle(),
    supabase.from("charge_types").select("label").eq("id", change.chargeTypeId).maybeSingle(),
  ]);
  const tenant = unit?.tenancies.find((t) => t.status === "active")?.tenant;
  let notified = false;
  if (unit && type && tenant && channelsFor(tenant).length > 0) {
    const content = chargeChange({
      tenantName: tenant.full_name,
      landlordName: organization.name,
      currency: organization.currency,
      home: `${unit.property.name} · Unit ${unit.unit_number}`,
      typeLabel: type.label,
      previousAmount: previous,
      amount: change.amount,
      effectiveMonth: change.effectiveMonth,
      link: `${getSiteUrl()}/tenant/rent`,
    });
    const outcomes = await deliver(supabase, {
      type: "charge_change",
      orgId: organization.id,
      tenantId: tenant.id,
      chargeId: null,
      channels: channelsFor(tenant),
      ...content,
    });
    notified = outcomes.some((o) => o.ok);
  }
  refresh();
  return ok({ notified });
}

/** Cancels a scheduled change that hasn't taken effect yet. */
export async function cancelScheduledCharge(itemId: string): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(itemId).success) return fail("This change no longer exists.");
  const organization = await getCurrentOrganization();
  if (!organization) return fail(GENERIC_ERROR);
  const thisMonth = `${todayIn(organization.timezone).slice(0, 7)}-01`;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("unit_charge_items")
    .delete()
    .eq("id", itemId)
    // Only future months: past and current amounts are the record of what was billed.
    .gt("effective_month", thisMonth)
    .select("effective_month")
    .maybeSingle();
  if (error) {
    console.error("Cancel scheduled charge failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail("This change has already taken effect or no longer exists.");
  refresh();
  return ok();
}
