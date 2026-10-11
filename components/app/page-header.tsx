import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Link to the parent page, shown above the title. */
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid min-w-0 gap-1">
        {back && (
          <Link
            href={back.href}
            className="-ml-2 mb-2 inline-flex w-fit items-center gap-1 rounded-full py-1 pl-1 pr-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {back.label}
          </Link>
        )}
        <h1 className="break-words font-display text-[1.75rem] font-normal leading-[1.1] sm:text-4xl">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
