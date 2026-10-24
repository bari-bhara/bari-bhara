"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Clicks on these keep their own behaviour instead of opening the row. */
const INTERACTIVE = "a, button, input, select, textarea, label";

/**
 * A table row that opens `href` when clicked anywhere, like the whole-card
 * links on phones. The row's first-column link stays the keyboard and
 * screen-reader target, so the row itself isn't an extra tab stop.
 */
export function ClickableRow({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function onClick(event: React.MouseEvent<HTMLTableRowElement>) {
    const target = event.target as HTMLElement;
    // React events bubble out of portals (menus, dialogs opened from the row);
    // only clicks on the row's own DOM count.
    if (!event.currentTarget.contains(target)) return;
    if (target.closest(INTERACTIVE)) return;
    // Don't hijack text selection.
    if (window.getSelection()?.toString()) return;
    if (event.metaKey || event.ctrlKey) {
      window.open(href, "_blank", "noopener");
      return;
    }
    router.push(href);
  }

  return (
    <TableRow className={cn("cursor-pointer", className)} onClick={onClick}>
      {children}
    </TableRow>
  );
}
