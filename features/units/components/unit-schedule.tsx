import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { formatMoney, formatMonth } from "@/lib/format";
import { cancelScheduledCharge } from "../actions";
import type { ScheduleLine } from "../queries";

/** The unit's monthly items: what's billed now and what changes when. */
export function UnitSchedule({ lines, currency }: { lines: ScheduleLine[]; currency: string }) {
  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing is billed automatically yet.</p>;
  }
  return (
    <ul className="divide-y" aria-label="Monthly charges">
      {lines.map((line) => (
        <li key={line.chargeTypeId} className="grid gap-1 py-3 first:pt-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{line.label}</span>
            <span className="tabular-nums">
              {line.current > 0 ? formatMoney(line.current, currency) : "Not billed now"}
            </span>
          </div>
          {line.upcoming.map((change) => (
            <div key={change.id} className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                From {formatMonth(change.month)}:{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {change.amount > 0 ? formatMoney(change.amount, currency) : "stops"}
                </span>
              </span>
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Cancel the ${line.label.toLowerCase()} change from ${formatMonth(change.month)}`}
                  >
                    Cancel
                  </Button>
                }
                title="Cancel this change?"
                description={`${line.label} stays as it is from ${formatMonth(change.month)}. The tenant isn't told automatically.`}
                confirmLabel="Cancel change"
                pendingLabel="Cancelling…"
                successMessage="Change cancelled."
                onConfirm={cancelScheduledCharge.bind(null, change.id)}
              />
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}
