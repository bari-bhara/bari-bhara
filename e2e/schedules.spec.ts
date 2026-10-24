import { expect, test } from "@playwright/test";
import { USERS, addTenantToUnit, createUnit, login, monthLabel, monthParam, uniqueName } from "./helpers";

// Feedback round 1, Phase B: dated monthly charges per unit (ADR 0010),
// generation from the schedule, metered bills and prepaid meters.

const MAILPIT = "http://127.0.0.1:54324";
const nextMonth = monthParam(1);

async function emailSubjectsTo(address: string, since: Date) {
  const response = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`);
  const body = (await response.json()) as { messages: { Subject: string; Created: string }[] };
  return body.messages.filter((m) => new Date(m.Created) >= since).map((m) => m.Subject);
}

test.describe("monthly charge schedule", () => {
  test("a rent change from next month reaches the tenant, and can be cancelled", async ({ page, browser }) => {
    test.slow();
    const started = new Date(Date.now() - 1000);
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");

    // Tanvir (linked, has email) rents Green View A1 (seed).
    await page.goto("/units");
    await page.getByRole("link", { name: "Unit A1" }).filter({ visible: true }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Unit A1" })).toBeVisible();
    await page.getByRole("button", { name: "Change rent" }).click();
    const dialog = page.getByRole("dialog", { name: "Change rent" });
    await expect(dialog.getByLabel("Starting from")).toHaveValue(nextMonth);
    await dialog.getByLabel(/Monthly amount/).fill("19500");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved. The tenant has been told.")).toBeVisible();

    const schedule = page.getByRole("list", { name: "Monthly charges" });
    await expect(schedule.getByText(`From ${monthLabel(nextMonth)}:`)).toBeVisible();
    await expect(schedule.getByText("৳19,500")).toBeVisible();

    await expect
      .poll(async () => (await emailSubjectsTo(USERS.tenantA.email, started)).join("|"))
      .toContain(`Rent from ${monthLabel(nextMonth)}`);

    const tenantContext = await browser.newContext();
    const tenant = await tenantContext.newPage();
    await login(tenant, USERS.tenantA.email);
    await expect(tenant).toHaveURL("/tenant/dashboard");
    await tenant.goto("/tenant/notifications");
    await expect(tenant.getByText(/changes from ৳18,000 to ৳19,500/).first()).toBeVisible();
    await tenantContext.close();

    // Cancel, so other tests keep the seeded rent.
    await schedule.getByRole("button", { name: /Cancel the rent change/ }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel change" }).click();
    await expect(page.getByText("Change cancelled.")).toBeVisible();
    await expect(schedule.getByText(`From ${monthLabel(nextMonth)}:`)).toHaveCount(0);
  });

  test("a change can't start this month", async ({ page }) => {
    await login(page, USERS.landlordB.email);
    await expect(page).toHaveURL("/dashboard");
    await createUnit(page);
    await page.getByRole("button", { name: "Change rent" }).click();
    const dialog = page.getByRole("dialog", { name: "Change rent" });
    await dialog.getByLabel("Starting from").fill(monthParam(0));
    await dialog.getByLabel(/Monthly amount/).fill("15000");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog.getByText("Choose next month or later.")).toBeVisible();
  });

  test("a monthly bill is generated with next month's rent; prepaid meters show", async ({ page }) => {
    test.slow();
    // Landlord B: generating a whole month must not change landlord A's totals.
    await login(page, USERS.landlordB.email);
    await expect(page).toHaveURL("/dashboard");
    await createUnit(page);
    const unitUrl = page.url();

    await page.getByRole("link", { name: "Edit" }).click();
    await page.getByLabel("Electricity meter no.").fill("EM-55021");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Electricity meter: EM-55021")).toBeVisible();

    const name = uniqueName("E2E Scheduled");
    await addTenantToUnit(page, name);
    await page.goto(unitUrl);
    await page.getByRole("button", { name: "Monthly bill" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a monthly bill" });
    await dialog.getByRole("combobox", { name: "Bill" }).click();
    await page.getByRole("option", { name: "Service charge" }).click();
    await dialog.getByLabel(/Monthly amount/).fill("1200");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    await page.goto(`/rent?month=${nextMonth}`);
    await page.getByRole("button", { name: "Generate rent" }).first().click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Generate rent" }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(page.getByRole("link", { name }).filter({ visible: true })).toHaveCount(1);

    await page.goto(`/bills?month=${nextMonth}`);
    await page.getByRole("link", { name }).filter({ visible: true }).first().click();
    await expect(
      page.getByRole("heading", { level: 1, name: `Service charge · ${monthLabel(nextMonth)}` }),
    ).toBeVisible();
    await expect(page.getByText("৳1,200").first()).toBeVisible();
  });

  test("a metered bill is priced from its readings", async ({ page }) => {
    test.slow();
    await login(page, USERS.landlordB.email);
    await expect(page).toHaveURL("/dashboard");
    await createUnit(page);
    const name = uniqueName("E2E Metered");
    await addTenantToUnit(page, name);

    await page.goto("/bills/new");
    await page.getByRole("combobox", { name: "Bill to" }).click();
    await page.getByRole("option", { name: new RegExp(name) }).click();
    await page.getByRole("combobox", { name: "Bill type" }).click();
    await page.getByRole("option", { name: "Electricity" }).click();
    await page.getByLabel("Metered bill (from meter readings)").check();
    await page.getByLabel("Previous reading").fill("100");
    await page.getByLabel("Current reading").fill("250");
    await page.getByLabel(/Rate per unit/).fill("8");
    await expect(page.getByLabel(/Amount/)).toHaveValue("1200");
    await page.getByRole("button", { name: "Add bill" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /^Electricity/ })).toBeVisible();
    await expect(page.getByText("100 → 250: 150 units × ৳8")).toBeVisible();
  });
});
