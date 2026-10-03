import { expect, test, type Browser, type Page } from "@playwright/test";
import { SEED_PASSWORD, USERS, login, uniqueEmail, uniqueName } from "./helpers";

async function signedIn(browser: Browser, email: string, home: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email);
  await expect(page).toHaveURL(home);
  return { page, close: () => context.close() };
}

/** As a landlord: publishes a notice; ends on its page. */
async function publish(
  page: Page,
  title: string,
  audience: { kind: "all" } | { kind: "property"; name: string } | { kind: "units"; units: string[] },
  publishAt?: string,
) {
  await page.goto("/notices/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Message").fill(`Body of ${title}`);
  if (audience.kind === "property") {
    await page.getByRole("radio", { name: "One property" }).click();
    await page.getByRole("combobox", { name: "Property" }).click();
    await page.getByRole("option", { name: audience.name }).click();
  } else if (audience.kind === "units") {
    await page.getByRole("radio", { name: "Specific units" }).click();
    for (const unit of audience.units) await page.getByRole("checkbox", { name: unit }).click();
  }
  if (publishAt) await page.getByLabel("Publish at (optional)").fill(publishAt);
  await page.getByRole("button", { name: "Publish notice" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
}

test.describe("notices", () => {
  test("a tenant sees only notices aimed at their home", async ({ page }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
    await page.goto("/tenant/notices");
    const inbox = page.getByRole("list", { name: "Notices" });
    for (const title of ["Water supply interruption", "Lift maintenance on Friday", "Rooftop access for unit A1"]) {
      await expect(inbox.getByRole("link", { name: new RegExp(title) })).toBeVisible();
    }
    // Other unit, expired, scheduled, and another landlord's notice.
    for (const title of ["Balcony repair for unit A2", "Eid holiday office hours", "New parking rules", "Gas line inspection"]) {
      await expect(page.getByText(title)).toHaveCount(0);
    }
  });

  test("targeting, scheduling, read state and delete", async ({ browser }) => {
    test.slow();
    const landlord = await signedIn(browser, USERS.landlordA.email, "/dashboard");
    const forA1 = uniqueName("Notice A1");
    const forA2 = uniqueName("Notice A2");
    const forTower = uniqueName("Notice tower");
    const later = uniqueName("Notice later");
    await publish(landlord.page, forA1, { kind: "units", units: ["Green View Tower unit A1"] });
    const a1Url = new URL(landlord.page.url()).pathname;
    await publish(landlord.page, forA2, { kind: "units", units: ["Green View Tower unit A2"] });
    await publish(landlord.page, forTower, { kind: "property", name: "Green View Tower" });
    await publish(landlord.page, later, { kind: "all" }, "2099-01-01T09:00");
    await expect(landlord.page.getByText("Scheduled").filter({ visible: true }).first()).toBeVisible();

    const tenant = await signedIn(browser, USERS.tenantA.email, "/tenant/dashboard");
    await tenant.page.goto("/tenant/notices");
    const inbox = tenant.page.getByRole("list", { name: "Notices" });
    await expect(inbox.getByRole("link", { name: `${forA1} (unread)` })).toBeVisible();
    await expect(inbox.getByRole("link", { name: `${forTower} (unread)` })).toBeVisible();
    await expect(tenant.page.getByText(forA2)).toHaveCount(0);
    await expect(tenant.page.getByText(later)).toHaveCount(0);

    // Opening a notice marks it read (a server action from a client effect;
    // wait for it, or leaving the page can cancel it).
    const marked = tenant.page.waitForResponse(
      (r) => r.request().method() === "POST" && r.request().headers()["next-action"] !== undefined,
    );
    await inbox.getByRole("link", { name: `${forA1} (unread)` }).click();
    await marked;
    await expect(tenant.page.getByRole("heading", { level: 1, name: forA1 })).toBeVisible();
    await expect(tenant.page.getByText(`Body of ${forA1}`, { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(async () => {
      await tenant.page.goto("/tenant/notices");
      await expect(inbox.getByRole("link", { name: forA1 })).not.toContainText("(unread)", { timeout: 1000 });
    }).toPass();

    // The landlord sees the read, then deletes the notice; it leaves the inbox.
    await landlord.page.goto(a1Url);
    await expect(landlord.page.getByText("1 tenant")).toBeVisible();
    await landlord.page.getByRole("button", { name: "Delete" }).click();
    await landlord.page.getByRole("alertdialog").getByRole("button", { name: "Delete notice" }).click();
    await expect(landlord.page).toHaveURL("/notices");
    await tenant.page.reload();
    await expect(tenant.page.getByText(forA1)).toHaveCount(0);

    // Landlord B can't open it (it's gone) or see A's other notices.
    const other = await signedIn(browser, USERS.landlordB.email, "/dashboard");
    await other.page.goto("/notices");
    await expect(other.page.getByRole("link", { name: /Gas line inspection/ })).toBeVisible();
    await expect(other.page.getByText(forTower)).toHaveCount(0);

    await Promise.all([landlord.close(), tenant.close(), other.close()]);
  });

  test("validates the notice form", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/notices/new");
    await page.getByRole("radio", { name: "Specific units" }).click();
    await page.getByRole("button", { name: "Publish notice" }).click();
    await expect(page.getByText("Give the notice a title.")).toBeVisible();
    await expect(page.getByText("Choose at least one unit.")).toBeVisible();
  });

  test("the nav shows a count of unread notices", async ({ page }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
    await expect(page.getByRole("link", { name: /Notices.*unread/ }).first()).toBeVisible();
  });
});

test.describe("notice list pagination", () => {
  test("pages through more than 20 notices, newest first", async ({ page }) => {
    // 21 notices through the form.
    test.setTimeout(240_000);
    // A fresh landlord, so the list holds exactly these notices.
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Paging Landlord");
    await page.getByLabel(/Business or portfolio name/).fill(uniqueName("Paging Homes"));
    await page.getByLabel("Email").fill(uniqueEmail("landlord"));
    await page.getByLabel("Password", { exact: true }).fill(SEED_PASSWORD);
    await page.getByLabel("Confirm password").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/dashboard");

    const titles = Array.from({ length: 21 }, (_, i) => `Paged notice ${String(i + 1).padStart(2, "0")}`);
    for (const title of titles) await publish(page, title, { kind: "all" });

    await page.goto("/notices");
    const list = page.getByRole("main").getByRole("listitem");
    await expect(list).toHaveCount(20);
    await expect(list.first()).toContainText(titles[20]);
    await expect(page.getByRole("navigation", { name: "Pagination" })).toContainText("1–20 of 21");

    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL("/notices?page=2");
    await expect(list).toHaveCount(1);
    await expect(list.first()).toContainText(titles[0]);
    await page.getByRole("link", { name: "Previous" }).click();
    await expect(page).toHaveURL("/notices");
  });
});
