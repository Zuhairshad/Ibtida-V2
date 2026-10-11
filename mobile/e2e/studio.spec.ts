import type { Download, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { button, expect, test } from './fixtures';
import { makeAdmin } from './supabaseMock';

const visibleText = (page: Page, text: string | RegExp) => page.getByText(text).filter({ visible: true });

/** Width and height from a PNG's IHDR chunk. */
async function pngSize(d: Download) {
  const buf = readFileSync((await d.path())!);
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

test('today’s posts reach Home and the feed', async ({ page, seed, errors }) => {
  await seed();
  await page.goto('/home');
  await expect(visibleText(page, 'TODAY’S INSPIRATION · 2')).toBeVisible();
  await page.getByRole('button', { name: /^Today’s inspiration/ }).click();
  await expect(page).toHaveURL(/\/inspiration$/);
  await expect(page.getByText('TODAY', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(visibleText(page, /most beloved deeds to Allah/)).toBeVisible();
  await expect(visibleText(page, 'Sahih al-Bukhari 6464')).toBeVisible();
  await expect(visibleText(page, 'نماز پڑھو اس سے پہلے کہ تمہاری نماز پڑھی جائے۔')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Studio designs a post and exports it at the platform’s real size', async ({ page, seed, errors }) => {
  await seed();
  await page.goto('/inspiration');
  await button(page, 'Design & share').first().click();
  await expect(page).toHaveURL(/\/studio\?id=p1$/);
  await expect(visibleText(page, 'WhatsApp Status · 9:16 · 1080×1920')).toBeVisible();

  // WhatsApp Status / Instagram Story: 1080 × 1920.
  let dl = page.waitForEvent('download');
  await button(page, 'Save image').click();
  expect(await pngSize(await dl)).toEqual([1080, 1920]);

  // Square post, restyled: other background, Urdu on, bigger text.
  await page.getByRole('radio', { name: 'Post · square' }).click();
  await page.getByRole('tab', { name: 'Style' }).click();
  await page.getByRole('radio', { name: 'Midnight' }).click();
  await page.getByRole('tab', { name: 'Layout' }).click();
  await expect(page.getByLabel('English size').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Text' }).click();
  await page.getByLabel('English text').fill('Edited for my status');
  dl = page.waitForEvent('download');
  await button(page, 'Save image').click();
  expect(await pngSize(await dl)).toEqual([1080, 1080]);

  await page.getByRole('radio', { name: 'Post · portrait' }).click();
  dl = page.waitForEvent('download');
  await button(page, 'Save image').click();
  expect(await pngSize(await dl)).toEqual([1080, 1350]);
  expect(errors).toEqual([]);
});

test('anyone can design their own post from scratch', async ({ page, seed }) => {
  await seed();
  await page.goto('/inspiration');
  await button(page, 'Design your own post').click();
  await expect(page).toHaveURL(/\/studio$/);
  await page.getByLabel('English text').fill('Remember Allah often.');
  const dl = page.waitForEvent('download');
  await button(page, 'Save image').click();
  expect(await pngSize(await dl)).toEqual([1080, 1920]);
});

test('only admins can publish', async ({ page, seed }) => {
  await seed();
  await page.goto('/admin');
  await expect(visibleText(page, 'Admins only')).toBeVisible();
  await expect(button(page, 'New post')).toHaveCount(0);
});

test('an admin publishes a hadith (source required) and the 3-a-day limit holds', async ({ page, seed, errors }) => {
  makeAdmin(page);
  await seed();
  await page.goto('/admin');
  await expect(visibleText(page, '2 of 3 published today.')).toBeVisible();

  await button(page, 'New post').click();
  await expect(page).toHaveURL(/\/admin-post$/);
  await page.getByRole('tab', { name: 'Hadith' }).click();
  await page.getByLabel('English text').fill('Make things easy and do not make them difficult.');
  await button(page, 'Publish').click();
  await expect(visibleText(page, /Add the hadith source/).first()).toBeVisible();
  await page.getByLabel('Source').fill('Sahih al-Bukhari 69');
  await button(page, 'Publish').click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(visibleText(page, '3 of 3 published today.')).toBeVisible();

  // It is in the feed straight away.
  await page.goto('/inspiration');
  await expect(visibleText(page, 'Make things easy and do not make them difficult.')).toBeVisible();

  // A fourth post today is refused by the server.
  await page.goto('/admin-post');
  await page.getByLabel('English text').fill('One more reminder');
  await button(page, 'Publish').click();
  await expect(visibleText(page, /Three posts are already published/).first()).toBeVisible();
  // That refusal is the server's 400 answer; nothing else may have failed.
  const refused = errors.filter(e => /status of 400/.test(e));
  expect(refused).toHaveLength(1);
  errors.splice(errors.indexOf(refused[0]), 1);
  expect(errors).toEqual([]);
});
