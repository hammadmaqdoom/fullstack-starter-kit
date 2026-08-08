import { expect, takeSnapshot, test } from '@chromatic-com/playwright';

test.describe('Visual testing', () => {
  test.describe('Auth pages', () => {
    test('should take screenshot of the sign-in page', async ({ page }, testInfo) => {
      await page.goto('/sign-in');

      await expect(
        page.getByRole('heading', { name: 'Sign in' }),
      ).toBeVisible();

      await takeSnapshot(page, testInfo);
    });

    test('should take screenshot of the sign-up page', async ({ page }, testInfo) => {
      await page.goto('/sign-up');

      await expect(
        page.getByRole('heading', { name: 'Create account' }),
      ).toBeVisible();

      await takeSnapshot(page, testInfo);
    });

    test('should take screenshot of the forgot-password page', async ({ page }, testInfo) => {
      await page.goto('/forgot-password');

      await expect(
        page.getByRole('heading', { name: 'Forgot your password?' }),
      ).toBeVisible();

      await takeSnapshot(page, testInfo);
    });
  });
});
