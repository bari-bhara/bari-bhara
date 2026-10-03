import { cn } from "@/lib/utils";
import type { NoticeState } from "../schema";

const LABELS: Record<NoticeState, string> = { scheduled: "Scheduled", live: "Live", expired: "Expired" };
const STYLES: Record<NoticeState, string> = {
  scheduled: "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
  live: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  expired: "border-border bg-muted text-muted-foreground",
};

export function NoticeStateBadge({ state }: { state: NoticeState }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", STYLES[state])}>
      {LABELS[state]}
    </span>
  );
}
