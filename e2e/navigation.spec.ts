import { expect, test } from "@playwright/test";
import { USERS, login } from "./helpers";

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

test("pages don't overflow horizontally", async ({ page }) => {
  await login(page, USERS.landlordA.email);
  for (const path of ["/dashboard", "/settings", "/tenants"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(0);
  }
});
