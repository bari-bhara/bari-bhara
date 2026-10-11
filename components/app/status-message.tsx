import type { LucideIcon } from "lucide-react";
import { IconRing } from "./icon-ring";

/**
 * A whole-page message (not found, error). Unlike EmptyState it carries the
 * page's h1, since it replaces the page.
 */
export function StatusMessage({
  icon: Icon,
  title,
  description,
  reference,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Shown small under the description, e.g. an error digest to quote to support. */
  reference?: string;
  /** Actions (links or buttons). */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center sm:py-24">
      <IconRing icon={Icon} className="mb-6" />
      <h1 className="font-display text-2xl font-normal sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {reference && <p className="mt-2 font-mono text-xs text-muted-foreground">Reference: {reference}</p>}
      {children && <div className="mt-6 flex flex-col gap-2 sm:flex-row">{children}</div>}
    </div>
  );
}
