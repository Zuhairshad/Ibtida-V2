import type { Page } from '@playwright/test';
import { button, expect, storedWhen, tapLabel, test } from './fixtures';

const visibleText = (page: Page, text: string | RegExp) => page.getByText(text).filter({ visible: true });

test('jamaat times are only what the user enters, shown apart from start times', async ({ page, seed, errors }) => {
  await seed();
  await page.goto('/prayer');
  // Nothing set: no jamaat anywhere, only an invitation to add the masjid's times.
  await expect(visibleText(page, 'BEGINS')).toBeVisible();
  await expect(visibleText(page, /^Jamaat \u2066\d/)).toHaveCount(0);
  await expect(visibleText(page, 'Add your masjid’s jamaat times')).toBeVisible();

  await button(page, 'Masjid and jamaat times').click();
  await expect(page).toHaveURL(/\/jamaat$/);
  await expect(visibleText(page, 'Not set')).toHaveCount(6);

  await page.getByLabel('Masjid name').fill('Masjid an-Noor');
  await page.getByLabel('Masjid name').blur();
  await button(page, 'Asr jamaat, not set').click();
  await expect(visibleText(page, 'Asr jamaat')).toBeVisible();
  await tapLabel(page, 'One minute later');
  await button(page, 'Save').click();
  const s = await storedWhen(page, x => typeof x.jamaat?.Asr === 'number');
  expect(s.masjid).toBe('Masjid an-Noor');
  expect(Object.keys(s.jamaat)).toEqual(['Asr']);

  // School of thought and a manual start-time correction.
  await page.getByRole('tab', { name: 'Ahl-e-Hadith' }).click();
  await storedWhen(page, x => x.hanafi === false);
  const later = page.getByLabel('Maghrib one minute later', { exact: true });
  await later.scrollIntoViewIfNeeded();
  await later.click();
  await later.click();
  await storedWhen(page, x => x.adj?.Maghrib === 2);

  await page.getByLabel('Masjid name').scrollIntoViewIfNeeded();
  await tapLabel(page, 'Back');
  await expect(page).toHaveURL(/\/prayer$/);
  await expect(visibleText(page, /^Jamaat \u2066\d+:\d+ (am|pm)\u2069$/)).toHaveCount(1);
  await expect(visibleText(page, '· JAMAAT')).toBeVisible();
  await expect(visibleText(page, /Standard Asr · adjusted/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('greeting language switches between English and Urdu and keeps the name', async ({ page, seed, errors }) => {
  await seed({ name: 'Aisha Siddiqui' });
  await page.goto('/home');
  await expect(visibleText(page, 'Salam,')).toBeVisible();
  await expect(visibleText(page, 'Aisha')).toBeVisible();

  await page.getByRole('tab', { name: 'You', exact: true }).click();
  await page.getByRole('tab', { name: 'اردو' }).filter({ visible: true }).click();
  const s = await storedWhen(page, x => x.lang === 'ur');
  expect(s.name).toBe('Aisha Siddiqui');

  await page.getByRole('tab', { name: 'ہوم', exact: true }).click();
  await expect(visibleText(page, 'السلام علیکم،')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'السلام علیکم، Aisha' })).toBeVisible();
  await expect(visibleText(page, 'اگلی نماز')).toBeVisible();

  await page.getByRole('tab', { name: 'نماز', exact: true }).click();
  await expect(visibleText(page, 'اذان تک')).toBeVisible();
  expect(errors).toEqual([]);
});

test('onboarding asks which language to greet in', async ({ page, errors }) => {
  await page.goto('/name');
  await page.getByLabel('Your name').fill('Bilal');
  await page.getByRole('tab', { name: 'اردو' }).click();
  await button(page, 'Continue').click();
  const s = await storedWhen(page, x => x.lang === 'ur' && x.name === 'Bilal');
  expect(s.name).toBe('Bilal');
  expect(errors).toEqual([]);
});

test('Profile → Quran bookmarks lists saved ayahs and opens one in the reader', async ({ page, seed, errors }) => {
  await seed({ marks: { '94:6': true, '2:255': true } });
  await page.goto('/profile');
  await page.getByText('Quran bookmarks').filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/home\/quran\?tab=saved$/);
  await expect(page.getByLabel('Bookmark Al-Baqarah ayah 255').filter({ visible: true }).first()).toBeVisible();
  await page.getByLabel(/^Bookmark .*ayah 6$/).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/reader\?surah=94&ayah=6/);
  expect(errors).toEqual([]);
});
