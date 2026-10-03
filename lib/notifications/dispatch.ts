import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { providerFor } from "./providers";
import type { NotificationChannel } from "./types";

export type DeliveryRequest = {
  orgId: string;
  tenantId: string;
  chargeId: string | null;
  channels: NotificationChannel[];
  subject: string;
  text: string;
  html?: string;
};

export type DeliveryOutcome = { channel: NotificationChannel; ok: boolean; error?: string };

/**
 * Records one 'pending' row per channel (recipients are filled from the tenant
 * record by the database), sends each through its provider, and records the
 * result. A provider failure or exception is stored on the row, never lost.
 */
export async function deliver(
  supabase: SupabaseClient<Database>,
  request: DeliveryRequest,
): Promise<DeliveryOutcome[]> {
  const { data: rows, error } = await supabase
    .from("notifications")
    .insert(
      request.channels.map((channel) => ({
        org_id: request.orgId,
        tenant_id: request.tenantId,
        charge_id: request.chargeId,
        type: "payment_reminder" as const,
        channel,
        subject: request.subject,
        message: request.text,
      })),
    )
    .select("id, channel, recipient_email");
  if (error) {
    console.error("Recording notifications failed", error);
    return request.channels.map((channel) => ({ channel, ok: false, error: "Couldn't record the reminder." }));
  }

  return Promise.all(
    rows.map(async (row): Promise<DeliveryOutcome> => {
      const provider = providerFor(row.channel);
      let result: { ok: true } | { ok: false; error: string };
      if (!provider) {
        result = { ok: false, error: `No provider for ${row.channel}.` };
      } else {
        try {
          result = await provider.send({
            recipientEmail: row.recipient_email,
            subject: request.subject,
            text: request.text,
            html: request.html,
          });
        } catch (cause) {
          result = { ok: false, error: `${provider.name}: ${cause instanceof Error ? cause.message : String(cause)}` };
        }
      }

      const { error: updateError } = await supabase
        .from("notifications")
        .update(result.ok ? { status: "sent" } : { status: "failed", error: result.error.slice(0, 500) })
        .eq("id", row.id);
      if (updateError) console.error("Recording delivery result failed", updateError);
      if (!result.ok) console.error(`Notification ${row.id} via ${row.channel} failed: ${result.error}`);

      return result.ok ? { channel: row.channel, ok: true } : { channel: row.channel, ok: false, error: result.error };
    }),
  );
}
