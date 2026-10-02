import type { UserRole } from "@/types/domain";

/** Pages reachable without a session. */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/signup/check-email",
  "/forgot-password",
];
const PUBLIC_PREFIXES = ["/auth/"];

/** Pages a signed-in user is bounced away from (to their home). */
const GUEST_ONLY_PATHS = ["/", "/login", "/signup", "/forgot-password"];

const LANDLORD_PREFIXES = [
  "/dashboard",
  "/properties",
  "/units",
  "/tenants",
  "/rent",
  "/bills",
  "/payments",
  "/maintenance",
  "/notices",
  "/settings",
];
const TENANT_PREFIX = "/tenant";

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export function isGuestOnlyPath(pathname: string) {
  return GUEST_ONLY_PATHS.includes(pathname);
}

/** The role a path belongs to, or null if any signed-in user may open it. */
export function roleForPath(pathname: string): UserRole | null {
  if (matchesPrefix(pathname, TENANT_PREFIX)) return "tenant";
  if (LANDLORD_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return "landlord";
  }
  return null;
}

export function homeForRole(role: UserRole) {
  return role === "landlord" ? "/dashboard" : "/tenant/dashboard";
}

/**
 * Accepts only same-origin relative paths, so `?next=` can't be used as an
 * open redirect.
 */
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return null;
  }
  return next;
}

/** Where to send a user after login: `next` if it suits their role, else home. */
export function postLoginPath(role: UserRole, next: unknown) {
  const path = safeNextPath(next);
  if (path && !isGuestOnlyPath(path)) {
    const required = roleForPath(path);
    if (required === null || required === role) return path;
  }
  return homeForRole(role);
}
