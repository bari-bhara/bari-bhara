import Link from "next/link";
import { cn } from "@/lib/utils";

export type FilterChip = {
  label: string;
  href: string;
  active: boolean;
  count?: number;
};

/**
 * A row of link-based filters. State lives in the URL, so filters work
 * without client JavaScript and survive reloads and sharing.
 */
export function FilterChips({ label, chips }: { label: string; chips: FilterChip[] }) {
  return (
    // min-w-0 + max-w-full: in grid/flex parents the chips scroll inside the
    // nav instead of widening the page (which pushes the fixed mobile nav off-screen).
    <nav aria-label={label} className="min-w-0 max-w-full overflow-x-auto">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {chips.map((chip) => (
          <li key={chip.href}>
            <Link
              href={chip.href}
              scroll={false}
              aria-current={chip.active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors",
                chip.active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-accent",
              )}
            >
              {chip.label}
              {chip.count !== undefined && (
                <span
                  className={cn(
                    "tabular-nums",
                    chip.active ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {chip.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
