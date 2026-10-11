import { button, expect, storedWhen, test } from './fixtures';
import { TEST_USER } from './supabaseMock';

test('a pasted password with a trailing space still signs in; Show reveals it', async ({ page, errors }) => {
  await page.goto('/auth?mode=in');
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password', { exact: true }).fill(`${TEST_USER.password} `);
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
  await button(page, 'Show password').click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue(`${TEST_USER.password} `);
  await expect(page.getByLabel('Password', { exact: true })).not.toHaveAttribute('type', 'password');
  await button(page, 'Sign in').click();
  await expect(page).toHaveURL(/\/home$/);
  await storedWhen(page, x => x.signedIn === true);
  // The first try with the space is refused by the server before the trimmed retry succeeds.
  errors.splice(0, errors.length, ...errors.filter(e => !/status of 400/.test(e)));
});

test('Forgot password emails a reset link to the address entered', async ({ page }) => {
  const sent: string[] = [];
  page.on('request', r => { if (r.url().includes('/auth/v1/recover')) sent.push(r.postData() ?? ''); });
  await page.goto('/auth?mode=in');
  await button(page, 'Forgot password?').click();
  await expect(page.getByText('Enter a valid email address')).toBeVisible();
  await page.getByLabel('Email').fill(TEST_USER.email);
  await button(page, 'Forgot password?').click();
  await expect(page.getByText(`Check your inbox — we sent a link to ${TEST_USER.email} to choose a new password.`)).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(sent[0]).toContain(TEST_USER.email);
});

test('a signed-in account changes its password from Profile', async ({ page }) => {
  const updates: string[] = [];
  page.on('request', r => { if (r.url().includes('/auth/v1/user') && r.method() === 'PUT') updates.push(r.postData() ?? ''); });
  await page.goto('/auth?mode=in');
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password', { exact: true }).fill(TEST_USER.password);
  await button(page, 'Sign in').click();
  await expect(page).toHaveURL(/\/home$/);

  await page.goto('/profile');
  await button(page, 'Change password').click();
  await expect(page).toHaveURL(/\/password$/);
  await expect(button(page, 'Save password')).toHaveAttribute('aria-disabled', 'true');
  await page.getByLabel('New password', { exact: true }).fill('abc');
  await expect(page.getByText('Use at least 6 characters', { exact: true })).toBeVisible();
  await page.getByLabel('New password', { exact: true }).fill('a-new-secret');
  await page.getByLabel('Repeat new password').fill('a-new-secre');
  await expect(page.getByText('The passwords don’t match')).toBeVisible();
  await page.getByLabel('Repeat new password').fill('a-new-secret');
  await button(page, 'Save password').click();
  await expect(page.getByText('Password changed').first()).toBeVisible();
  expect(updates.some(u => u.includes('a-new-secret'))).toBe(true);
});
