import { Suspense } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import type { ShellVariant } from "./nav-config";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu, UserMenuSkeleton } from "./user-menu";

const HOME: Record<ShellVariant, string> = {
  landlord: "/dashboard",
  tenant: "/tenant/dashboard",
};

/**
 * Authenticated layout: sidebar on desktop, top bar + bottom tabs on mobile.
 * The chrome is static; only the user menu and page content read the session.
 */
export function AppShell({
  variant,
  children,
}: {
  variant: ShellVariant;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-muted/30">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href={HOME[variant]} />
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2">
          <SidebarNav variant={variant} />
        </nav>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <Logo href={HOME[variant]} className="md:invisible" />
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>

        <main
          id="main"
          className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 md:pb-10"
        >
          {children}
        </main>
      </div>

      <MobileNav variant={variant} />
    </div>
  );
}
