import { expect, test } from '@playwright/test';

/**
 * Smoke: People Ops worker list page renders for authenticated users.
 * Full create flow requires backend + People Ops RBAC (run against staging with seeded user).
 */
test.describe('People Ops workers', () => {
  test('workers page requires authentication', async ({ page }) => {
    await page.goto('/people-ops/workers');

    await expect(page).toHaveURL(/sign-in/);
  });

  test('workers list page structure when signed in', async ({ page }) => {
    test.skip(
      !process.env.E2E_PEOPLE_OPS_EMAIL,
      'Set E2E_PEOPLE_OPS_EMAIL and E2E_PEOPLE_OPS_PASSWORD for full smoke',
    );

    await page.goto('/sign-in');
    await page.getByRole('tab', { name: /contractor/i }).click();
    await page.getByLabel(/email/i).fill(process.env.E2E_PEOPLE_OPS_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_PEOPLE_OPS_PASSWORD!);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.goto('/people-ops/workers');

    await expect(page.getByRole('heading', { name: 'Workers' })).toBeVisible();
    await expect(page.getByRole('button', { name: /add worker/i })).toBeVisible();
  });
});
