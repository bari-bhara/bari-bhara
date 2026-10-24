import "server-only";
import type { NotificationChannel } from "./types";

export type Recipient = { id: string; full_name: string; email: string; user_id: string | null };

/** In-app if the tenant has a login, email if they have an address. */
export function channelsFor(tenant: Pick<Recipient, "email" | "user_id">): NotificationChannel[] {
  const channels: NotificationChannel[] = [];
  if (tenant.user_id) channels.push("in_app");
  if (tenant.email) channels.push("email");
  return channels;
}
