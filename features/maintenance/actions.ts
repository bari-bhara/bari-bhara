"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  GENERIC_ERROR,
  fail,
  invalid,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import { requireRole, verifySession } from "@/lib/dal";
import {
  DB_NOT_FOUND,
  DB_PHOTO_PATH_INVALID,
  DB_TOO_MANY_PHOTOS,
} from "@/lib/postgres-errors";
import { filledByTrigger } from "@/lib/supabase/insert";
import { createClient } from "@/lib/supabase/server";
import { id as idSchema } from "@/lib/zod-fields";
import {
  PHOTO_LIMITS,
  assignSchema,
  commentSchema,
  landlordRequestSchema,
  statusChangeSchema,
  tenantRequestSchema,
  type AssignInput,
  type CommentInput,
  type LandlordRequestInput,
  type StatusChangeInput,
  type TenantRequestInput,
} from "./schema";

const NOT_FOUND = "This request no longer exists.";

/** A landlord raises an issue for a unit (linked to its current tenant, if any). */
export async function createLandlordRequest(input: LandlordRequestInput): Promise<ActionResult> {
  await requireRole("landlord");
  const parsed = landlordRequestSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("org_id")
    .eq("id", parsed.data.unitId)
    .maybeSingle();
  if (unitError) {
    console.error("Load unit failed", unitError);
    return fail(GENERIC_ERROR);
  }
  if (!unit) return fail("This unit no longer exists.");

  const { data, error } = await supabase
    .from("maintenance_requests")
    .insert({
      org_id: unit.org_id,
      unit_id: parsed.data.unitId,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description,
    })
    .select("id")
    .single();
  if (error) {
    console.error("Create request failed", error);
    return fail(GENERIC_ERROR);
  }
  redirect(`/maintenance/${data.id}`);
}

/**
 * A tenant reports an issue. Returns ids so the browser can upload photos to
 * `{orgId}/{requestId}/…` before navigating to the request.
 */
export async function createTenantRequest(
  input: TenantRequestInput,
): Promise<ActionResult<{ requestId: string; orgId: string }>> {
  await requireRole("tenant");
  const parsed = tenantRequestSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("create_maintenance_request", {
      p_tenancy_id: parsed.data.tenancyId,
      p_category: parsed.data.category,
      p_title: parsed.data.title,
      p_description: parsed.data.description,
    })
    .single();
  if (error) {
    if (error.code === DB_NOT_FOUND) return fail("You can only report issues for your current home.");
    console.error("Create tenant request failed", error);
    return fail(GENERIC_ERROR);
  }
  return ok({ requestId: data.request_id, orgId: data.request_org_id });
}

/** Records photos the browser already uploaded to Storage. Either role. */
export async function registerPhotos(requestId: string, paths: string[]): Promise<ActionResult> {
  await verifySession();
  if (!idSchema.safeParse(requestId).success) return fail(NOT_FOUND);
  const parsedPaths = z.array(z.string().min(1).max(300)).max(PHOTO_LIMITS.maxCount).safeParse(paths);
  if (!parsedPaths.success || parsedPaths.data.length === 0) return fail("No photos to add.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("maintenance_photos")
    .insert(
      parsedPaths.data.map((storage_path) =>
        filledByTrigger<"maintenance_photos", "org_id">({ request_id: requestId, storage_path }, ["org_id"]),
      ),
    );
  if (error) {
    if (error.code === DB_TOO_MANY_PHOTOS) return fail(`A request can have at most ${PHOTO_LIMITS.maxCount} photos.`);
    if (error.code === DB_PHOTO_PATH_INVALID) return fail("A photo didn't finish uploading. Please try again.");
    console.error("Register photos failed", error);
    return fail(GENERIC_ERROR);
  }
  refresh();
  return ok();
}

/** Comment on a request. Only landlords can post internal notes. */
export async function addComment(requestId: string, input: CommentInput): Promise<ActionResult> {
  const user = await verifySession();
  if (!idSchema.safeParse(requestId).success) return fail(NOT_FOUND);
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("maintenance_updates").insert(
    filledByTrigger<"maintenance_updates", "org_id">(
      {
        request_id: requestId,
        body: parsed.data.body,
        is_internal: user.role === "landlord" && parsed.data.isInternal,
      },
      ["org_id"],
    ),
  );
  if (error) {
    console.error("Add comment failed", error);
    return fail(GENERIC_ERROR);
  }
  refresh();
  return ok();
}

/** Landlord changes status; an optional note is added after the status row. */
export async function changeStatus(requestId: string, input: StatusChangeInput): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(requestId).success) return fail(NOT_FOUND);
  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_requests")
    .update({ status: parsed.data.status })
    .eq("id", requestId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Change status failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail(NOT_FOUND);

  if (parsed.data.note) {
    const { error: noteError } = await supabase.from("maintenance_updates").insert(
      filledByTrigger<"maintenance_updates", "org_id">(
        { request_id: requestId, body: parsed.data.note, is_internal: parsed.data.noteIsInternal },
        ["org_id"],
      ),
    );
    if (noteError) {
      console.error("Add status note failed", noteError);
      refresh();
      return fail("The status changed, but the note wasn't saved. Please add it again.");
    }
  }
  refresh();
  return ok();
}

export async function assign(requestId: string, input: AssignInput): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(requestId).success) return fail(NOT_FOUND);
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_requests")
    .update({ assigned_to: parsed.data.assignedTo })
    .eq("id", requestId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Assign failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail(NOT_FOUND);
  refresh();
  return ok();
}

/** The requesting tenant cancels while it's still pending. */
export async function cancelRequest(requestId: string): Promise<ActionResult> {
  await requireRole("tenant");
  if (!idSchema.safeParse(requestId).success) return fail(NOT_FOUND);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_maintenance_request", {
    p_request_id: requestId,
  });
  if (error) {
    console.error("Cancel request failed", error);
    return fail(GENERIC_ERROR);
  }
  if (data === "not_found") return fail(NOT_FOUND);
  if (data === "not_pending") return fail("Work has already started, so this can't be cancelled. Add a comment instead.");
  refresh();
  return ok();
}
