import "server-only";
import { cache } from "react";
import { getHomeLabels } from "@/features/tenant-portal/queries";
import { getCurrentUser, requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { id as idSchema } from "@/lib/zod-fields";
import type { Database } from "@/lib/supabase/database.types";

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type ReminderRow = Pick<
  Notification,
  "id" | "channel" | "status" | "error" | "recipient_email" | "created_at" | "sent_at"
>;

const REMINDER_COLUMNS = "id, channel, status, error, recipient_email, created_at, sent_at";

/** Reminder deliveries for a charge or a tenant, newest first (landlord). */
export async function listReminders(filter: { chargeId: string } | { tenantId: string }): Promise<ReminderRow[]> {
  await requireRole("landlord");
  const id = "chargeId" in filter ? filter.chargeId : filter.tenantId;
  if (!idSchema.safeParse(id).success) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(REMINDER_COLUMNS)
    .eq("chargeId" in filter ? "charge_id" : "tenant_id", id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`Failed to load reminders: ${error.message}`);
  return data;
}

/**
 * The tenant's in-app notifications, newest first (RLS limits it to theirs),
 * each labelled with the home it's about.
 */
export async function listMyNotifications(): Promise<(Notification & { home: string })[]> {
  await requireRole("tenant");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Failed to load notifications: ${error.message}`);

  // A charge's reminder is about that charge's home; others about the tenant's homes in that org.
  const chargeIds = [...new Set(data.flatMap((n) => (n.charge_id ? [n.charge_id] : [])))];
  const [homes, charges] = await Promise.all([
    getHomeLabels(),
    chargeIds.length > 0
      ? supabase.from("charges").select("id, tenancy_id").in("id", chargeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (charges.error) throw new Error(`Failed to load notifications: ${charges.error.message}`);
  const chargeTenancy = new Map((charges.data ?? []).map((c) => [c.id, c.tenancy_id]));

  return data.map((n) => {
    const tenancyId = n.charge_id ? chargeTenancy.get(n.charge_id) : undefined;
    const home = tenancyId
      ? (homes.byTenancy.get(tenancyId) ?? "")
      : homes.forNotice({ org_id: n.org_id, audience: "all", property_id: null });
    return { ...n, home };
  });
}

/** Unread in-app notifications for the signed-in tenant (0 for anyone else). */
export const getUnreadNotificationCount = cache(async (): Promise<number> => {
  const user = await getCurrentUser();
  if (user?.role !== "tenant") return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("channel", "in_app")
    .is("read_at", null);
  if (error) {
    console.error("Unread notification count failed", error);
    return 0;
  }
  return count ?? 0;
});

/** How a tenant can be contacted (landlord). */
export async function getTenantContact(tenantId: string) {
  await requireRole("landlord");
  if (!idSchema.safeParse(tenantId).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("id, full_name, email, user_id")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load tenant: ${error.message}`);
  return data;
}
