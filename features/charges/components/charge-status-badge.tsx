import { cn } from "@/lib/utils";
import type { EffectiveStatus } from "@/types/domain";
import { EFFECTIVE_STATUS_LABELS } from "../schema";

const STYLES: Record<EffectiveStatus, string> = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  partially_paid: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  unpaid: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  overdue: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  void: "border-border bg-muted text-muted-foreground line-through",
};

export function ChargeStatusBadge({ status }: { status: EffectiveStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      {EFFECTIVE_STATUS_LABELS[status]}
    </span>
  );
}
