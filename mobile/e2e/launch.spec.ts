import { expect, stored, test } from './fixtures';

test('a verse greets each launch and Bismillah continues to Home', async ({ page, seed, errors }) => {
  await seed({ launchAyah: true });
  await page.goto('/');
  await expect(page.getByText('A VERSE FOR YOUR HEART')).toBeVisible();
  await expect(page.getByText(/^[A-Z][^a-z]+ \d+:\d+$/)).toBeVisible();
  await page.getByRole('button', { name: 'Bismillah' }).click();
  await expect(page.getByText('A VERSE FOR YOUR HEART')).toHaveCount(0);
  await expect(page).toHaveURL(/\/home$/);
  await page.screenshot({ path: 'test-results/launch-ayah-home.png' });
  expect(errors).toEqual([]);
});

test('the verse can be switched off in Notifications', async ({ page, seed, errors }) => {
  await seed({ launchAyah: true });
  await page.goto('/profile/notifications');
  await page.getByRole('button', { name: 'Bismillah' }).click();
  await page.getByRole('switch', { name: /Verse on opening/ }).click();
  await expect.poll(async () => (await stored(page)).launchAyah).toBe(false);
  await page.reload();
  await expect(page).toHaveURL(/\/profile\/notifications$/);
  await expect(page.getByText('A VERSE FOR YOUR HEART')).toHaveCount(0);
  expect(errors).toEqual([]);
});
