import { cn } from "@/lib/utils";
import type { TenancyStatus } from "@/types/domain";

const LABELS: Record<TenancyStatus, string> = { active: "Current", moved_out: "Moved out" };

const STYLES: Record<TenancyStatus, string> = {
  active: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  moved_out: "border-border bg-muted text-muted-foreground",
};

export function TenancyStatusBadge({ status }: { status: TenancyStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      {LABELS[status]}
    </span>
  );
}
