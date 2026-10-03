import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatMonth, shiftMonth } from "@/lib/format";

/** Previous / current / next month links. `href(month)` builds each URL. */
export function MonthNav({
  month,
  currentMonth,
  href,
}: {
  month: string;
  /** This month in the org's time zone, for the "This month" shortcut. */
  currentMonth: string;
  href: (month: string) => string;
}) {
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <nav aria-label="Month" className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="icon" className="h-10 w-10">
        <Link href={href(previous)} aria-label={`Previous month, ${formatMonth(previous)}`}>
          <ChevronLeft aria-hidden />
        </Link>
      </Button>
      <h2 className="min-w-36 text-center text-lg font-semibold" aria-live="polite">
        {formatMonth(month)}
      </h2>
      <Button asChild variant="outline" size="icon" className="h-10 w-10">
        <Link href={href(next)} aria-label={`Next month, ${formatMonth(next)}`}>
          <ChevronRight aria-hidden />
        </Link>
      </Button>
      {month !== currentMonth && (
        <Button asChild variant="ghost" size="sm">
          <Link href={href(currentMonth)}>This month</Link>
        </Button>
      )}
    </nav>
  );
}
