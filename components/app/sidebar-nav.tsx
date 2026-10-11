"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavItemActive, type NavBadges, type ShellVariant } from "./nav-config";

/** Highlights the current section. Render inside <Suspense> (see SidebarNavList). */
export function SidebarNav(props: { variant: ShellVariant; onNavigate?: () => void; badges?: NavBadges }) {
  return <SidebarNavList {...props} pathname={usePathname()} />;
}

/**
 * The nav links for a given path. Without a path (pathname "") nothing is
 * highlighted, which makes it the Suspense fallback on dynamic routes, where
 * the URL is only known at request time.
 */
export function SidebarNavList({
  variant,
  pathname,
  onNavigate,
  badges,
}: {
  variant: ShellVariant;
  pathname: string;
  onNavigate?: () => void;
  badges?: NavBadges;
}) {
  return (
    <ul className="grid gap-0.5">
      {NAV_ITEMS[variant].map((item) => {
        const active = isNavItemActive(item, pathname);
        const badge = badges?.[item.href] ?? 0;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-full px-4 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                active && "bg-accent font-medium text-foreground",
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} aria-hidden />
              {item.label}
              {badge > 0 ? (
                <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold leading-none text-brand-foreground">
                  {badge}
                  <span className="sr-only"> unread</span>
                </span>
              ) : (
                active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
