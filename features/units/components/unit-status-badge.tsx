import { cn } from "@/lib/utils";
import type { UnitStatus } from "@/types/domain";
import { UNIT_STATUS_LABELS } from "../schema";

const STYLES: Record<UnitStatus, string> = {
  vacant: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  occupied: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  maintenance: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  inactive: "border-border bg-muted text-muted-foreground",
};

export function UnitStatusBadge({ status, className }: { status: UnitStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        STYLES[status],
        className,
      )}
    >
      {UNIT_STATUS_LABELS[status]}
    </span>
  );
}
