import { expect, type Page } from "@playwright/test";

/** Seeded accounts — see supabase/seed.sql. */
export const SEED_PASSWORD = "Password123!";
export const USERS = {
  landlordA: { email: "landlord.a@example.com", name: "Karim", org: "Green View Properties" },
  landlordB: { email: "landlord.b@example.com", name: "Nasrin", org: "Lakeside Homes" },
  tenantA: { email: "tenant.a@example.com", name: "Tanvir" },
  tenantB: { email: "tenant.b@example.com", name: "Farzana" },
} as const;

export async function login(page: Page, email: string, path = "/login") {
  await page.goto(path);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL("/login");
}

export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Seeded properties — see supabase/seed.sql. */
export const PROPERTIES = {
  landlordA: { id: "aaaaaaaa-0000-0000-0000-000000000001", name: "Green View Tower" },
  landlordB: { id: "bbbbbbbb-0000-0000-0000-000000000001", name: "Lakeside Apartments" },
} as const;

export function uniqueName(prefix: string) {
  return `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
}

/** Seeded tenant records — see supabase/seed.sql. */
export const TENANTS = {
  tanvir: { id: "cccccccc-0000-0000-0000-000000000001", name: "Tanvir Ahmed" },
  rahim: { id: "cccccccc-0000-0000-0000-000000000002", name: "Rahim Uddin" },
  sumaiya: { id: "cccccccc-0000-0000-0000-000000000003", name: "Sumaiya Khan" },
} as const;

/** Signs up a new tenant account; they land on /tenant/join. */
export async function signUpTenant(page: Page, fullName: string) {
  await page.goto("/signup");
  await page.getByRole("radio", { name: /I'm a tenant/ }).click();
  await page.getByLabel("Full name").fill(fullName);
  await page.getByLabel("Email").fill(uniqueEmail("tenant"));
  await page.getByLabel("Password", { exact: true }).fill(SEED_PASSWORD);
  await page.getByLabel("Confirm password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/tenant/join");
}
