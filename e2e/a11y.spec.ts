import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { PROPERTIES, TENANTS, USERS, login, monthParam } from "./helpers";

/**
 * Automated WCAG 2.1 A/AA checks with axe, in light and dark mode. axe finds
 * roughly a third of accessibility problems; keyboard flow and screen reader
 * wording still need a manual pass.
 */

const PUBLIC_PAGES = ["/", "/login", "/signup", "/forgot-password"];

const LANDLORD_PAGES = [
  "/dashboard",
  "/properties",
  `/properties/${PROPERTIES.landlordA.id}`,
  "/properties/new",
  "/units",
  "/tenants",
  `/tenants/${TENANTS.tanvir.id}`,
  "/tenants/new",
  "/rent",
  `/bills?month=${monthParam(-1)}`,
  "/bills/new",
  "/payments",
  "/maintenance",
  "/maintenance/new",
  "/notices",
  "/notices/new",
  "/settings",
];

const TENANT_PAGES = [
  "/tenant/dashboard",
  "/tenant/rent",
  "/tenant/payments",
  "/tenant/maintenance",
  "/tenant/maintenance/new",
  "/tenant/notices",
  "/tenant/profile",
];

async function expectNoViolations(page: Page, paths: string[]) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const path of paths) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        // The Next.js dev tools badge isn't part of the app.
        .exclude("nextjs-portal")
        .analyze();
      const summary = violations.map(
        (v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(" ")).join("\n    ")}`,
      );
      expect.soft(summary, `${path} in ${scheme} mode`).toEqual([]);
    }
  }
}

// One viewport is enough: the markup is the same, and both layouts are covered
// by the desktop sidebar and the mobile tests' bottom bar elsewhere.
test.describe("accessibility", () => {
  test.skip(({ isMobile }) => isMobile, "Runs on the desktop project only.");
  test.slow();

  test("public pages", async ({ page }) => {
    await expectNoViolations(page, PUBLIC_PAGES);
  });

  test("landlord pages", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await expectNoViolations(page, LANDLORD_PAGES);
  });

  test("open dialogs and menus", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    const scan = async (what: string) => {
      // Contrast is measured on whatever is painted: wait for fade-ins to end.
      await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .exclude("nextjs-portal")
        .analyze();
      expect.soft(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`), what).toEqual([]);
    };

    // Rahim's rent from last month is unpaid (seed). Opened, not submitted.
    await page.goto(`/rent?month=${monthParam(-1)}`);
    await page.getByRole("link", { name: TENANTS.rahim.name }).first().click();
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await scan("record payment dialog");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await scan("account menu");
  });

  test("tenant pages", async ({ page }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
    await expectNoViolations(page, TENANT_PAGES);
  });
});
