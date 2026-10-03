import { expect, test } from "@playwright/test";
import { USERS, login } from "./helpers";

// Other specs add units, tenants and payments in parallel, so these check
// seeded facts that stay true (who is overdue, what is shown) rather than totals.

test("landlord dashboard answers the at-a-glance questions", async ({ page }) => {
  await login(page, USERS.landlordA.email);
  await expect(page).toHaveURL("/dashboard");

  const stats = page.getByRole("region", { name: "This month at a glance" });
  await expect(stats.getByText(/^Collected in /)).toBeVisible();
  await expect(stats.getByText(/% of .* billed/)).toBeVisible();
  await expect(stats.getByText("Outstanding")).toBeVisible();
  await expect(stats.getByText(/overdue/)).toBeVisible();
  await expect(stats.getByText(/units · \d+ vacant/)).toBeVisible();
  await expect(stats.getByText(/waiting for you/)).toBeVisible();

  const overdue = page.getByRole("list", { name: "Overdue tenants" });
  await expect(overdue.getByRole("link", { name: "Rahim Uddin" })).toBeVisible();
  await expect(overdue.getByRole("link", { name: "Tanvir Ahmed" })).toBeVisible();

  await expect(page.getByRole("list", { name: "Open maintenance" }).getByRole("link", { name: "AC not cooling" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Recent activity" }).getByRole("listitem").first()).toBeVisible();

  await page.getByRole("list", { name: "Overdue tenants" }).getByRole("link", { name: "Rahim Uddin" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Rahim Uddin" })).toBeVisible();
});

test("landlord B's dashboard shows only their own organization", async ({ page }) => {
  await login(page, USERS.landlordB.email);
  await expect(page).toHaveURL("/dashboard");
  const overdue = page.getByRole("list", { name: "Overdue tenants" });
  await expect(overdue.getByRole("link", { name: "Farzana Islam" })).toBeVisible();
  for (const name of ["Rahim Uddin", "Tanvir Ahmed", "AC not cooling"]) {
    await expect(page.getByText(name)).toHaveCount(0);
  }
});

test("tenant dashboard shows what they owe and what's next", async ({ page }) => {
  await login(page, USERS.tenantA.email);
  await expect(page).toHaveURL("/tenant/dashboard");
  const balance = page.getByRole("region", { name: "Balance" });
  await expect(balance.getByText("You owe")).toBeVisible();
  await expect(balance.getByText(/is overdue/)).toBeVisible();
  await expect(balance.getByText("Next to pay")).toBeVisible();
  await expect(balance.getByText(/Last payment:/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your home" })).toBeVisible();
});
