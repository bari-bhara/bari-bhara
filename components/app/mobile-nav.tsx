"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavItemActive, type NavBadges, type ShellVariant } from "./nav-config";
import { SidebarNavList } from "./sidebar-nav";

/** Highlights the current section. Render inside <Suspense> (see MobileNavBar). */
export function MobileNav({ variant, badges }: { variant: ShellVariant; badges?: NavBadges }) {
  return <MobileNavBar variant={variant} pathname={usePathname()} badges={badges} />;
}

/**
 * Bottom tab bar for phones: primary destinations plus a "More" sheet.
 * With pathname "" nothing is highlighted (the Suspense fallback).
 */
export function MobileNavBar({
  variant,
  pathname,
  badges,
}: {
  variant: ShellVariant;
  pathname: string;
  badges?: NavBadges;
}) {
  const [open, setOpen] = useState(false);
  const items = NAV_ITEMS[variant];
  const primary = items.filter((item) => item.primary);
  const moreActive = items.some(
    (item) => !item.primary && isNavItemActive(item, pathname),
  );

  return (
    // Floats above the safe area as a dark bar in both themes (a `.dark` token scope).
    <nav
      aria-label="Main"
      className="dark fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 rounded-[1.75rem] border bg-background/90 text-foreground shadow-2xl shadow-black/30 backdrop-blur-xl md:hidden"
    >
      <ul className="grid grid-cols-5 px-1">
        {primary.map((item) => {
          const active = isNavItemActive(item, pathname);
          const badge = badges?.[item.href] ?? 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
                  active && "text-foreground",
                )}
              >
                <span
                  className={cn(
                    "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-brand text-brand-foreground",
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" aria-hidden />
                  {badge > 0 && (
                    <span className="absolute -top-1 right-0.5 min-w-4 rounded-full bg-foreground px-1 text-center text-[10px] font-semibold leading-4 text-background">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="truncate">
                  {item.label}
                  {badge > 0 && <span className="sr-only">, {badge} unread</span>}
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className={cn(
                "flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
                moreActive && "text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full",
                  moreActive && "bg-brand text-brand-foreground",
                )}
              >
                <Menu className="h-[18px] w-[18px]" aria-hidden />
              </span>
              More
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto rounded-t-3xl">
              <SheetHeader className="mb-4 text-left">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">All sections</SheetDescription>
              </SheetHeader>
              <SidebarNavList
                variant={variant}
                pathname={pathname}
                badges={badges}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
