"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, isNavItemActive, type ShellVariant } from "./nav-config";

/**
 * "Back to <section>" for the current URL's nav item (e.g. /tenants/x → Tenants),
 * falling back to the dashboard. Render inside <Suspense> (it reads the URL).
 */
export function SectionLink({ variant }: { variant: ShellVariant }) {
  const pathname = usePathname();
  const items = NAV_ITEMS[variant];
  const item = items.find((i) => isNavItemActive(i, pathname)) ?? items[0];
  return <SectionButton href={item.href} label={item.label} />;
}

export function DashboardLink({ variant, secondary }: { variant: ShellVariant; secondary?: boolean }) {
  const item = NAV_ITEMS[variant][0];
  return <SectionButton href={item.href} label={item.label} secondary={secondary} />;
}

function SectionButton({ href, label, secondary }: { href: string; label: string; secondary?: boolean }) {
  return (
    <Button asChild variant={secondary ? "outline" : "default"}>
      <Link href={href}>Back to {label}</Link>
    </Button>
  );
}
