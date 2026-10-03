import { expect, test, type Page } from "@playwright/test";
import { USERS, login, monthParam } from "./helpers";

const MAILPIT = "http://127.0.0.1:54324";
const lastMonth = monthParam(-1);

type MailpitMessage = { Subject: string; Created: string; To: { Address: string }[] };

async function emailsTo(address: string, since: Date): Promise<MailpitMessage[]> {
  const response = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`);
  const body = (await response.json()) as { messages: MailpitMessage[] };
  return body.messages.filter((m) => new Date(m.Created) >= since);
}

/** Sends the confirm dialog and returns the toast text. */
async function confirmAndReadToast(page: Page, button: string, confirm: string) {
  await page.getByRole("button", { name: button }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: confirm }).click();
  const toast = page.locator("[data-sonner-toast]").last();
  await expect(toast).toBeVisible();
  return (await toast.textContent()) ?? "";
}

test.describe("payment reminders", () => {
  test("a single reminder reaches the tenant in-app and by email", async ({ page, browser }) => {
    test.slow();
    const started = new Date(Date.now() - 1000);
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");

    // Tanvir's electricity bill from last month is overdue (seed).
    await page.goto(`/bills?month=${lastMonth}`);
    await page.getByRole("link", { name: "Tanvir Ahmed" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: /^Electricity/ })).toBeVisible();

    const toast = await confirmAndReadToast(page, "Send reminder", "Send reminder");
    expect(toast).toContain("Reminder sent (in-app and email)");
    const log = page.getByRole("list", { name: "Reminders" });
    await expect(log.getByText("tenant.a@example.com").first()).toBeVisible();
    await expect(log.getByText("sent").first()).toBeVisible();

    // The email arrived in Mailpit.
    await expect
      .poll(async () => (await emailsTo(USERS.tenantA.email, started)).map((m) => m.Subject).join("|"))
      .toContain("Payment overdue");

    // The tenant sees it in their Reminders inbox.
    const tenantContext = await browser.newContext();
    const tenant = await tenantContext.newPage();
    await login(tenant, USERS.tenantA.email);
    await expect(tenant).toHaveURL("/tenant/dashboard");
    await tenant.goto("/tenant/notifications");
    const inbox = tenant.getByRole("list", { name: "Reminders" });
    await expect(inbox.getByText(/Payment overdue/).first()).toBeVisible();
    await expect(inbox.getByText(/Electricity/).first()).toBeVisible();
    await tenantContext.close();
  });

  test("a tenant with no login or email can't be reminded from a charge", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await page.goto(`/rent?month=${lastMonth}`);
    await page.getByRole("link", { name: "Rahim Uddin" }).first().click();
    await expect(page.getByText(/reminders can't reach them/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reminder" })).toHaveCount(0);
  });

  test("bulk reminders report unreachable tenants and skip recent ones", async ({ page }) => {
    test.slow();
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");

    const first = await confirmAndReadToast(page, "Remind overdue tenants", "Send reminders");
    expect(first).toContain("can't reach Rahim Uddin");

    // Everyone reachable was reminded moments ago (by this run or a parallel one).
    await page.reload();
    const second = await confirmAndReadToast(page, "Remind overdue tenants", "Send reminders");
    expect(second).toContain("already reminded today");
    expect(second).toContain("No reminders sent");
  });
});
