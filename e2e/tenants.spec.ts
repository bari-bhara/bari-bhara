import { expect, test, type Page } from "@playwright/test";
import { TENANTS, USERS, login, signUpTenant, uniqueName } from "./helpers";

/** Creates a property with one unit, returns to the unit page. */
async function createUnit(page: Page) {
  const property = uniqueName("E2E Tenancy House");
  await page.goto("/properties/new");
  await page.getByLabel("Property name").fill(property);
  await page.getByRole("button", { name: "Add property" }).click();
  await expect(page.getByRole("heading", { level: 1, name: property })).toBeVisible();
  await page.getByRole("link", { name: "Add unit" }).first().click();
  await page.getByLabel("Unit number").fill("T1");
  await page.getByLabel(/Monthly rent/).fill("14000");
  await page.getByRole("button", { name: "Add unit" }).click();
  await expect(page.getByRole("heading", { level: 1, name: property })).toBeVisible();
  await page.getByRole("link", { name: "Unit T1" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Unit T1" })).toBeVisible();
  return property;
}

/** From a vacant unit's page, adds a tenant; ends on the tenant's page. */
async function addTenantToUnit(page: Page, name: string) {
  await page.getByRole("link", { name: "Add tenant" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Add tenant" })).toBeVisible();
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Phone (optional)").fill("+8801799000000");
  // Rent is prefilled from the unit's default rent.
  await expect(page.getByRole("textbox", { name: /Monthly rent/ })).toHaveValue("14000");
  await page.getByRole("button", { name: "Add tenant" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test.describe("landlord manages tenants", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
  });

  test("adds a tenant, which occupies the unit; moving out keeps history", async ({ page }) => {
    const property = await createUnit(page);
    const name = uniqueName("E2E Tenant");
    await addTenantToUnit(page, name);
    await expect(page.getByText(`${property} · Unit T1`).first()).toBeVisible();

    // The unit is now occupied and shows its tenant.
    await page.getByRole("link", { name: `${property} · Unit T1` }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Unit T1" })).toBeVisible();
    await expect(page.getByText("Occupied").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name }).first()).toBeVisible();

    // Move out.
    await page.getByRole("link", { name }).first().click();
    await page.getByRole("button", { name: "Move out" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Move-out date")).toBeVisible();
    await dialog.getByRole("button", { name: "Confirm move-out" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Move into a unit" })).toBeVisible();
    await expect(page.getByText("Moved out").filter({ visible: true }).first()).toBeVisible();

    // The unit is vacant again and keeps the tenancy in its history.
    await page.getByRole("link", { name: `${property} · Unit T1` }).first().click();
    await expect(page.getByText("Vacant").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Tenancy history").filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("link", { name })).toBeVisible();

    // Past tenants are listed under "Past".
    await page.goto(`/tenants?status=past&q=${encodeURIComponent(name)}`);
    await expect(page.getByRole("link", { name })).toBeVisible();
  });

  test("searches and filters the tenant list", async ({ page }) => {
    await page.goto("/tenants");
    await expect(page.getByRole("link", { name: TENANTS.tanvir.name })).toBeVisible();
    // Sumaiya has moved out: not current.
    await expect(page.getByRole("link", { name: TENANTS.sumaiya.name })).toHaveCount(0);

    await page
      .getByRole("navigation", { name: "Filter by status" })
      .getByRole("link", { name: "Past" })
      .click();
    await expect(page).toHaveURL(/status=past/);
    await expect(page.getByRole("link", { name: TENANTS.sumaiya.name })).toBeVisible();
    await expect(page.getByRole("link", { name: TENANTS.tanvir.name })).toHaveCount(0);

    await page.goto("/tenants?status=all");
    await page.getByRole("searchbox", { name: "Search tenants" }).fill("Rahim");
    await page.getByRole("searchbox", { name: "Search tenants" }).press("Enter");
    await expect(page).toHaveURL(/q=Rahim/);
    await expect(page.getByRole("link", { name: TENANTS.rahim.name })).toBeVisible();
    await expect(page.getByRole("link", { name: TENANTS.tanvir.name })).toHaveCount(0);
  });

  test("validates the add-tenant form", async ({ page }) => {
    await page.goto("/tenants/new");
    await page.getByLabel("Email (optional)").fill("not-an-email");
    await page.getByRole("button", { name: "Add tenant" }).click();
    await expect(page.getByText("Enter the tenant's full name.")).toBeVisible();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Choose a unit.")).toBeVisible();
    await expect(page).toHaveURL("/tenants/new");
  });
});

test.describe("tenant onboarding with an invite code", () => {
  test("a new tenant links their account with a code, which then stops working", async ({
    browser,
  }) => {
    // Two signups plus property, unit and tenant setup.
    test.slow();
    const landlord = await browser.newPage();
    await login(landlord, USERS.landlordA.email);
    await expect(landlord).toHaveURL("/dashboard");
    const property = await createUnit(landlord);
    const name = uniqueName("E2E Invitee");
    await addTenantToUnit(landlord, name);

    await landlord.getByRole("button", { name: "Create invite code" }).click();
    const code = (await landlord.getByLabel("Invite code", { exact: true }).textContent())?.trim() ?? "";
    expect(code).toMatch(/^[0-9A-Z]{5}-[0-9A-Z]{5}$/);
    await landlord.getByRole("button", { name: "Done" }).click();
    await expect(landlord.getByText(/An invite code is active until/)).toBeVisible();

    // The tenant signs up, is sent to /tenant/join and enters the code (any case).
    const tenantContext = await browser.newContext();
    const tenant = await tenantContext.newPage();
    await signUpTenant(tenant, name);
    await tenant.goto("/tenant/rent");
    await expect(tenant).toHaveURL("/tenant/join");
    await tenant.getByRole("textbox", { name: "Invite code" }).fill("WRONG-CODE1");
    await tenant.getByRole("button", { name: "Connect" }).click();
    await expect(tenant.getByText("That code didn't work.", { exact: false })).toBeVisible();
    await tenant.getByRole("textbox", { name: "Invite code" }).fill(code.toLowerCase());
    await tenant.getByRole("button", { name: "Connect" }).click();
    await expect(tenant).toHaveURL("/tenant/dashboard");
    await expect(tenant.getByText(`${property} · Unit T1`)).toBeVisible();
    await tenantContext.close();

    // The landlord sees the tenant as connected.
    await landlord.reload();
    await expect(landlord.getByText(/can sign in and see their home/)).toBeVisible();

    // The code is single-use.
    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await signUpTenant(other, "E2E Other Tenant");
    await other.getByRole("textbox", { name: "Invite code" }).fill(code);
    await other.getByRole("button", { name: "Connect" }).click();
    await expect(other.getByText("That code didn't work.", { exact: false })).toBeVisible();
    await expect(other).toHaveURL("/tenant/join");
    await otherContext.close();
    await landlord.close();
  });

  test("a linked tenant sees their home", async ({ page }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
    await expect(page.getByText("Green View Tower · Unit A1")).toBeVisible();
    await expect(page.getByText("৳18,000")).toBeVisible();
  });
});

test.describe("tenant data isolation", () => {
  test("landlord B can't see landlord A's tenants", async ({ page }) => {
    await login(page, USERS.landlordB.email);
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/tenants?status=all");
    await expect(page.getByRole("link", { name: "Imran Hossain" })).toBeVisible();
    await expect(page.getByRole("link", { name: TENANTS.tanvir.name })).toHaveCount(0);

    await page.goto(`/tenants/${TENANTS.tanvir.id}`);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByText(TENANTS.tanvir.name)).toHaveCount(0);
  });
});
