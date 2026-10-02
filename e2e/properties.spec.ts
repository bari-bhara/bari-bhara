import { expect, test, type Page } from "@playwright/test";
import { PROPERTIES, USERS, login, uniqueName } from "./helpers";

async function createProperty(page: Page, name: string) {
  await page.goto("/properties/new");
  await page.getByLabel("Property name").fill(name);
  await page.getByLabel("City (optional)").fill("Dhaka");
  await page.getByRole("button", { name: "Add property" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

async function addUnit(page: Page, unitNumber: string, rent: string) {
  await page.getByRole("link", { name: "Add unit" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Add unit" })).toBeVisible();
  await page.getByLabel("Unit number").fill(unitNumber);
  await page.getByLabel(/Monthly rent/).fill(rent);
  await page.getByRole("button", { name: "Add unit" }).click();
}

test.describe("landlord manages properties and units", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
  });

  test("lists seeded properties with unit counts", async ({ page }) => {
    await page.goto("/properties");
    const card = page.getByRole("listitem").filter({ hasText: PROPERTIES.landlordA.name });
    await expect(card).toBeVisible();
    await expect(card.getByRole("definition").first()).toHaveText("5");
    await expect(page.getByRole("link", { name: PROPERTIES.landlordB.name })).toHaveCount(0);
  });

  test("creates a property, adds and edits a unit, filters by status", async ({ page }) => {
    const name = uniqueName("E2E Tower");
    await createProperty(page, name);
    await expect(page.getByText("No units yet")).toBeVisible();

    await addUnit(page, "1A", "12000");
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByRole("link", { name: "Unit 1A" })).toBeVisible();
    await expect(page.getByText("৳12,000").filter({ visible: true })).toBeVisible();

    // Unit numbers are unique within a property.
    await addUnit(page, "1A", "12000");
    await expect(
      page.getByText("This property already has a unit with this number."),
    ).toBeVisible();
    await page.getByLabel("Unit number").fill("1B");
    await page.getByRole("button", { name: "Add unit" }).click();
    await expect(page.getByRole("link", { name: "Unit 1B" })).toBeVisible();

    // Edit 1B: put it under maintenance.
    await page.getByRole("link", { name: "Unit 1B" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Unit 1B" })).toBeVisible();
    await page.getByRole("link", { name: "Edit" }).click();
    await page.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Under maintenance" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Unit 1B" })).toBeVisible();
    await expect(page.getByText("Under maintenance").filter({ visible: true })).toBeVisible();

    // Filter the property's units by status.
    await page.getByRole("link", { name }).first().click();
    const filters = page.getByRole("navigation", { name: "Filter by status" });
    await filters.getByRole("link", { name: /Maintenance/ }).click();
    await expect(page).toHaveURL(/status=maintenance/);
    await expect(page.getByRole("link", { name: "Unit 1B" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Unit 1A" })).toHaveCount(0);
    await filters.getByRole("link", { name: /Vacant/ }).click();
    await expect(page.getByRole("link", { name: "Unit 1A" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Unit 1B" })).toHaveCount(0);
  });

  test("validates the property form", async ({ page }) => {
    await page.goto("/properties/new");
    await page.getByLabel("Rent due day").fill("31");
    await page.getByRole("button", { name: "Add property" }).click();
    await expect(page.getByText("Enter a property name.")).toBeVisible();
    await expect(page.getByText("Choose a day between 1 and 28.")).toBeVisible();
    await expect(page).toHaveURL("/properties/new");
  });

  test("archives, restores and deletes an empty property", async ({ page }) => {
    const name = uniqueName("E2E Archive");
    await createProperty(page, name);

    await page.getByRole("button", { name: "Archive" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText(/Archived on/)).toBeVisible();

    await page.goto("/properties");
    await expect(page.getByRole("link", { name })).toHaveCount(0);
    await page.goto("/properties?archived=1");
    await page.getByRole("link", { name }).click();

    await page.getByRole("button", { name: "Restore" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText(/Archived on/).filter({ visible: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete property" }).click();
    await expect(page).toHaveURL("/properties");
    await expect(page.getByRole("link", { name })).toHaveCount(0);
  });

  test("units page filters across properties", async ({ page }) => {
    await page.goto("/units");
    await expect(page.getByRole("heading", { level: 1, name: "Units" })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Filter by status" })
      .getByRole("link", { name: /Inactive/ })
      .click();
    await expect(page).toHaveURL("/units?status=inactive");
    await expect(page.getByRole("link", { name: "Unit G1" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Unit A1" })).toHaveCount(0);
  });
});

test.describe("data isolation", () => {
  test("landlord B can't see landlord A's properties or units", async ({ page }) => {
    await login(page, USERS.landlordB.email);
    await expect(page).toHaveURL("/dashboard");

    await page.goto("/properties");
    await expect(page.getByRole("link", { name: PROPERTIES.landlordB.name })).toBeVisible();
    await expect(page.getByRole("link", { name: PROPERTIES.landlordA.name })).toHaveCount(0);

    await page.goto("/units");
    await expect(page.getByRole("link", { name: "Unit 101" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Unit A1" })).toHaveCount(0);

    // RLS returns no row, so the page renders the 404 UI. (It streams inside a
    // Suspense boundary, so the HTTP status is 200 — assert on the content.)
    await page.goto(`/properties/${PROPERTIES.landlordA.id}`);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByText(PROPERTIES.landlordA.name)).toHaveCount(0);
  });

  test("tenants can't open landlord property pages", async ({ page }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
    await page.goto("/properties");
    await expect(page).toHaveURL("/tenant/dashboard");
  });
});
