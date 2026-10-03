"use client";

import { BellRing } from "lucide-react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { sendOverdueReminders, type BulkReminderSummary } from "../actions";

function summarize({ reminded, failedDeliveries, skippedRecent, unreachable }: BulkReminderSummary) {
  const parts = [
    reminded === 0 ? "No reminders sent" : `Reminded ${reminded} ${reminded === 1 ? "tenant" : "tenants"}`,
  ];
  if (failedDeliveries > 0) parts.push(`${failedDeliveries} ${failedDeliveries === 1 ? "delivery" : "deliveries"} failed`);
  if (skippedRecent > 0) parts.push(`${skippedRecent} already reminded today`);
  if (unreachable.length > 0) parts.push(`can't reach ${unreachable.join(", ")} (no login or email)`);
  return `${parts.join("; ")}.`;
}

/** Landlord: one reminder to every tenant with overdue charges. */
export function RemindOverdueButton({
  count,
  size = "default",
}: {
  /** Overdue charges, if known; the button hides at 0. */
  count?: number;
  size?: "default" | "sm";
}) {
  if (count === 0) return null;
  return (
    <ConfirmDialog<BulkReminderSummary>
      trigger={
        <Button variant="outline" size={size}>
          <BellRing aria-hidden /> Remind overdue tenants
        </Button>
      }
      title="Remind every overdue tenant?"
      description="Each tenant with overdue charges gets one reminder listing them, in the app and by email where possible. Tenants reminded in the last 20 hours are skipped."
      confirmLabel="Send reminders"
      pendingLabel="Sending…"
      successMessage={summarize}
      onConfirm={() => sendOverdueReminders()}
    />
  );
}
