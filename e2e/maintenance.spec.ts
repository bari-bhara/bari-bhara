import { expect, test, type Page } from "@playwright/test";
import { USERS, login, uniqueName } from "./helpers";

// A 1×1 PNG, enough for the browser → Storage → signed URL round trip.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option }).click();
}

/** As the signed-in tenant, reports a problem; ends on the request page. */
async function reportProblem(page: Page, title: string, withPhoto = false) {
  await page.goto("/tenant/maintenance/new");
  await choose(page, "Category", "Plumbing");
  await page.getByLabel("What's wrong?").fill(title);
  await page.getByLabel("Details (optional)").fill("Dripping under the sink.");
  if (withPhoto) {
    await page.locator('input[type="file"]').setInputFiles({ name: "leak.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByRole("img", { name: "leak.png" })).toBeVisible();
  }
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page).toHaveURL(/\/tenant\/maintenance\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
}

test.describe("maintenance", () => {
  test("tenant reports with a photo; landlord's internal note stays hidden", async ({ browser }) => {
    test.slow();
    const title = uniqueName("Sink leak");

    const tenantContext = await browser.newContext();
    const tenant = await tenantContext.newPage();
    await login(tenant, USERS.tenantA.email);
    await expect(tenant).toHaveURL("/tenant/dashboard");
    await reportProblem(tenant, title, true);
    await expect(tenant.getByText("Pending").filter({ visible: true }).first()).toBeVisible();
    await expect(tenant.getByRole("img", { name: "Photo 1" })).toBeVisible();
    const requestUrl = new URL(tenant.url()).pathname;

    // The landlord finds it among open requests and works on it.
    const landlordContext = await browser.newContext();
    const landlord = await landlordContext.newPage();
    await login(landlord, USERS.landlordA.email);
    await expect(landlord).toHaveURL("/dashboard");
    await landlord.goto("/maintenance");
    await landlord.getByRole("link", { name: new RegExp(title) }).click();
    await expect(landlord.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(landlord.getByRole("img", { name: "Photo 1" })).toBeVisible();

    await choose(landlord, "Status", "In progress");
    await landlord.getByLabel("Note (optional)").fill("Quote: 2,000 from PlumbCo");
    await landlord.getByLabel("Keep the note internal").click();
    await landlord.getByRole("button", { name: "Update status" }).click();
    await expect(landlord.getByText("Internal note: hidden from the tenant")).toBeVisible();

    await landlord.getByLabel("Add a comment or note").fill("A plumber is coming tomorrow at 10am.");
    await landlord.getByRole("button", { name: "Post comment" }).click();
    await expect(landlord.getByText("A plumber is coming tomorrow at 10am.")).toBeVisible();
    const requestId = requestUrl.split("/").pop()!;

    // The tenant sees the status and public comment, but not the internal note.
    await tenant.reload();
    await expect(tenant.getByText("In progress").filter({ visible: true }).first()).toBeVisible();
    await expect(tenant.getByText("A plumber is coming tomorrow at 10am.")).toBeVisible();
    await expect(tenant.getByText("Quote: 2,000 from PlumbCo")).toHaveCount(0);
    await expect(tenant.getByRole("button", { name: "Cancel request" })).toHaveCount(0);

    // The tenant replies; the landlord sees it labelled with their name.
    await tenant.getByLabel("Add a comment").fill("Thanks, I'll be home.");
    await tenant.getByRole("button", { name: "Post comment" }).click();
    await expect(tenant.getByText("Thanks, I'll be home.")).toBeVisible();
    await landlord.reload();
    await expect(landlord.getByText("Thanks, I'll be home.")).toBeVisible();
    await expect(landlord.getByText("Tanvir Ahmed").filter({ visible: true }).first()).toBeVisible();

    // Landlord B can't open it.
    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await login(other, USERS.landlordB.email);
    await expect(other).toHaveURL("/dashboard");
    await other.goto(`/maintenance/${requestId}`);
    await expect(other.getByRole("heading", { name: "404" })).toBeVisible();

    await Promise.all([tenantContext.close(), landlordContext.close(), otherContext.close()]);
  });

  test("a tenant can cancel only while pending", async ({ page }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
    await reportProblem(page, uniqueName("Loose tap"));
    await page.getByRole("button", { name: "Cancel request" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel request" }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(page.getByText("Cancelled").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel request" })).toHaveCount(0);
  });

  test("validates the report form", async ({ page }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
    await page.goto("/tenant/maintenance/new");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Choose a category.")).toBeVisible();
    await expect(page.getByText("Describe the problem in a few words.")).toBeVisible();
  });

  test("landlord sees seeded requests and filters by status", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/maintenance");
    await expect(page.getByRole("link", { name: /AC not cooling/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Front door lock is jammed/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /No internet since yesterday/ })).toHaveCount(0);
    await page
      .getByRole("navigation", { name: "Filter by status" })
      .getByRole("link", { name: "Resolved" })
      .click();
    await expect(page.getByRole("link", { name: /Front door lock is jammed/ })).toBeVisible();
  });
});
