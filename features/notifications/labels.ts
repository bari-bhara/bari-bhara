import type { NotificationChannel } from "@/lib/notifications/types";

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: "in-app",
  email: "email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

/** ["in_app", "email"] → "in-app and email". */
export function joinChannels(channels: NotificationChannel[]) {
  const labels = channels.map((c) => CHANNEL_LABELS[c]);
  return labels.length <= 1 ? labels.join("") : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

/** How a tenant can be reached, for confirmations; null if they can't. */
export function describeReach(tenant: { user_id: string | null; email: string }) {
  if (tenant.user_id && tenant.email) return `in the app and by email to ${tenant.email}`;
  if (tenant.user_id) return "in the app (no email on file)";
  if (tenant.email) return `by email to ${tenant.email} (they don't use the app yet)`;
  return null;
}
