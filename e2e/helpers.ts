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

/** Creates a property with one unit, returns to the unit page. */
export async function createUnit(page: Page) {
  const property = uniqueName("E2E Tenancy House");
  await page.goto("/properties/new");
  await page.getByLabel("Property name").fill(property);
  await page.getByRole("button", { name: "Add property" }).click();
  await expect(page.getByRole("heading", { level: 1, name: property })).toBeVisible();
  await page.getByRole("link", { name: "Add unit" }).first().click();
  await page.getByLabel("Unit number").fill("T1");
  await page.getByLabel(/Monthly rent/).fill("14000");
  await page.getByRole("button", { name: "Add unit" }).click();
  await expect(page.getByRole("heading", { level: 1, name: property })).toBeVisible();
  await page.getByRole("link", { name: "Unit T1" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Unit T1" })).toBeVisible();
  return property;
}

/** From a vacant unit's page, adds a tenant; ends on the tenant's page. */
export async function addTenantToUnit(page: Page, name: string) {
  await page.getByRole("link", { name: "Add tenant" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Add tenant" })).toBeVisible();
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Phone (optional)").fill("+8801799000000");
  // Rent is prefilled from the unit's default rent.
  await expect(page.getByRole("textbox", { name: /Monthly rent/ })).toHaveValue("14000");
  await page.getByRole("button", { name: "Add tenant" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

/** "YYYY-MM" for the month `delta` months from now, in Asia/Dhaka (the seed orgs' zone). */
export function monthParam(delta = 0) {
  const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" })
    .format(new Date())
    .split("-")
    .map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "October 2026" for a "YYYY-MM" month, as the app formats it. */
export function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, m - 1, 1)),
  );
}
