"use client";

import { BellRing } from "lucide-react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { sendChargeReminder, type ReminderSummary } from "../actions";
import { CHANNEL_LABELS, joinChannels } from "../labels";

/** Landlord: remind the tenant about one open charge. */
export function SendReminderButton({
  chargeId,
  tenantName,
  reach,
}: {
  chargeId: string;
  tenantName: string;
  /** How they'll be reached, e.g. "in the app and by email to …". */
  reach: string;
}) {
  return (
    <ConfirmDialog<ReminderSummary>
      trigger={
        <Button variant="outline">
          <BellRing aria-hidden /> Send reminder
        </Button>
      }
      title={`Remind ${tenantName}?`}
      description={`They'll get a payment reminder for this charge ${reach}.`}
      confirmLabel="Send reminder"
      pendingLabel="Sending…"
      successMessage={({ sent, failed }) =>
        failed.length === 0
          ? `Reminder sent (${joinChannels(sent)}).`
          : sent.length > 0
            ? `Sent ${joinChannels(sent)}; ${failed.map((c) => CHANNEL_LABELS[c]).join(", ")} failed.`
            : "The reminder couldn't be delivered. See the reminders list for details."
      }
      onConfirm={() => sendChargeReminder(chargeId)}
    />
  );
}
