import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  /** Makes the whole card a link (stretched over the label). */
  href?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface flex flex-col p-4 sm:p-5",
        href && "relative transition-colors hover:border-foreground/20 hover:bg-accent/50",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {href ? (
            <Link
              href={href}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {label}
            </Link>
          ) : (
            label
          )}
        </p>
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-muted-foreground">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-3 break-words font-display text-xl font-normal tabular-nums sm:text-2xl lg:text-[1.75rem]">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
