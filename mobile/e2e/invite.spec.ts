import type { Page } from '@playwright/test';
import { button, expect, storedWhen, test } from './fixtures';
import { INVITE, TEST_USER } from './supabaseMock';

const visibleText = (page: Page, text: string | RegExp) => page.getByText(text).filter({ visible: true });

test('an invitation link survives sign-in and joins the right circle', async ({ page, seed, errors }) => {
  await seed();
  await page.goto(`/join?code=${INVITE.code.toLowerCase()}`);
  await expect(visibleText(page, `Join ${INVITE.name}`)).toBeVisible();
  await expect(visibleText(page, /4 members/)).toBeVisible();
  await storedWhen(page, s => s.pendingInvite === INVITE.code);

  await button(page, 'Sign in to join').click();
  await expect(page).toHaveURL(/\/auth/);
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password').fill(TEST_USER.password);
  await button(page, 'Sign in').click();

  // Back on the invitation after signing in.
  await expect(page).toHaveURL(/\/join/);
  await button(page, 'Join circle').click();
  await expect(page).toHaveURL(/\/community\/circle\/\d+$/);
  const s = await storedWhen(page, x => x.pendingInvite === null && x.circles?.some((c: { code: string }) => c.code === INVITE.code));
  expect(s.circles.filter((c: { code: string }) => c.code === INVITE.code)).toHaveLength(1);
  expect(errors).toEqual([]);
});

for (const [code, title] of [['EXPIRED2', 'This invitation has expired'], ['REVOKED2', 'This invitation was turned off'], ['NOPE2345', 'This link isn’t valid'], ['!!', 'This link isn’t valid']] as const) {
  test(`code ${code}: "${title}", and no way to join`, async ({ page, seed }) => {
    await seed();
    await page.goto(`/join?code=${encodeURIComponent(code)}`);
    await expect(visibleText(page, title)).toBeVisible();
    await expect(button(page, 'Join circle')).toHaveCount(0);
    await expect(button(page, 'Sign in to join')).toHaveCount(0);
    await button(page, 'Close').click();
  });
}
