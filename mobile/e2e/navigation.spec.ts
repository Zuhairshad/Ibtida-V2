import { button, expect, tapLabel, test } from './fixtures';
import type { Page } from '@playwright/test';

const back = (page: Page) => tapLabel(page, 'Back');

test('Back returns to the screen that opened a nested route in another tab', async ({ page, seed, errors }) => {
  await seed();
  await page.goto('/home');
  await button(page, 'Notifications').click();
  await expect(page).toHaveURL(/\/profile\/notifications$/);
  await back(page);
  await expect(page).toHaveURL(/\/home$/);

  await button(page, 'Calendar and progress').click();
  await expect(page).toHaveURL(/\/adhkar\/progress$/);
  await back(page);
  await expect(page).toHaveURL(/\/home$/);

  // The tab still opens on its root afterwards.
  await page.getByRole('tab', { name: 'Adhkar', exact: true }).click();
  await expect(page).toHaveURL(/\/adhkar$/);
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  expect(errors).toEqual([]);
});

test('full-screen routes opened directly fall back to Home on Back', async ({ page, seed, errors }) => {
  await seed();
  for (const path of ['/search', '/session', '/tasbeeh', '/goal-new', '/reader', '/offline']) {
    await page.goto(path);
    await back(page);
    await expect(page).toHaveURL(/\/home$/);
  }
  await page.goto('/wake-scan');
  await tapLabel(page, 'Close');
  await expect(page).toHaveURL(/\/home$/);
  // Saving from a directly opened form also lands somewhere sensible.
  await page.goto('/goal-new');
  await button(page, 'Create goal').click();
  await expect(page).toHaveURL(/\/home$/);
  expect(errors).toEqual([]);
});

test('search Back returns to where search was opened', async ({ page, seed }) => {
  await seed();
  await page.goto('/home');
  await button(page, /KALIMAT/).click();
  await expect(page).toHaveURL(/\/search$/);
  await back(page);
  await expect(page).toHaveURL(/\/home$/);
});
