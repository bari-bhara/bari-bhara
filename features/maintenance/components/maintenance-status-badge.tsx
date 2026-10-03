import { cn } from "@/lib/utils";
import type { MaintenanceStatus } from "@/types/domain";
import { STATUS_LABELS } from "../schema";

const STYLES: Record<MaintenanceStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  in_progress: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled: "border-border bg-muted text-muted-foreground",
};

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
