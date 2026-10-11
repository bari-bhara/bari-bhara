import { cn } from "@/lib/utils";
import { OrbitBackdrop } from "./orbit-backdrop";

/**
 * The page's one bold moment (plan 0002): a moss panel with a lime glow, a
 * large figure in the wide display cut and a visual (usually an OrbitGauge).
 * Always uses the dark tokens, in both themes, like the sidebar.
 */
export function HeroPanel({
  label,
  value,
  hint,
  visual,
  children,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  visual?: React.ReactNode;
  /** Extra content under the figure (links, secondary facts). */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "dark relative isolate flex items-center justify-between gap-4 overflow-hidden rounded-3xl border bg-background p-5 text-foreground sm:gap-6 sm:p-8",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_90%_at_85%_50%,hsl(var(--brand)/0.13),transparent_70%)]"
        aria-hidden
      />
      {!visual && <OrbitBackdrop className="-right-40 top-1/2 -z-10 w-[36rem] -translate-y-1/2 opacity-70" />}
      <div className="grid min-w-0 content-start gap-2">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
          {label}
        </p>
        <p className="break-words font-display text-[1.75rem] font-light tabular-nums leading-none sm:text-5xl">
          {value}
        </p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        {children}
      </div>
      {visual && <div className="flex w-24 shrink-0 justify-center sm:w-44 lg:w-52">{visual}</div>}
    </div>
  );
}
