import { expect, type Page } from "@playwright/test";

/** Seeded accounts — see supabase/seed.sql. */
export const SEED_PASSWORD = "Password123!";
export const USERS = {
  landlordA: { email: "landlord.a@example.com", name: "Karim", org: "Green View Properties" },
  landlordB: { email: "landlord.b@example.com", name: "Nasrin", org: "Lakeside Homes" },
  tenantA: { email: "tenant.a@example.com", name: "Tanvir" },
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
