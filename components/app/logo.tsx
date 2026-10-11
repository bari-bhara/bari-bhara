import Link from "next/link";
import { cn } from "@/lib/utils";

/** The orbit mark: a ring with a lime body in orbit. Decorative; the wordmark names the link. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="24.6" cy="9.2" r="3" className="fill-brand" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[15px] font-medium tracking-tight">Bari_bhara</span>
    </Link>
  );
}
