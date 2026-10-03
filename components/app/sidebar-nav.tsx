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
    <ul className="grid gap-1">
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
                "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                active && "bg-accent text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
              {badge > 0 && (
                <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary-foreground">
                  {badge}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
