import Link from "next/link";
import { cn } from "@/lib/utils";

/** The house mark: a line-drawn home with a lit (lime) window. Decorative; the wordmark names the link. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 15.5 16 5l12 10.5" />
      <path d="M7.5 13v13.5h17V13" />
      <rect x="13" y="15" width="6" height="6" rx="1.25" strokeWidth="1.25" className="fill-brand" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[15px] font-medium tracking-tight">Bari Bhara</span>
    </Link>
  );
}
