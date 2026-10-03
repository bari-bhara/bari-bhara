import type { Database } from "@/lib/supabase/database.types";

export type NotificationChannel = Database["public"]["Enums"]["notification_channel"];

/** What a provider delivers. Recipients come from the notifications row. */
export type OutgoingMessage = {
  recipientEmail: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendResult = { ok: true } | { ok: false; error: string };

/**
 * A delivery channel (ADR 0005). Adding SMS or WhatsApp means adding a
 * provider for that channel; nothing else changes.
 */
export interface NotificationProvider {
  readonly channel: NotificationChannel;
  /** For logs and error messages, e.g. "Resend". */
  readonly name: string;
  send(message: OutgoingMessage): Promise<SendResult>;
}
