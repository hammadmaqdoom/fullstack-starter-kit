import { expect, test } from '@playwright/test';

test.describe('Setup wizard', () => {
  test('setup page requires authentication', async ({ page }) => {
    await page.goto('/admin/setup');
    await expect(page).toHaveURL(/sign-in/);
  });
});
