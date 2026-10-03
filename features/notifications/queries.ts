import "server-only";
import { cache } from "react";
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

/** The tenant's in-app notifications, newest first (RLS limits it to theirs). */
export async function listMyNotifications(): Promise<Notification[]> {
  await requireRole("tenant");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Failed to load notifications: ${error.message}`);
  return data;
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
