import {
  Bell,
  BellRing,
  Building2,
  CreditCard,
  DoorOpen,
  LayoutDashboard,
  Megaphone,
  Receipt,
  Settings,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Other path prefixes that should highlight this item. */
  alsoActive?: string[];
  /** Shown in the mobile bottom bar (max 4; the rest go under "More"). */
  primary?: boolean;
};

export type ShellVariant = "landlord" | "tenant";

/** Counts shown next to nav items, keyed by href (e.g. unread notices). */
export type NavBadges = Partial<Record<string, number>>;

export const NAV_ITEMS: Record<ShellVariant, NavItem[]> = {
  landlord: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, primary: true },
    { label: "Properties", href: "/properties", icon: Building2, primary: true },
    { label: "Units", href: "/units", icon: DoorOpen },
    { label: "Tenants", href: "/tenants", icon: Users, primary: true },
    { label: "Rent & Bills", href: "/rent", icon: Receipt, alsoActive: ["/bills"], primary: true },
    { label: "Payments", href: "/payments", icon: CreditCard },
    { label: "Maintenance", href: "/maintenance", icon: Wrench },
    { label: "Notices", href: "/notices", icon: Megaphone },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  tenant: [
    { label: "Dashboard", href: "/tenant/dashboard", icon: LayoutDashboard, primary: true },
    { label: "My Rent", href: "/tenant/rent", icon: Receipt, primary: true },
    { label: "Payments", href: "/tenant/payments", icon: CreditCard },
    { label: "Maintenance", href: "/tenant/maintenance", icon: Wrench, primary: true },
    { label: "Notices", href: "/tenant/notices", icon: Bell, primary: true },
    { label: "Reminders", href: "/tenant/notifications", icon: BellRing },
    { label: "Profile", href: "/tenant/profile", icon: UserRound },
  ],
};

export function isNavItemActive(item: NavItem, pathname: string) {
  return [item.href, ...(item.alsoActive ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
