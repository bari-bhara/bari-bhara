import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  TENANTS,
  USERS,
  addTenantToUnit,
  createUnit,
  login,
  monthLabel,
  monthParam,
  signUpTenant,
  uniqueName,
} from "./helpers";

// Feedback round 1, Phases C and D: outstanding overview, "Already paid"
// claims, monthly statements, and invite codes that stay visible.

const MAILPIT = "http://127.0.0.1:54324";
const thisMonth = monthParam(0);

async function emailSubjectsTo(address: string, since: Date) {
  const response = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`);
  const body = (await response.json()) as { messages: { Subject: string; Created: string }[] };
  return body.messages.filter((m) => new Date(m.Created) >= since).map((m) => m.Subject);
}

/**
 * Landlord B adds a tenant to a new unit and bills this month's rent; the
 * tenant signs up and links with the invite code. Landlord B, so landlord A's
 * seeded totals stay as other tests expect.
 */
async function billedLinkedTenant(browser: Browser): Promise<{ landlord: Page; tenant: Page; name: string }> {
  const landlord = await browser.newPage();
  await login(landlord, USERS.landlordB.email);
  await expect(landlord).toHaveURL("/dashboard");
  await createUnit(landlord);
  const name = uniqueName("E2E Claimer");
  await addTenantToUnit(landlord, name);

  await landlord.getByRole("button", { name: "Create invite code" }).click();
  const code = (await landlord.getByLabel("Invite code", { exact: true }).textContent())?.trim() ?? "";
  await landlord.getByRole("button", { name: "Done" }).click();

  // The code stays on the page until it's used (ADR 0011).
  await landlord.reload();
  await expect(landlord.getByLabel("Active invite code")).toHaveText(code);

  await landlord.goto("/rent");
  await landlord.getByRole("button", { name: "Generate rent" }).first().click();
  await landlord.getByRole("alertdialog").getByRole("button", { name: "Generate rent" }).click();
  await expect(landlord.getByRole("alertdialog")).toHaveCount(0);

  const tenantContext = await browser.newContext();
  const tenant = await tenantContext.newPage();
  await signUpTenant(tenant, name);
  await expect(async () => {
    await tenant.getByRole("textbox", { name: "Invite code" }).fill(code);
    await tenant.getByRole("button", { name: "Connect" }).click();
    await expect(tenant).toHaveURL("/tenant/dashboard", { timeout: 5000 });
  }).toPass();
  return { landlord, tenant, name };
}

test.describe("payment claims", () => {
  test("a tenant says they paid; the landlord is emailed and approves it", async ({ browser }) => {
    test.slow();
    const started = new Date(Date.now() - 1000);
    const { landlord, tenant, name } = await billedLinkedTenant(browser);

    await tenant.goto("/tenant/rent");
    const rentLabel = `Rent · ${monthLabel(thisMonth)}`;
    await tenant.getByRole("button", { name: `Already paid ${rentLabel}` }).click();
    const dialog = tenant.getByRole("dialog", { name: "Tell your landlord you paid" });
    await dialog.getByLabel(/Amount paid/).fill("5000");
    await dialog.getByLabel("Reference (optional)").fill("TRX123");
    await dialog.getByRole("button", { name: "Send to landlord" }).click();
    await expect(tenant.getByText(/Waiting for your landlord to confirm/)).toBeVisible();

    await expect
      .poll(async () => (await emailSubjectsTo(USERS.landlordB.email, started)).join("|"))
      .toContain(`${name} says they paid`);

    await landlord.goto("/dashboard");
    await expect(landlord.getByRole("list", { name: "Payment claims to review" }).getByText(name)).toBeVisible();
    await landlord.goto("/rent/claims");
    await landlord.getByRole("button", { name: `Approve ${name}'s claim` }).click();
    await landlord.getByRole("alertdialog").getByRole("button", { name: "Approve and record" }).click();
    // Other tests' claims may still be listed.
    await expect(landlord.getByRole("button", { name: `Approve ${name}'s claim` })).toHaveCount(0);

    await tenant.goto("/tenant/notifications");
    await expect(tenant.getByText(/Payment confirmed/).first()).toBeVisible();
    await tenant.goto("/tenant/payments");
    await expect(tenant.getByText(/TRX123/).first()).toBeVisible();
    await tenant.context().close();
    await landlord.close();
  });

  test("a rejected claim shows the landlord's reason", async ({ browser }) => {
    test.slow();
    const { landlord, tenant, name } = await billedLinkedTenant(browser);

    await tenant.goto("/tenant/rent");
    await tenant.getByRole("button", { name: /^Already paid Rent/ }).click();
    await tenant.getByRole("dialog").getByRole("button", { name: "Send to landlord" }).click();
    await expect(tenant.getByText(/Waiting for your landlord to confirm/)).toBeVisible();

    await landlord.goto("/rent");
    await landlord.getByRole("link", { name: /(says|say) they've paid/ }).click();
    await landlord.getByRole("button", { name: `Reject ${name}'s claim` }).click();
    await landlord.getByRole("dialog").getByRole("button", { name: "Reject claim" }).click();
    await expect(landlord.getByText("Tell the tenant why, so they can sort it out.")).toBeVisible();
    await landlord.getByRole("dialog").getByLabel("Reason").fill("No payment arrived");
    await landlord.getByRole("dialog").getByRole("button", { name: "Reject claim" }).click();
    await expect(landlord.getByRole("button", { name: `Reject ${name}'s claim` })).toHaveCount(0);

    await tenant.reload();
    await expect(tenant.getByText(/couldn't confirm your payment.*No payment arrived/)).toBeVisible();
    // They can claim again.
    await expect(tenant.getByRole("button", { name: /^Already paid Rent/ })).toBeVisible();
    await tenant.context().close();
    await landlord.close();
  });
});

test.describe("outstanding and statements", () => {
  test("the dashboard links to everything outstanding, overdue first", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await page.getByRole("link", { name: "Outstanding" }).click();
    await expect(page).toHaveURL("/outstanding");
    const owing = page.getByRole("list", { name: "Tenants owing" });
    // Rahim's rent from last month is overdue (seed), so he's near the top.
    await expect(owing.getByRole("link", { name: TENANTS.rahim.name })).toBeVisible();
    await expect(owing.getByText(/overdue/).first()).toBeVisible();
  });

  test("a tenant sees each month's bills and payments", async ({ page }) => {
    await login(page, USERS.tenantA.email);
    await expect(page).toHaveURL("/tenant/dashboard");
    await page.goto("/tenant/payments");
    const month = page.getByRole("region", { name: `Statement for ${monthLabel(monthParam(-1))}` });
    await expect(month).toBeVisible();
    await expect(month.getByText("Rent").first()).toBeVisible();
    await expect(month.getByText(/^Paid /).first()).toBeVisible();
  });

  test("the landlord sees a tenant's monthly breakdown", async ({ page }) => {
    await login(page, USERS.landlordA.email);
    await expect(page).toHaveURL("/dashboard");
    await page.goto(`/tenants/${TENANTS.tanvir.id}`);
    await expect(
      page.getByRole("region", { name: `Statement for ${monthLabel(monthParam(-1))}` }),
    ).toBeVisible();
  });
});
