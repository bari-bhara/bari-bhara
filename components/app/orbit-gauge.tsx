import { cn } from "@/lib/utils";

/**
 * The orbit motif as a real gauge (ADR 0008): a lime arc on a thin track,
 * with a "satellite" at its end and two faint outer orbits. `value` is a
 * percentage (0–100); null draws the empty track. The arc draws in once on
 * load (static under prefers-reduced-motion).
 */
export function OrbitGauge({
  value,
  label,
  caption,
  className,
}: {
  value: number | null;
  /** Accessible description, e.g. "17% of billed rent collected". */
  label: string;
  /** Short text under the figure in the centre. */
  caption?: string;
  className?: string;
}) {
  const size = 200;
  const c = size / 2;
  const r = 70;
  const circumference = 2 * Math.PI * r;
  const pct = value === null ? 0 : Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - pct / 100);
  // Satellite position: the arc starts at 12 o'clock and runs clockwise.
  const angle = (pct / 100) * 2 * Math.PI - Math.PI / 2;
  const sx = c + r * Math.cos(angle);
  const sy = c + r * Math.sin(angle);

  return (
    <div role="img" aria-label={label} className={cn("aspect-square w-full max-w-[13rem]", className)}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" aria-hidden>
        <circle cx={c} cy={c} r={96} fill="none" stroke="currentColor" strokeOpacity="0.07" />
        <circle cx={c} cy={c} r={84} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="1 5" />
        <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="6" />
        {pct > 0 && (
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            className="orbit-arc stroke-brand"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${c} ${c})`}
            style={{ "--orbit-length": `${circumference}px` } as React.CSSProperties}
          />
        )}
        {pct > 0 && pct < 100 && <circle cx={sx} cy={sy} r="7" className="orbit-satellite fill-brand" />}
        {/* Text lives in the SVG so it scales with the gauge. */}
        <text
          x={c}
          y={caption ? c + 4 : c + 13}
          textAnchor="middle"
          className="fill-foreground font-display font-light tabular-nums"
          fontSize="38"
        >
          {value === null ? "—" : `${pct}%`}
        </text>
        {caption && (
          <text x={c} y={c + 30} textAnchor="middle" className="fill-muted-foreground" fontSize="13">
            {caption}
          </text>
        )}
      </svg>
    </div>
  );
}
