import { expect, test, type Page } from "@playwright/test";
import {
  USERS,
  addTenantToUnit,
  createUnit,
  login,
  monthLabel,
  monthParam,
  uniqueName,
} from "./helpers";

const thisMonth = monthParam(0);
const lastMonth = monthParam(-1);

/** Chooses `option` in the Radix select labelled `label`. */
async function choose(page: Page, label: string, option: string | RegExp) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option }).click();
}

async function recordPayment(page: Page, amount: string) {
  await page.getByRole("button", { name: "Record payment" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: /Amount/ }).fill(amount);
  await dialog.getByRole("button", { name: "Record payment" }).click();
}

/** The charge's status badge in the details card. */
function status(page: Page) {
  return page.getByRole("definition").filter({ visible: true }).first();
}

test.describe("seeded balances", () => {
  test("last month's unpaid rent is overdue; paid rent is paid", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await page.goto(`/rent?month=${lastMonth}`);
    await expect(page.getByRole("heading", { name: monthLabel(lastMonth) })).toBeVisible();

    const filters = page.getByRole("navigation", { name: "Filter by status" });
    await filters.getByRole("link", { name: /Overdue/ }).click();
    await expect(page).toHaveURL(/status=overdue/);
    await expect(page.getByRole("link", { name: "Rahim Uddin" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tanvir Ahmed" })).toHaveCount(0);

    await filters.getByRole("link", { name: /^Paid/ }).click();
    await expect(page.getByRole("link", { name: "Tanvir Ahmed" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Rahim Uddin" })).toHaveCount(0);
  });
});

test.describe("rent and payments", () => {
  test("generates rent once, then tracks partial, full, over- and voided payments", async ({
    page,
  }) => {
    test.slow();
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await createUnit(page);
    const name = uniqueName("E2E Payer");
    await addTenantToUnit(page, name);

    // Generate this month's rent twice: the tenant gets exactly one charge.
    for (let i = 0; i < 2; i++) {
      await page.goto("/rent");
      await page.getByRole("button", { name: "Generate rent" }).first().click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Generate rent" }).click();
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
    }
    await expect(page.getByRole("link", { name })).toHaveCount(1);

    await page.getByRole("link", { name }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: `Rent · ${monthLabel(thisMonth)}` }),
    ).toBeVisible();
    await expect(status(page)).toHaveText("Unpaid");

    // Partial payment.
    await recordPayment(page, "5000");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(status(page)).toHaveText("Partly paid");
    await expect(page.getByText("৳9,000").filter({ visible: true }).first()).toBeVisible();

    // More than what's due is refused.
    await recordPayment(page, "20000");
    await expect(page.getByRole("dialog").getByText("That's more than the amount due.")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

    // Paying the rest settles it.
    await recordPayment(page, "9000");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(status(page)).toHaveText("Paid");
    await expect(page.getByRole("button", { name: "Record payment" })).toHaveCount(0);

    // Voiding a payment puts the balance back.
    await page.getByRole("button", { name: "Void payment of ৳9,000" }).click();
    await page.getByRole("dialog").getByLabel("Reason").fill("Bounced");
    await page.getByRole("dialog").getByRole("button", { name: "Void payment" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(status(page)).toHaveText("Partly paid");
    await expect(page.getByText("Void: Bounced")).toBeVisible();
    await expect(page.getByRole("button", { name: "Record payment" })).toBeVisible();
  });

  test("adds a utility bill and voids it", async ({ page }) => {
    test.slow();
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    const property = await createUnit(page);
    await addTenantToUnit(page, uniqueName("E2E Biller"));

    await page.goto("/bills/new");
    await choose(page, "Bill to", new RegExp(property));
    await choose(page, "Bill type", "Electricity");
    await page.getByRole("textbox", { name: /Amount/ }).fill("1200");
    await page.getByLabel("Description (optional)").fill("Meter 555");
    await page.getByRole("button", { name: "Add bill" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: `Electricity · ${monthLabel(thisMonth)}` }),
    ).toBeVisible();
    await expect(page.getByText("Meter 555")).toBeVisible();

    await page.getByRole("button", { name: "Void charge" }).click();
    await page.getByRole("dialog").getByLabel("Reason").fill("Wrong meter");
    await page.getByRole("dialog").getByRole("button", { name: "Void charge" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(status(page)).toHaveText("Void");
    await expect(page.getByRole("button", { name: "Record payment" })).toHaveCount(0);
  });

  test("validates the bill form", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/bills/new");
    await page.getByRole("button", { name: "Add bill" }).click();
    await expect(page.getByText("Choose who to bill.")).toBeVisible();
    await expect(page.getByText("Choose a bill type.")).toBeVisible();
    await expect(page).toHaveURL("/bills/new");
  });
});

test.describe("tenant view", () => {
  test("a tenant sees what they owe and their payments", async ({ page }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
    await page.goto("/tenant/rent");
    await expect(page.getByText("You owe")).toBeVisible();
    await expect(page.getByText(/is overdue/)).toBeVisible();
    await expect(page.getByText(`Electricity · ${monthLabel(lastMonth)}`)).toBeVisible();
    await expect(page.getByText("Meter reading 10452")).toBeVisible();

    await page.goto("/tenant/payments");
    await expect(page.getByText(/BK9P4L2Z/)).toBeVisible();
  });
});

test.describe("rent data isolation", () => {
  test("landlord B can't see or open landlord A's charges", async ({ browser }) => {
    const a = await browser.newPage();
    await login(a, USERS.landlordA.email);
    await expect(a).toHaveURL("/dashboard");
    await a.goto(`/rent?month=${lastMonth}`);
    const href = await a.getByRole("link", { name: "Rahim Uddin" }).first().getAttribute("href");
    expect(href).toMatch(/^\/rent\//);
    await a.close();

    const bContext = await browser.newContext();
    const b = await bContext.newPage();
    await login(b, USERS.landlordB.email);
    await expect(b).toHaveURL("/dashboard");
    await b.goto(`/rent?month=${lastMonth}`);
    await expect(b.getByRole("link", { name: "Imran Hossain" })).toBeVisible();
    await expect(b.getByRole("link", { name: "Rahim Uddin" })).toHaveCount(0);
    await b.goto("/payments");
    await expect(b.getByRole("link", { name: "Tanvir Ahmed" })).toHaveCount(0);
    await b.goto(href!);
    await expect(b.getByRole("heading", { name: "404" })).toBeVisible();
    await bContext.close();
  });
});
