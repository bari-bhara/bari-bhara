import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** An icon inside two thin concentric rings: the orbit motif at icon scale. */
export function IconRing({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        "relative flex h-16 w-16 items-center justify-center rounded-full border border-foreground/10",
        className,
      )}
      aria-hidden
    >
      <span className="absolute inset-2 rounded-full border border-foreground/15 bg-muted" />
      <Icon className="relative h-5 w-5 text-muted-foreground" />
      <span className="absolute right-1 top-1.5 h-2 w-2 rounded-full bg-brand" />
    </span>
  );
}
