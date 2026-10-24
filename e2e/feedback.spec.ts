import { expect, test } from "@playwright/test";
import { TENANTS, USERS, createUnit, login, uniqueName } from "./helpers";

// Feedback round 1, Phase A: list menus and row clicks, tenant fields and ID
// documents, bill month guard, editable scheduled notices, settings, and
// home labels on tenant pages. See docs/plans/0003-feedback-round-1.md.

// A 1×1 PNG stands in for a scanned NID.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("landlord lists", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
  });

  test("rows open on click and have an actions menu", async ({ page, isMobile }) => {
    await page.goto("/tenants");
    if (!isMobile) {
      // Anywhere in the row, not just the name link.
      const row = page.getByRole("row").filter({ hasText: TENANTS.rahim.name });
      await row.getByRole("cell").nth(1).click();
      await expect(page.getByRole("heading", { level: 1, name: TENANTS.rahim.name })).toBeVisible();
      await page.goto("/tenants");
    }
    await page
      .getByRole("button", { name: `Actions for ${TENANTS.rahim.name}` })
      .filter({ visible: true })
      .click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await expect(page).toHaveURL(`/tenants/${TENANTS.rahim.id}/edit`);
  });

  test("the tenant list shows email with the phone number", async ({ page }) => {
    await page.goto("/tenants");
    await expect(page.getByText("tenant.a@example.com").filter({ visible: true })).toBeVisible();
  });

  test("opens Record payment from the rent list's row menu", async ({ page }) => {
    await page.goto("/rent");
    await page
      .getByRole("button", { name: `Actions for ${TENANTS.rahim.name}, Rent` })
      .filter({ visible: true })
      .click();
    await page.getByRole("menuitem", { name: "Record payment" }).click();
    const dialog = page.getByRole("dialog", { name: "Record payment" });
    await expect(dialog).toBeVisible();
    // Prefilled with the outstanding amount. Not submitted: dashboard tests
    // assert the seeded totals, and recording is covered in rent.spec.ts.
    await expect(dialog.getByLabel(/Amount/)).toHaveValue("25000");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });
});

test.describe("tenants", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
  });

  test("phone is required", async ({ page }) => {
    await page.goto("/tenants/new");
    await page.getByLabel("Full name").fill("No Phone");
    await page.getByRole("button", { name: "Add tenant" }).click();
    await expect(page.getByText("Enter a phone number.")).toBeVisible();
  });

  test("filters the unit picker by property", async ({ page }) => {
    await page.goto("/tenants/new");
    await page.getByRole("combobox", { name: "Property" }).click();
    await page.getByRole("option", { name: "Rose Garden Villa" }).click();
    await page.getByRole("combobox", { name: "Unit" }).click();
    await expect(page.getByRole("option", { name: /Rose Garden Villa · Unit 2A/ })).toBeVisible();
    await expect(page.getByRole("option", { name: /Green View Tower/ })).toHaveCount(0);
  });

  test("adds a tenant with an ID document, then deletes it", async ({ page }) => {
    test.slow();
    await createUnit(page);
    const name = uniqueName("E2E Doc Tenant");
    await page.getByRole("link", { name: "Add tenant" }).first().click();
    await page.getByLabel("Full name").fill(name);
    await page.getByLabel("Phone").fill("+8801799000001");
    await page.locator('input[type="file"]').setInputFiles({ name: "nid.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("nid.png")).toBeVisible();
    await page.getByRole("button", { name: "Add tenant" }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

    const documents = page.getByRole("list", { name: "ID documents" });
    await expect(documents.getByRole("link", { name: "National ID (NID)" })).toBeVisible();

    await documents.getByRole("button", { name: "Delete National ID (NID)" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("No ID documents yet.")).toBeVisible();
  });
});

test.describe("bills", () => {
  test("a bill can't be for a month before the tenant moved in", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/bills/new");
    await page.getByRole("combobox", { name: "Bill to" }).click();
    // Nusrat moved in on 15 March 2026 (seed).
    await page.getByRole("option", { name: /Nusrat Jahan/ }).click();
    await expect(page.getByText("From March 2026 (move-in).")).toBeVisible();
    await page.getByRole("combobox", { name: "Bill type" }).click();
    await page.getByRole("option", { name: "Water" }).click();
    await page.getByLabel("For month").fill("2026-02");
    await page.getByLabel(/Amount/).fill("500");
    await page.getByRole("button", { name: /Add bill/ }).click();
    await expect(page.getByText(/Choose March 2026 or later/)).toBeVisible();
    await expect(page).toHaveURL("/bills/new");
  });
});

test.describe("notices", () => {
  test("a scheduled notice can be edited; a published one can't", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    const title = uniqueName("E2E Scheduled");
    await page.goto("/notices/new");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Message").fill("Lift maintenance next month.");
    await page.getByLabel(/Publish at/).fill("2030-01-01T09:00");
    await page.getByRole("button", { name: "Publish notice" }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByLabel(/Publish at/)).toHaveValue("2030-01-01T09:00");
    const edited = `${title} (edited)`;
    await page.getByLabel("Title").fill(edited);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("heading", { level: 1, name: edited })).toBeVisible();

    // Seeded live notice: no Edit.
    await page.goto("/notices");
    await page.getByRole("link", { name: /All tenants/ }).first().click();
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
  });
});

test.describe("settings", () => {
  test("edits account and business details", async ({ page }) => {
    // Landlord B: other tests read landlord A's names.
    await login(page, USERS.landlordB.email);
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/settings");
    await page.getByRole("button", { name: "Edit account details" }).click();
    const account = page.getByRole("dialog", { name: "Account details" });
    await account.getByLabel("Phone (optional)").fill("+8801700000999");
    await account.getByRole("button", { name: "Save" }).click();
    await expect(account).toBeHidden();
    await expect(page.getByText("+8801700000999")).toBeVisible();

    await page.getByRole("button", { name: "Edit business details" }).click();
    const business = page.getByRole("dialog", { name: "Business details" });
    await business.getByLabel("Business name").fill("");
    await business.getByRole("button", { name: "Save" }).click();
    await expect(business.getByText("Enter your business name.")).toBeVisible();
    await business.getByLabel("Business name").fill(USERS.landlordB.org);
    await business.getByRole("button", { name: "Save" }).click();
    await expect(business).toBeHidden();
  });
});

test.describe("tenant pages name the home", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
  });

  // Reminders are labelled too, but the seed has none for Tanvir.
  for (const path of ["/tenant/payments", "/tenant/maintenance", "/tenant/notices"]) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(/Green View Tower · Unit A1/).first()).toBeVisible();
    });
  }
});
