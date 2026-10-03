import { expect, test, type Page } from "@playwright/test";
import { PROPERTIES, TENANTS, USERS, login, monthParam } from "./helpers";

test("landlord can reach every section from the navigation", async ({ page, isMobile }) => {
  await login(page, USERS.landlordA.email);
  await expect(page).toHaveURL("/dashboard");

  const sections = [
    { label: "Properties", url: "/properties" },
    { label: "Tenants", url: "/tenants" },
    { label: "Maintenance", url: "/maintenance" },
    { label: "Settings", url: "/settings" },
  ];

  for (const section of sections) {
    const nav = page.getByRole("navigation", { name: "Main" });
    const direct = nav.getByRole("link", { name: section.label, exact: true });
    if (isMobile && (await direct.count()) === 0) {
      await nav.getByRole("button", { name: "More" }).click();
      await page.getByRole("dialog").getByRole("link", { name: section.label, exact: true }).click();
    } else {
      await direct.click();
    }
    await expect(page).toHaveURL(section.url);
    await expect(page.getByRole("heading", { level: 1, name: section.label })).toBeVisible();
  }
});

const LANDLORD_PAGES = [
  "/dashboard",
  "/settings",
  "/properties",
  "/properties/new",
  `/properties/${PROPERTIES.landlordA.id}`,
  "/units",
  "/units/new",
  "/tenants",
  "/tenants?status=all",
  `/tenants/${TENANTS.sumaiya.id}`,
  `/tenants/${TENANTS.tanvir.id}`,
  "/tenants/new",
  "/rent",
  "/bills",
  "/bills/new",
  "/payments",
  "/maintenance",
  "/maintenance?status=all",
  "/maintenance/new",
  "/notices",
  "/notices/new",
];

// Detail pages without fixed seed ids: the first item linked from each list.
const LANDLORD_DETAILS = [
  { list: "/rent", pattern: /^\/rent\/[0-9a-f-]{36}$/ },
  { list: `/bills?month=${monthParam(-1)}`, pattern: /^\/bills\/[0-9a-f-]{36}$/ },
  { list: "/maintenance?status=all", pattern: /^\/maintenance\/[0-9a-f-]{36}$/ },
  { list: "/notices", pattern: /^\/notices\/[0-9a-f-]{36}$/ },
  { list: "/units", pattern: /^\/units\/[0-9a-f-]{36}$/ },
];

const TENANT_PAGES = [
  "/tenant/dashboard",
  "/tenant/rent",
  "/tenant/payments",
  "/tenant/maintenance",
  "/tenant/maintenance/new",
  "/tenant/notices",
  "/tenant/notifications",
  "/tenant/profile",
];

const TENANT_DETAILS = [
  { list: "/tenant/maintenance", pattern: /^\/tenant\/maintenance\/[0-9a-f-]{36}$/ },
  // Opening a notice marks it read; the seed has others for the unread-badge test.
  { list: "/tenant/notices", pattern: /^\/tenant\/notices\/[0-9a-f-]{36}$/ },
];

async function detailPaths(page: Page, details: { list: string; pattern: RegExp }[]) {
  const paths: string[] = [];
  for (const { list, pattern } of details) {
    await page.goto(list);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const hrefs = await page
      .locator("main a[href]")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
    const href = hrefs.find((h) => pattern.test(h));
    if (href) paths.push(href);
  }
  return paths;
}

async function expectNoOverflow(page: Page, paths: string[], widths: number[]) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect.soft(overflow, `${path} overflows horizontally at ${width}px`).toBeLessThanOrEqual(0);
    }
  }
}

// Phones on the mobile project; tablet (sidebar and tables appear at 768px),
// laptop and desktop on the desktop project.
const widthsFor = (isMobile: boolean) => (isMobile ? [360, 390] : [768, 1024, 1440]);

test.describe("pages don't overflow horizontally", () => {
  // ~25 pages at two or three widths.
  test.describe.configure({ timeout: 300_000 });

  test("landlord pages", async ({ page, isMobile }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    const details = await detailPaths(page, LANDLORD_DETAILS);
    expect(details).toHaveLength(LANDLORD_DETAILS.length);
    await expectNoOverflow(page, [...LANDLORD_PAGES, ...details], widthsFor(isMobile));
  });

  test("tenant pages", async ({ page, isMobile }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
    const details = await detailPaths(page, TENANT_DETAILS);
    expect(details).toHaveLength(TENANT_DETAILS.length);
    await expectNoOverflow(page, [...TENANT_PAGES, ...details], widthsFor(isMobile));
  });
});

test.describe("not found", () => {
  // Signed-out visitors are sent to log in first, whatever the URL.
  test("an unknown URL shows the not-found page", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/no-such-page");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to home" })).toBeVisible();
  });

  test("a missing record shows not-found inside the shell, with a way back", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/tenants/00000000-0000-0000-0000-000000000000");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    // The navigation is still there.
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await page.getByRole("link", { name: "Back to Tenants" }).click();
    await expect(page).toHaveURL("/tenants");
    await expect(page.getByRole("heading", { level: 1, name: "Tenants" })).toBeVisible();
  });

  test("tenants get the not-found page inside their portal", async ({ page }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
    await page.goto("/tenant/maintenance/not-a-real-id");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to Maintenance" })).toBeVisible();
  });
});
