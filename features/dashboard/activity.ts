import { STATUS_LABELS } from "@/features/maintenance/schema";
import { formatMoney, formatMonth } from "@/lib/format";
import type { MaintenanceStatus } from "@/types/domain";
import type { ActivityEntry } from "./queries";

export type ActivityLine = { text: string; detail: string | null; href: string | null };

function str(value: unknown) {
  return typeof value === "string" ? value : null;
}

/** One readable line per activity_log event. Unknown events fall back to their name. */
export function describeActivity(entry: ActivityEntry, currency: string): ActivityLine {
  const who = entry.subject ?? "someone";
  const meta = entry.metadata;
  const amount = typeof meta.amount === "number" ? formatMoney(meta.amount, currency) : null;
  const tenantHref = (id: string | null) => (id ? `/tenants/${id}` : null);
  const chargeHref = str(meta.charge_id) ? `/rent/${meta.charge_id}` : null;

  switch (entry.event_type) {
    case "TENANT_CREATED":
      return { text: `Added tenant ${who}`, detail: null, href: tenantHref(entry.entity_id) };
    case "TENANT_MOVED_IN":
      return { text: `${who} moved in`, detail: entry.place, href: tenantHref(str(meta.tenant_id)) };
    case "TENANT_MOVED_OUT":
      return { text: `${who} moved out`, detail: entry.place, href: tenantHref(str(meta.tenant_id)) };
    case "TENANT_INVITE_CREATED":
      return { text: `Invite code created for ${who}`, detail: null, href: tenantHref(entry.entity_id) };
    case "TENANT_LINKED":
      return { text: `${who} connected to the app`, detail: null, href: tenantHref(entry.entity_id) };
    case "RENT_GENERATED": {
      const month = str(meta.billing_month);
      const count = typeof meta.count === "number" ? meta.count : 0;
      return {
        text: `Generated ${count} rent ${count === 1 ? "charge" : "charges"}${month ? ` for ${formatMonth(month)}` : ""}`,
        detail: null,
        href: month ? `/rent?month=${month.slice(0, 7)}` : "/rent",
      };
    }
    case "BILL_CREATED":
      return { text: `Bill${amount ? ` of ${amount}` : ""} for ${who}`, detail: null, href: `/rent/${entry.entity_id}` };
    case "CHARGE_VOIDED":
      return { text: `Voided a charge for ${who}`, detail: str(meta.reason), href: `/rent/${entry.entity_id}` };
    case "PAYMENT_RECORDED":
      return { text: `${amount ?? "Payment"} received from ${who}`, detail: null, href: chargeHref };
    case "PAYMENT_VOIDED":
      return {
        text: amount ? `Voided a ${amount} payment from ${who}` : `Voided a payment from ${who}`,
        detail: str(meta.reason),
        href: chargeHref,
      };
    case "MAINTENANCE_CREATED":
      return { text: `New request: ${who}`, detail: entry.place, href: `/maintenance/${entry.entity_id}` };
    case "MAINTENANCE_STATUS_CHANGED": {
      const to = str(meta.to) as MaintenanceStatus | null;
      return {
        text: `${who}: ${to && to in STATUS_LABELS ? STATUS_LABELS[to].toLowerCase() : "updated"}`,
        detail: entry.place,
        href: `/maintenance/${entry.entity_id}`,
      };
    }
    case "NOTICE_CREATED":
      return { text: `Notice published: ${who}`, detail: null, href: `/notices/${entry.entity_id}` };
    case "REMINDER_SENT":
      return { text: `Payment reminder sent to ${who}`, detail: null, href: tenantHref(entry.entity_id) };
    default:
      return {
        text: entry.event_type.toLowerCase().replaceAll("_", " "),
        detail: entry.subject,
        href: null,
      };
  }
}
