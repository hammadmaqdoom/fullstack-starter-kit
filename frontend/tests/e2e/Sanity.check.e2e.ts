import { expect, test } from '@playwright/test';

// Checkly is a tool used to monitor deployed environments, such as production or preview environments.
// It runs end-to-end tests with the `.check.e2e.ts` extension after each deployment to ensure that the environment is up and running.
// With Checkly, you can monitor your production environment and run `*.check.e2e.ts` tests regularly at a frequency of your choice.
// If the tests fail, Checkly will notify you via email, Slack, or other channels of your choice.
// On the other hand, E2E tests ending with `*.e2e.ts` are only run before deployment.
// You can run them locally or on CI to ensure that the application is ready for deployment.

// BaseURL needs to be explicitly defined in the test file.
// Otherwise, Checkly runtime will throw an exception: `CHECKLY_INVALID_URL: Only URL's that start with http(s)`
// You can't use `goto` function directly with a relative path like with other *.e2e.ts tests.
// Check the example at https://feedback.checklyhq.com/changelog/new-changelog-436

test.describe('Sanity', () => {
  test.describe('Auth entry', () => {
    test('should redirect home to sign-in', async ({ page, baseURL }) => {
      await page.goto(`${baseURL}/`);

      await expect(page).toHaveURL(/sign-in/);
      await expect(
        page.getByRole('heading', { name: 'Sign in' }),
      ).toBeVisible();
    });

    test('should show Microsoft sign-in option', async ({ page, baseURL }) => {
      await page.goto(`${baseURL}/sign-in`);

      await expect(
        page.getByRole('button', { name: 'Sign in with Microsoft' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Forgot password?' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Create an account' }),
      ).toBeVisible();
    });
  });
});
