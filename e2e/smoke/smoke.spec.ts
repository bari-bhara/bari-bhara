import { expect, test, type Page } from "@playwright/test";

/**
 * Production smoke test: read-only, safe to run against the live site.
 * Run with `pnpm test:smoke` (see playwright.smoke.config.ts).
 */

test("the home page loads with security headers", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();

  const headers = response!.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("sign-in and sign-up pages load", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
});

test("protected pages send signed-out visitors to log in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await page.goto("/tenant/rent");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("an invalid auth link shows the auth error page", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=invalid&type=email");
  await expect(page).toHaveURL(/\/auth\/error$/);
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

test("a landlord can sign in and see their dashboard", async ({ page }) => {
  const email = process.env.SMOKE_LANDLORD_EMAIL;
  const password = process.env.SMOKE_LANDLORD_PASSWORD;
  test.skip(!email || !password, "Set SMOKE_LANDLORD_EMAIL and SMOKE_LANDLORD_PASSWORD to check sign-in.");
  await signIn(page, email!, password!);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1, name: /^Welcome/ })).toBeVisible();
  await page.goto("/properties");
  await expect(page.getByRole("heading", { level: 1, name: "Properties" })).toBeVisible();
});

test("a tenant can sign in and see their portal", async ({ page }) => {
  const email = process.env.SMOKE_TENANT_EMAIL;
  const password = process.env.SMOKE_TENANT_PASSWORD;
  test.skip(!email || !password, "Set SMOKE_TENANT_EMAIL and SMOKE_TENANT_PASSWORD to check sign-in.");
  await signIn(page, email!, password!);
  // A tenant without a linked home lands on /tenant/join instead.
  await expect(page).toHaveURL(/\/tenant\/(dashboard|join)$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
