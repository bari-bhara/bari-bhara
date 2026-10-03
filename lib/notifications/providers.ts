import "server-only";
import type { NotificationChannel, NotificationProvider, OutgoingMessage, SendResult } from "./types";

/** In-app: the notifications row *is* the delivery; the tenant portal lists it. */
export const inAppProvider: NotificationProvider = {
  channel: "in_app",
  name: "In-app",
  async send() {
    return { ok: true };
  },
};

function senderFrom(value: string) {
  // EMAIL_FROM is either "name@domain" or "Name <name@domain>".
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { name: match[1], email: match[2] } : { name: "", email: value.trim() };
}

async function errorText(response: Response) {
  const body = await response.text().catch(() => "");
  return `HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`;
}

/** Production email via the Resend HTTP API (no SDK needed). */
export function resendProvider(apiKey: string, from: string): NotificationProvider {
  return {
    channel: "email",
    name: "Resend",
    async send(message: OutgoingMessage): Promise<SendResult> {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [message.recipientEmail],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      return response.ok ? { ok: true } : { ok: false, error: `Resend ${await errorText(response)}` };
    },
  };
}

/**
 * Development email via the local Supabase mail catcher (Mailpit). Messages
 * show up at MAILPIT_URL (http://127.0.0.1:54324) and never leave the machine.
 */
export function mailpitProvider(baseUrl: string, from: string): NotificationProvider {
  const sender = senderFrom(from);
  return {
    channel: "email",
    name: "Mailpit",
    async send(message: OutgoingMessage): Promise<SendResult> {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: { Email: sender.email, Name: sender.name },
          To: [{ Email: message.recipientEmail }],
          Subject: message.subject,
          Text: message.text,
          HTML: message.html,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      return response.ok ? { ok: true } : { ok: false, error: `Mailpit ${await errorText(response)}` };
    },
  };
}

const unconfiguredEmail: NotificationProvider = {
  channel: "email",
  name: "Email (not configured)",
  async send() {
    return { ok: false, error: "Email isn't configured (set RESEND_API_KEY, or MAILPIT_URL in development)." };
  },
};

/**
 * The provider for a channel. Email: Resend if RESEND_API_KEY is set, else
 * Mailpit if MAILPIT_URL is set (dev), else one that fails with a clear reason,
 * so the row is recorded as failed rather than silently dropped.
 */
export function providerFor(channel: NotificationChannel): NotificationProvider | null {
  if (channel === "in_app") return inAppProvider;
  if (channel === "email") {
    const from = process.env.EMAIL_FROM || "Bari_bhara <noreply@baribhara.local>";
    if (process.env.RESEND_API_KEY) return resendProvider(process.env.RESEND_API_KEY, from);
    if (process.env.MAILPIT_URL) return mailpitProvider(process.env.MAILPIT_URL, from);
    return unconfiguredEmail;
  }
  return null;
}
