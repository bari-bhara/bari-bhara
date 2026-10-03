import { defineConfig, devices } from "@playwright/test";

/**
 * Read-only smoke test for a deployed site (production or a preview):
 *   SMOKE_BASE_URL=https://… pnpm test:smoke
 * Optional sign-in checks: SMOKE_LANDLORD_EMAIL / SMOKE_LANDLORD_PASSWORD and
 * SMOKE_TENANT_EMAIL / SMOKE_TENANT_PASSWORD (existing accounts; nothing is
 * created or changed). See docs/runbooks/deployment.md.
 */
const baseURL = process.env.SMOKE_BASE_URL;
if (!baseURL) throw new Error("Set SMOKE_BASE_URL to the site to check, e.g. https://baribhara.example.com");

export default defineConfig({
  testDir: "./e2e/smoke",
  fullyParallel: true,
  retries: 1,
  reporter: "list",
  expect: { timeout: 15_000 },
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});
