import { expect, test } from "@playwright/test";
import { SEED_PASSWORD, USERS, login, logout, uniqueEmail } from "./helpers";

test.describe("unauthenticated access", () => {
  test("protected pages redirect to login with a return path", async ({ page }) => {
    await page.goto("/tenants");
    await expect(page).toHaveURL("/login?next=%2Ftenants");
  });

  test("tenant pages redirect to login", async ({ page }) => {
    await page.goto("/tenant/dashboard");
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("public pages are reachable", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  });
});

test.describe("login", () => {
  test("landlord lands on the landlord dashboard", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { name: `Welcome, ${USERS.landlordA.name}` })).toBeVisible();
    await expect(page.getByText(USERS.landlordA.org)).toBeVisible();
  });

  test("tenant lands on the tenant dashboard", async ({ page }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
    await expect(page.getByRole("heading", { name: `Hi, ${USERS.tenantA.name}` })).toBeVisible();
  });

  test("returns to the requested page after login", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL("/login?next=%2Fsettings");
    await page.getByLabel("Email").fill(USERS.landlordA.email);
    await page.getByLabel("Password", { exact: true }).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/settings");
  });

  test("ignores an external ?next= redirect", async ({ page }) => {
    await login(page, USERS.landlordA.email, "/login?next=//evil.example.com");
    await expect(page).toHaveURL("/dashboard");
  });

  test("wrong password shows an error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(USERS.landlordA.email);
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Incorrect email or password." }),
    ).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("client-side validation blocks empty submit", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Enter your password.")).toBeVisible();
  });

  test("signed-in users are sent from /login to their home", async ({ page }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
    await page.goto("/login");
    await expect(page).toHaveURL("/tenant/dashboard");
  });
});

test.describe("logout", () => {
  test("ends the session", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await logout(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});

test.describe("role-based access", () => {
  test("tenant cannot open landlord pages", async ({ page }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
    for (const path of ["/dashboard", "/tenants", "/settings"]) {
      await page.goto(path);
      await expect(page).toHaveURL("/tenant/dashboard");
    }
  });

  test("landlord cannot open tenant pages", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/tenant/rent");
    await expect(page).toHaveURL("/dashboard");
  });

  test("landlords only see their own organization", async ({ page }) => {
    await login(page, USERS.landlordB.email);
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/settings");
    await expect(page.getByText(USERS.landlordB.org)).toBeVisible();
    await expect(page.getByText(USERS.landlordA.org)).toHaveCount(0);
  });
});

test.describe("signup", () => {
  test("landlord signup creates an organization", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Test Landlord");
    await page.getByLabel(/Business or portfolio name/).fill("Test Towers");
    await page.getByLabel("Email").fill(uniqueEmail("landlord"));
    await page.getByLabel("Password", { exact: true }).fill(SEED_PASSWORD);
    await page.getByLabel("Confirm password").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText("Test Towers")).toBeVisible();
  });

  test("tenant signup lands on the tenant dashboard", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("radio", { name: /I'm a tenant/ }).click();
    await expect(page.getByLabel(/Business or portfolio name/)).toHaveCount(0);
    await page.getByLabel("Full name").fill("Test Tenant");
    await page.getByLabel("Email").fill(uniqueEmail("tenant"));
    await page.getByLabel("Password", { exact: true }).fill(SEED_PASSWORD);
    await page.getByLabel("Confirm password").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/tenant/dashboard");
    await expect(page.getByText("Connect to your home")).toBeVisible();
  });

  test("mismatched passwords are rejected", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Password", { exact: true }).fill(SEED_PASSWORD);
    await page.getByLabel("Confirm password").fill("Something-else1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Passwords don't match.")).toBeVisible();
  });
});
