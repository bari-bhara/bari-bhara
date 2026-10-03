import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CHANNEL_LABELS } from "../labels";
import type { ReminderRow } from "../queries";

const STATUS_STYLES = {
  sent: "text-emerald-700 dark:text-emerald-400",
  failed: "text-destructive",
  pending: "text-muted-foreground",
} as const;

/** Reminder deliveries with their outcome. */
export function RemindersList({ reminders, timeZone }: { reminders: ReminderRow[]; timeZone?: string }) {
  if (reminders.length === 0) return <p className="text-sm text-muted-foreground">No reminders sent yet.</p>;
  return (
    <ul className="divide-y" aria-label="Reminders">
      {reminders.map((r) => (
        <li key={r.id} className="grid gap-0.5 py-2 text-sm first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium capitalize">
              {CHANNEL_LABELS[r.channel]}
              {r.recipient_email && <span className="font-normal normal-case text-muted-foreground"> · {r.recipient_email}</span>}
            </span>
            <span className={cn("font-medium capitalize", STATUS_STYLES[r.status])}>{r.status}</span>
          </div>
          <span className="text-xs text-muted-foreground">{formatDateTime(r.created_at, timeZone)}</span>
          {r.status === "failed" && r.error && <span className="text-xs text-destructive">{r.error}</span>}
        </li>
      ))}
    </ul>
  );
}
