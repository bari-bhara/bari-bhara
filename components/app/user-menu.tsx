import { getCurrentUser } from "@/lib/dal";
import { UserMenuDropdown } from "./user-menu-dropdown";

/** Reads the session — render inside <Suspense>. */
export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <UserMenuDropdown
      name={user.fullName || user.email}
      email={user.email}
      settingsHref={user.role === "landlord" ? "/settings" : "/tenant/profile"}
      settingsLabel={user.role === "landlord" ? "Settings" : "Profile"}
    />
  );
}

export function UserMenuSkeleton() {
  return <div className="h-9 w-9 animate-pulse rounded-full bg-muted" aria-hidden />;
}
