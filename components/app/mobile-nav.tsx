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
import { NAV_ITEMS, isNavItemActive, type ShellVariant } from "./nav-config";
import { SidebarNav } from "./sidebar-nav";

/** Bottom tab bar for phones: primary destinations plus a "More" sheet. */
export function MobileNav({ variant }: { variant: ShellVariant }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV_ITEMS[variant];
  const primary = items.filter((item) => item.primary);
  const moreActive = items.some(
    (item) => !item.primary && isNavItemActive(item, pathname),
  );

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {primary.map((item) => {
          const active = isNavItemActive(item, pathname);
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
                <item.icon className="h-5 w-5" aria-hidden />
                <span className="truncate">{item.label}</span>
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
              <Menu className="h-5 w-5" aria-hidden />
              More
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto rounded-t-xl">
              <SheetHeader className="mb-4 text-left">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">All sections</SheetDescription>
              </SheetHeader>
              <SidebarNav variant={variant} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
