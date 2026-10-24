"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type RowAction =
  | { label: string; href: string; destructive?: boolean }
  | { label: string; onSelect: () => void; destructive?: boolean };

/**
 * The "⋯" actions menu at the end of a list row. Links keep working from
 * server-rendered lists; client lists can pass `onSelect` to open a dialog.
 */
export function RowActions({
  label,
  actions,
  className,
}: {
  /** Accessible name, e.g. "Actions for Unit A1". */
  label: string;
  actions: RowAction[];
  className?: string;
}) {
  if (actions.length === 0) return null;
  return (
    // Non-modal: the page stays in the accessibility tree (axe: aria-hidden-focus).
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9 shrink-0 text-muted-foreground", className)}
          aria-label={label}
          data-row-actions
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {actions.map((action) =>
          "href" in action ? (
            <DropdownMenuItem
              key={action.label}
              asChild
              className={action.destructive ? "text-destructive focus:text-destructive" : undefined}
            >
              <Link href={action.href}>{action.label}</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={action.label}
              onSelect={action.onSelect}
              className={action.destructive ? "text-destructive focus:text-destructive" : undefined}
            >
              {action.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
