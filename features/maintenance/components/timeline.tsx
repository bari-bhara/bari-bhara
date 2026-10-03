import { ArrowRight, Lock } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MaintenanceUpdate } from "@/types/domain";
import { STATUS_LABELS } from "../schema";

/**
 * A request's history: comments, internal notes (landlords only; RLS never
 * returns them to tenants) and status changes, oldest first.
 */
export function Timeline({
  updates,
  authorLabel,
  timeZone,
}: {
  updates: MaintenanceUpdate[];
  /** Display name for an author id (e.g. "You", the tenant's name, "Landlord"). */
  authorLabel: (authorId: string | null) => string;
  timeZone?: string;
}) {
  if (updates.length === 0) {
    return <p className="text-sm text-muted-foreground">No updates yet.</p>;
  }
  return (
    <ol className="grid gap-3" aria-label="Updates">
      {updates.map((update) => {
        const when = formatDate(update.created_at, timeZone);
        return (
          <li
            key={update.id}
            className={cn(
              "rounded-lg border p-3",
              update.is_internal && "border-dashed border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{authorLabel(update.author_id)}</span>
              <span>{when}</span>
            </div>
            {update.status_to && (
              <p className="mt-1 flex flex-wrap items-center gap-1 text-sm">
                {update.status_from ? STATUS_LABELS[update.status_from] : "New"}
                <ArrowRight className="h-3.5 w-3.5" aria-label="to" />
                <span className="font-medium">{STATUS_LABELS[update.status_to]}</span>
              </p>
            )}
            {update.is_internal && (
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                <Lock className="h-3 w-3" aria-hidden /> Internal note: hidden from the tenant
              </p>
            )}
            {update.body && <p className="mt-1 whitespace-pre-line text-sm">{update.body}</p>}
          </li>
        );
      })}
    </ol>
  );
}
