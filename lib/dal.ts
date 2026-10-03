import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeForRole } from "@/lib/routes";
import type { Organization, SessionUser, UserRole } from "@/types/domain";

/**
 * Data Access Layer. Every layout, page and Server Action that needs the
 * user goes through these helpers. The role comes from `profiles` (the
 * source of truth), not from the JWT claim that proxy.ts uses for redirects.
 *
 * Call from inside a <Suspense> boundary: this reads request cookies.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load profile", profileError);
    return null;
  }
  if (!profile) return null;

  return {
    id: data.claims.sub,
    email: data.claims.email ?? "",
    role: profile.role,
    fullName: profile.full_name,
  };
});

/** Returns the user or redirects to /login. Expired sessions land here too. */
export async function verifySession(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Returns the user if they have `role`, otherwise redirects to their own home. */
export async function requireRole(role: UserRole): Promise<SessionUser> {
  const user = await verifySession();
  if (user.role !== role) redirect(homeForRole(user.role));
  return user;
}

/** The landlord's organization. v1 has one organization per landlord. */
export const getCurrentOrganization = cache(
  async (): Promise<Organization | null> => {
    await requireRole("landlord");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to load organization", error);
      return null;
    }
    return data;
  },
);
