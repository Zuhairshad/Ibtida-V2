import { TEST_USER } from './supabaseMock';
import { button, storedWhen, expect, stored, test } from './fixtures';

test('first launch walks the onboarding and lands on Home', async ({ page, errors }) => {
  await page.goto('/');
  // Splash auto-advances to Welcome.
  await expect(page.getByText('EVERY JOURNEY BEGINS HERE')).toBeVisible();
  await expect(page).toHaveURL(/\/welcome$/, { timeout: 10_000 });

  await button(page, 'Begin with Bismillah').click();
  await expect(page).toHaveURL(/\/intent$/);
  await expect(page.getByText('What would you like to guard?')).toBeVisible();
  // With nothing selected, Continue is disabled and does nothing.
  for (const name of [/Guard the five prayers/, /Build a morning adhkar habit/, /Digital fasting & focus/]) await page.getByRole('radio', { name }).click();
  await expect(button(page, 'Continue')).toHaveAttribute('aria-disabled', 'true');
  await button(page, 'Continue').click({ force: true });
  await expect(page).toHaveURL(/\/intent$/);
  for (const name of [/Guard the five prayers/, /Build a morning adhkar habit/, /Read Quran regularly/, /Digital fasting & focus/]) await page.getByRole('radio', { name }).click();
  await button(page, 'Continue').click();

  await expect(page).toHaveURL(/\/place$/);
  await expect(page.getByText('Where do you pray?')).toBeVisible();
  const city = page.getByLabel('City');
  await city.fill('Lon');
  await button(page, 'London, UK').click();
  await expect(page.getByText('Selected: London, UK')).toBeVisible();
  await button(page, 'Continue').click();

  await expect(page).toHaveURL(/\/method$/);
  await page.getByRole('radio', { name: /Muslim World League/ }).click();
  await button(page, 'Continue').click();

  await expect(page).toHaveURL(/\/wake$/);
  await expect(page.getByText(/Fajr today is at/)).toBeVisible();
  await button(page, 'Next').click();

  await expect(page).toHaveURL(/\/loading$/);
  await expect(page.getByRole('heading', { name: /Preparing your/ })).toBeVisible();
  await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
  await expect(page.getByText('Save your journey')).toBeVisible();

  await button(page, 'Continue without an account').click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('Salam,')).toBeVisible();
  await expect(page.getByText(/AH · London, UK/)).toBeVisible();
  // Onboarding screens must be gone from the stack, so Back on Home can't return to them.
  for (const gone of ['Small steps.', 'What would you like to guard?', 'Where do you pray?', 'How should we calculate?', 'Save your journey']) {
    await expect(page.getByText(gone)).toHaveCount(0);
  }

  const s = await stored(page);
  expect(s.onboarded).toBe(true);
  expect(s.signedIn).toBeFalsy();
  expect(s.intents).toEqual([true, true, true, true]);
  expect(s.city.name).toBe('London, UK');
  expect(s.method).toBe(1);

  // Relaunch skips onboarding.
  await page.goto('/');
  await expect(page).toHaveURL(/\/home$/);
  expect(errors).toEqual([]);
});

test('"I already have an account" opens sign-in and signs in', async ({ page, errors }) => {
  await page.goto('/welcome');
  await button(page, 'I already have an account').click();
  await expect(page.getByText('Welcome back')).toBeVisible();
  await page.getByLabel('Email').fill('not-an-email');
  await button(page, 'Sign in').click();
  await expect(page.getByText('Enter a valid email address')).toBeVisible();
  // A wrong password is rejected by the server and keeps the user on sign-in.
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password').fill('wrong-password');
  await button(page, 'Sign in').click();
  await expect(page.getByText('Email or password doesn’t match').first()).toBeVisible();
  await expect(page).toHaveURL(/\/auth/);
  // The browser logs the deliberate 400 from the wrong password; that one is expected.
  errors.splice(0, errors.length, ...errors.filter(e => !/status of 400/.test(e)));
  await page.getByLabel('Password').fill(TEST_USER.password);
  await button(page, 'Sign in').click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('Small steps.')).toHaveCount(0);
  const s = await storedWhen(page, x => x.signedIn === true);
  expect(s.email).toBe(TEST_USER.email);
});
