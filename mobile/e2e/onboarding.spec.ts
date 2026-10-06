import { TEST_USER } from './supabaseMock';
import { button, storedWhen, expect, stored, test } from './fixtures';

test('first launch walks the onboarding and lands on Home', async ({ page, errors }) => {
  await page.goto('/');
  // Splash auto-advances to Welcome.
  await expect(page.getByText('EVERY JOURNEY BEGINS HERE')).toBeVisible();
  await expect(page).toHaveURL(/\/welcome$/, { timeout: 10_000 });

  await button(page, 'Begin with Bismillah').click();
  await expect(page).toHaveURL(/\/name$/);
  await expect(button(page, 'Continue')).toHaveAttribute('aria-disabled', 'true');
  await page.getByLabel('Your name').fill('  Aisha  Siddiqui ');
  await button(page, 'Continue').click();

  await expect(page).toHaveURL(/\/intent$/);
  await expect(page.getByText('What would you like to guard?')).toBeVisible();
  // Nothing is pre-selected: Continue waits for a real choice.
  await expect(button(page, 'Continue')).toHaveAttribute('aria-disabled', 'true');
  await button(page, 'Continue').click({ force: true });
  await expect(page).toHaveURL(/\/intent$/);
  for (const name of [/Guard the five prayers/, /Build a morning adhkar habit/, /Read Quran regularly/]) await page.getByRole('radio', { name }).click();
  await button(page, 'Continue').click();

  await expect(page).toHaveURL(/\/place$/);
  await expect(page.getByText('Where do you pray?')).toBeVisible();
  // No city is assumed.
  await expect(page.getByText('Choose your city to continue')).toBeVisible();
  await expect(button(page, 'Continue')).toHaveAttribute('aria-disabled', 'true');
  await page.getByLabel('City').fill('Lon');
  await button(page, 'London, England, United Kingdom').click();
  await expect(page.getByText('Selected: London, United Kingdom')).toBeVisible();
  await button(page, 'Continue').click();

  // The method common in the chosen country is pre-selected (UK → Muslim World League, standard Asr).
  await expect(page).toHaveURL(/\/method$/);
  await storedWhen(page, x => x.method === 1 && x.hanafi === false);
  await expect(page.getByText(/Common in United Kingdom/)).toBeVisible();
  await button(page, 'Continue').click();

  await expect(page).toHaveURL(/\/wake$/);
  await expect(page.getByText(/Fajr today is at/)).toBeVisible();
  await button(page, /^Wake me at \d{1,2}:\d{2} (am|pm)$/).click();

  await expect(page).toHaveURL(/\/loading$/);
  await expect(page.getByRole('heading', { name: /Preparing your/ })).toBeVisible();
  // Real results, not a timer: today's times for London and the planned reminders.
  await expect(page.getByText(/^Fajr \d{1,2}:\d{2} (am|pm) · Maghrib .* · London$/)).toBeVisible();
  await expect(page.getByText(/reminders planned/)).toBeVisible();
  await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
  await expect(page.getByText('Save your journey')).toBeVisible();

  await button(page, 'Continue without an account').click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('Salam,')).toBeVisible();
  await expect(page.getByText('Aisha', { exact: true })).toBeVisible();
  await expect(page.getByText(/AH · London, United Kingdom/)).toBeVisible();
  // Onboarding screens must be gone from the stack, so Back on Home can't return to them.
  for (const gone of ['Small steps.', 'What would you like to guard?', 'Where do you pray?', 'How should we calculate?', 'Save your journey']) {
    await expect(page.getByText(gone)).toHaveCount(0);
  }

  const s = await storedWhen(page, x => x.onboarded === true);
  expect(s.signedIn).toBeFalsy();
  expect(s.name).toBe('Aisha Siddiqui');
  expect(s.intents).toEqual([true, true, true, false]);
  // Picked intents switch on the matching reminders: prayer, adhkar, Quran (focus stays off).
  expect([s.notifs[0], s.notifs[1], s.notifs[3], s.notifs[4]]).toEqual([true, true, true, false]);
  expect(s.city).toMatchObject({ name: 'London, United Kingdom', cc: 'GB' });
  expect(s.method).toBe(1);
  expect(s.hanafi).toBe(false);
  expect(s.wakeVerify[0]).toBe(true);

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

test('wake step: "No alarm" really leaves the Fajr alarm off; South Asia suggests Karachi + Hanafi', async ({ page, seed }) => {
  await seed({ onboarded: false, ob: { place: true, method: '', wake: false }, city: { name: 'Lahore, Pakistan', lat: 31.558, lng: 74.35071, cc: 'PK' }, method: 1, hanafi: false });
  await page.goto('/method');
  await expect(page.getByText(/Common in Pakistan/)).toBeVisible();
  await storedWhen(page, x => x.method === 0 && x.hanafi === true);
  await button(page, 'Continue').click();
  await button(page, 'No alarm').click();
  await expect(page).toHaveURL(/\/loading$/);
  const s = await storedWhen(page, x => x.wakeVerify?.[0] === false);
  expect(s.method).toBe(0);
  expect(s.hanafi).toBe(true);
});
