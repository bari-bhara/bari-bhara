import "server-only";
import { cache } from "react";
import { getCurrentUser, requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { pageRange, type Paged } from "@/lib/pagination";
import { id as idSchema } from "@/lib/zod-fields";
import type { MyNotice, NoticeOverview } from "@/types/domain";

/**
 * Notice reads. RLS returns landlords their org's notices and tenants only
 * published, unexpired notices aimed at their current homes. Call from inside
 * a <Suspense> boundary.
 */

export type NoticeListItem = Pick<
  NoticeOverview,
  "id" | "title" | "audience" | "publish_at" | "expires_at" | "property_name" | "unit_count" | "read_count"
>;

/** A page of notices, newest first. Without bodies, which the list doesn't show. */
export async function listNotices(page = 1): Promise<Paged<NoticeListItem>> {
  await requireRole("landlord");
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("notice_overview")
    .select("id, title, audience, publish_at, expires_at, property_name, unit_count, read_count", {
      count: "exact",
    })
    .order("publish_at", { ascending: false })
    .order("id")
    .range(...pageRange(page));
  if (error) throw new Error(`Failed to load notices: ${error.message}`);
  return { rows: data as NoticeListItem[], total: count ?? 0 };
}

export type NoticeDetail = NoticeOverview & { units: string[] };

export async function getNotice(id: string): Promise<NoticeDetail | null> {
  await requireRole("landlord");
  if (!idSchema.safeParse(id).success) return null;

  const supabase = await createClient();
  const [noticeResult, unitsResult] = await Promise.all([
    supabase.from("notice_overview").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("notice_units")
      .select("unit:units!inner(unit_number, property:properties!inner(name))")
      .eq("notice_id", id),
  ]);
  if (noticeResult.error) throw new Error(`Failed to load notice: ${noticeResult.error.message}`);
  if (unitsResult.error) throw new Error(`Failed to load notice units: ${unitsResult.error.message}`);
  if (!noticeResult.data) return null;

  const collator = new Intl.Collator("en", { numeric: true });
  return {
    ...(noticeResult.data as NoticeOverview),
    units: unitsResult.data
      .map((row) => `${row.unit.property.name} · Unit ${row.unit.unit_number}`)
      .sort(collator.compare),
  };
}

/** Properties and their units, for the audience picker. */
export async function listTargets() {
  await requireRole("landlord");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, name, units(id, unit_number)")
    .is("archived_at", null)
    .order("name");
  if (error) throw new Error(`Failed to load properties: ${error.message}`);

  const collator = new Intl.Collator("en", { numeric: true });
  return data.map((p) => ({
    id: p.id,
    name: p.name,
    units: [...p.units].sort((a, b) => collator.compare(a.unit_number, b.unit_number)),
  }));
}

/** A page of the tenant's notices, newest first. */
export async function listMyNotices(page = 1): Promise<Paged<MyNotice>> {
  await requireRole("tenant");
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("my_notices")
    .select("*", { count: "exact" })
    .order("publish_at", { ascending: false })
    .order("id")
    .range(...pageRange(page));
  if (error) throw new Error(`Failed to load notices: ${error.message}`);
  return { rows: data as MyNotice[], total: count ?? 0 };
}

export async function getMyNotice(id: string): Promise<MyNotice | null> {
  await requireRole("tenant");
  if (!idSchema.safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("my_notices").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load notice: ${error.message}`);
  return data as MyNotice | null;
}

/** Unread notices for the signed-in tenant (0 for anyone else). Used by the nav badge. */
export const getUnreadNoticeCount = cache(async (): Promise<number> => {
  const user = await getCurrentUser();
  if (user?.role !== "tenant") return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("my_notices")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) {
    console.error("Unread notice count failed", error);
    return 0;
  }
  return count ?? 0;
});
