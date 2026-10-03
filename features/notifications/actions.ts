"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { GENERIC_ERROR, fail, ok, type ActionResult } from "@/lib/action-result";
import { getCurrentOrganization, requireRole } from "@/lib/dal";
import { deliver } from "@/lib/notifications/dispatch";
import { paymentReminder, type ReminderCharge } from "@/lib/notifications/templates";
import type { NotificationChannel } from "@/lib/notifications/types";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { id as idSchema } from "@/lib/zod-fields";
import type { ChargeOverview, Organization } from "@/types/domain";

/** Bulk reminders skip tenants who were successfully reminded this recently. */
const RECENT_REMINDER_HOURS = 20;

type Recipient = { id: string; full_name: string; email: string; user_id: string | null };

function channelsFor(tenant: Recipient): NotificationChannel[] {
  const channels: NotificationChannel[] = [];
  if (tenant.user_id) channels.push("in_app");
  if (tenant.email) channels.push("email");
  return channels;
}

function toReminderCharge(charge: ChargeOverview): ReminderCharge {
  return {
    typeLabel: charge.type_label,
    billingMonth: charge.billing_month,
    outstanding: charge.outstanding,
    dueDate: charge.due_date,
    overdue: charge.effective_status === "overdue",
  };
}

async function remind(
  supabase: SupabaseClient<Database>,
  organization: Organization,
  tenant: Recipient,
  charges: ChargeOverview[],
  chargeId: string | null,
) {
  const content = paymentReminder({
    tenantName: tenant.full_name,
    landlordName: organization.name,
    currency: organization.currency,
    charges: charges.map(toReminderCharge),
    link: `${getSiteUrl()}/tenant/rent`,
  });
  return deliver(supabase, {
    orgId: organization.id,
    tenantId: tenant.id,
    chargeId,
    channels: channelsFor(tenant),
    ...content,
  });
}

export type ReminderSummary = { sent: NotificationChannel[]; failed: NotificationChannel[] };

/** Reminds the tenant about one open charge, in-app and/or by email. */
export async function sendChargeReminder(chargeId: string): Promise<ActionResult<ReminderSummary>> {
  await requireRole("landlord");
  if (!idSchema.safeParse(chargeId).success) return fail("This charge no longer exists.");

  const supabase = await createClient();
  const [{ data: charge, error }, organization] = await Promise.all([
    supabase.from("charge_overview").select("*").eq("id", chargeId).maybeSingle(),
    getCurrentOrganization(),
  ]);
  if (error) {
    console.error("Load charge for reminder failed", error);
    return fail(GENERIC_ERROR);
  }
  if (!charge || !organization) return fail("This charge no longer exists.");
  const row = charge as ChargeOverview;
  if (row.outstanding <= 0) return fail("Nothing is owed on this charge.");

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, full_name, email, user_id")
    .eq("id", row.tenant_id)
    .single();
  if (tenantError) {
    console.error("Load tenant for reminder failed", tenantError);
    return fail(GENERIC_ERROR);
  }
  if (channelsFor(tenant).length === 0) {
    return fail(`${tenant.full_name} has no app login or email address, so they can't be reminded here.`);
  }

  const outcomes = await remind(supabase, organization, tenant, [row], row.id);
  refresh();
  return ok({
    sent: outcomes.filter((o) => o.ok).map((o) => o.channel),
    failed: outcomes.filter((o) => !o.ok).map((o) => o.channel),
  });
}

export type BulkReminderSummary = {
  reminded: number;
  failedDeliveries: number;
  skippedRecent: number;
  unreachable: string[];
};

/** One reminder per tenant with overdue charges, listing all of them. */
export async function sendOverdueReminders(): Promise<ActionResult<BulkReminderSummary>> {
  await requireRole("landlord");
  const organization = await getCurrentOrganization();
  if (!organization) return fail(GENERIC_ERROR);
  const supabase = await createClient();

  const { data: overdue, error } = await supabase
    .from("charge_overview")
    .select("*")
    .eq("org_id", organization.id)
    .eq("effective_status", "overdue")
    .order("due_date");
  if (error) {
    console.error("Load overdue charges failed", error);
    return fail(GENERIC_ERROR);
  }
  const byTenant = new Map<string, ChargeOverview[]>();
  for (const charge of overdue as ChargeOverview[]) {
    byTenant.set(charge.tenant_id, [...(byTenant.get(charge.tenant_id) ?? []), charge]);
  }
  if (byTenant.size === 0) return ok({ reminded: 0, failedDeliveries: 0, skippedRecent: 0, unreachable: [] });

  const tenantIds = [...byTenant.keys()];
  const since = new Date(Date.now() - RECENT_REMINDER_HOURS * 3600_000).toISOString();
  const [tenantsResult, recentResult] = await Promise.all([
    supabase.from("tenants").select("id, full_name, email, user_id").in("id", tenantIds),
    supabase
      .from("notifications")
      .select("tenant_id")
      .in("tenant_id", tenantIds)
      .eq("type", "payment_reminder")
      .eq("status", "sent")
      .gte("created_at", since),
  ]);
  if (tenantsResult.error || recentResult.error) {
    console.error("Load reminder recipients failed", tenantsResult.error ?? recentResult.error);
    return fail(GENERIC_ERROR);
  }
  const recent = new Set(recentResult.data.map((r) => r.tenant_id));

  const summary: BulkReminderSummary = { reminded: 0, failedDeliveries: 0, skippedRecent: 0, unreachable: [] };
  // Sequential: keeps provider rate limits and the database calm. Fine for v1 volumes.
  for (const tenant of tenantsResult.data) {
    if (recent.has(tenant.id)) {
      summary.skippedRecent += 1;
      continue;
    }
    if (channelsFor(tenant).length === 0) {
      summary.unreachable.push(tenant.full_name);
      continue;
    }
    const outcomes = await remind(supabase, organization, tenant, byTenant.get(tenant.id)!, null);
    if (outcomes.some((o) => o.ok)) summary.reminded += 1;
    summary.failedDeliveries += outcomes.filter((o) => !o.ok).length;
  }
  refresh();
  return ok(summary);
}

/** Tenant: marks all their in-app notifications read. */
export async function markAllNotificationsRead(): Promise<ActionResult> {
  await requireRole("tenant");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_notifications_read", {});
  if (error) {
    console.error("Mark notifications read failed", error);
    return fail(GENERIC_ERROR);
  }
  if (data > 0) refresh();
  return ok();
}
