import { cn } from "@/lib/utils";

/**
 * Thin concentric orbits for full-page backdrops (landing, sign-in). Purely
 * decorative: position it inside a `relative` parent; it never takes clicks.
 */
export function OrbitBackdrop({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 800"
      className={cn("pointer-events-none absolute text-foreground", className)}
      aria-hidden
    >
      <defs>
        <radialGradient id="orbit-glow">
          <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity="0.16" />
          <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="400" cy="400" r="300" fill="url(#orbit-glow)" />
      <circle cx="400" cy="400" r="390" fill="none" stroke="currentColor" strokeOpacity="0.06" />
      <circle cx="400" cy="400" r="310" fill="none" stroke="currentColor" strokeOpacity="0.08" />
      <circle cx="400" cy="400" r="230" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2 8" />
      <circle cx="400" cy="400" r="150" fill="none" stroke="currentColor" strokeOpacity="0.08" />
      <circle cx="619" cy="181" r="5" className="fill-brand" />
      <circle cx="146" cy="566" r="3" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}
