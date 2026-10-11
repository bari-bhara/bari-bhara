import { cn } from "@/lib/utils";

/**
 * Semantic colours for statuses (ADR 0008). Feature badges map their domain
 * status to a tone and keep no colours of their own.
 */
export type Tone = "success" | "info" | "warning" | "danger" | "highlight" | "neutral";

const TONES: Record<Tone, string> = {
  success: "border-success/25 bg-success/10 text-success",
  info: "border-info/25 bg-info/10 text-info",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
  highlight: "border-highlight/25 bg-highlight/10 text-highlight",
  neutral: "border-border bg-muted text-muted-foreground",
};

/** Text colour for a tone, for inline status text that isn't a badge. */
export const TONE_TEXT: Record<Tone, string> = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  danger: "text-destructive",
  highlight: "text-highlight",
  neutral: "text-muted-foreground",
};

/** A pill with a status dot. The label carries the meaning; colour only reinforces it. */
export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border py-0.5 pl-2 pr-2.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
