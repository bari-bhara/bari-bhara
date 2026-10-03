"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { GENERIC_ERROR, fail, invalid, type ActionResult } from "@/lib/action-result";
import { getCurrentOrganization, requireRole } from "@/lib/dal";
import { zonedDateTimeToIso } from "@/lib/format";
import { DB_NOTICE_NEEDS_UNITS, PG_FOREIGN_KEY_VIOLATION } from "@/lib/postgres-errors";
import { sqlNull } from "@/lib/supabase/rpc";
import { createClient } from "@/lib/supabase/server";
import { id as idSchema } from "@/lib/zod-fields";
import { noticeSchema, type NoticeInput } from "./schema";

export async function createNotice(input: NoticeInput): Promise<ActionResult> {
  await requireRole("landlord");
  const parsed = noticeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const notice = parsed.data;
  if (notice.propertyId && !idSchema.safeParse(notice.propertyId).success) return fail("Choose a property.");
  if (notice.unitIds.some((u) => !idSchema.safeParse(u).success)) return fail("Choose valid units.");

  const organization = await getCurrentOrganization();
  if (!organization) return fail(GENERIC_ERROR);
  const timezone = organization.timezone;

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_notice", {
    p_org_id: organization.id,
    p_title: notice.title,
    p_body: notice.body,
    p_audience: notice.audience,
    p_property_id: sqlNull(notice.audience === "property" ? notice.propertyId : null),
    p_unit_ids: sqlNull(notice.audience === "units" ? notice.unitIds : null),
    // Empty publish time = now (the RPC defaults it).
    p_publish_at: sqlNull(notice.publishAt ? zonedDateTimeToIso(notice.publishAt, timezone) : null),
    p_expires_at: sqlNull(notice.expiresAt ? zonedDateTimeToIso(notice.expiresAt, timezone) : null),
  });
  if (error) {
    if (error.code === DB_NOTICE_NEEDS_UNITS) return fail("Choose at least one unit.");
    if (error.code === PG_FOREIGN_KEY_VIOLATION) return fail("A chosen property or unit no longer exists.");
    console.error("Create notice failed", error);
    return fail(GENERIC_ERROR);
  }
  redirect(`/notices/${id}`);
}

export async function deleteNotice(id: string): Promise<ActionResult> {
  await requireRole("landlord");
  if (!idSchema.safeParse(id).success) return fail("This notice no longer exists.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("notices").delete().eq("id", id).select("id").maybeSingle();
  if (error) {
    console.error("Delete notice failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail("This notice no longer exists.");
  redirect("/notices");
}

/** Records that the tenant opened a notice. Idempotent. */
export async function markNoticeRead(id: string): Promise<ActionResult> {
  await requireRole("tenant");
  if (!idSchema.safeParse(id).success) return fail("This notice no longer exists.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("notice_reads")
    .upsert({ notice_id: id }, { onConflict: "notice_id,user_id", ignoreDuplicates: true });
  if (error) {
    console.error("Mark notice read failed", error);
    return fail(GENERIC_ERROR);
  }
  // Updates the nav badge and inbox.
  refresh();
  return { ok: true, data: undefined };
}
