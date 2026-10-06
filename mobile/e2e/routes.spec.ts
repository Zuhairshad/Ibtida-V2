import { expect, test, withSample } from './fixtures';

/** Every route in src/app, with text that proves the screen actually rendered. */
const ROUTES: [string, string | RegExp][] = [
  ['/home', 'Salam,'],
  ['/home/quran', 'START READING'],
  ['/prayer', 'until adhan'],
  ['/prayer/wake-alarm', 'Prove you’re up.'],
  ['/adhkar', 'Categories'],
  ['/adhkar/goals', 'Keep them small.'],
  ['/adhkar/progress', 'Prayers logged'],
  ['/community', 'TODAY ACROSS THE UMMAH'],
  ['/community/circles', 'Have an invite code?'],
  ['/community/circle/1', 'INVITE CODE'],
  ['/community/goal/0', 'YOUR CONTRIBUTION'],
  ['/profile', 'Appearance'],
  ['/profile/emergency', 'Emergency unlocks'],
  ['/profile/notifications', 'Gentle reminders.'],
  ['/profile/privacy', 'Private by default.'],
  ['/search', 'TRY'],
  ['/session', 'Tap to count · hold to undo · swipe for next'],
  ['/tasbeeh', 'Tap to count · hold to undo'],
  ['/goal-new', 'What would you like to recite?'],
  ['/goal-schedule', 'Save schedule'],
  ['/goal-done', 'GOAL COMPLETE'],
  ['/reader', 'Al-Fatihah'],
  ['/focus-setup', 'APPS TO LOCK'],
  ['/focus-active', 'LOCK ACTIVE'],
  ['/circle-new', 'Name your circle'],
  ['/lock-schedule', 'When should apps lock?'],
  ['/lock-scheduled', 'No lock running'],
  ['/mat-tag', 'Prayer mat tag'],
  ['/wake-scan', 'Scan your wudu station'],
  ['/offline', 'Your progress is local'],
  ['/splash', 'EVERY JOURNEY BEGINS HERE'],
  ['/welcome', 'Small steps.'],
  ['/name', 'What should we call you?'],
  ['/intent', 'What would you like to guard?'],
  ['/place', 'Where do you pray?'],
  ['/method', 'How should we calculate?'],
  ['/wake', /to wake for Fajr\?/],
  ['/loading', 'Calculating prayer times'],
  ['/auth', 'Save your journey'],
];

/** Routes that only make sense with existing goals or circles. */
const NEEDS_DATA = new Set(['/community/circle/1', '/focus-active']);

for (const [path, text] of ROUTES) {
  test(`renders ${path}`, async ({ page, seed, errors }) => {
    await seed(NEEDS_DATA.has(path) ? withSample() : {});
    await page.goto(path);
    await expect(page.getByText(text).first()).toBeVisible();
    // Let mount effects, intervals and entry animations run.
    await page.waitForTimeout(1200);
    expect(errors).toEqual([]);
  });
}

test('unknown circle and goal ids degrade gracefully', async ({ page, seed }) => {
  await seed();
  await page.goto('/community/circle/999');
  await expect(page.getByText('This circle is no longer available')).toBeVisible();
  await page.goto('/community/goal/99');
  await expect(page.getByText('YOUR CONTRIBUTION')).toBeVisible();
});

test('a fresh install shows no sample data', async ({ page, seed }) => {
  await seed();
  await page.goto('/community');
  await expect(page.getByText('Count together with the Ummah')).toBeVisible();
  await page.getByRole('tab', { name: 'Circles' }).click();
  await expect(page.getByText('No circles yet')).toBeVisible();
  await page.goto('/adhkar/goals');
  await expect(page.getByText('No goals yet')).toBeVisible();
  await page.goto('/profile/emergency');
  for (const fake of ['Rahman family', 'Thursday halaqa', 'Family call about travel plans']) await expect(page.getByText(fake)).toHaveCount(0);
});

test('tab bar switches between all five tabs', async ({ page, seed }) => {
  await seed();
  await page.goto('/home');
  const tabs: [string, string][] = [['Prayer', 'until adhan'], ['Adhkar', 'Categories'], ['Ummah', 'TODAY ACROSS THE UMMAH'], ['You', 'Appearance'], ['Home', 'Salam,']];
  for (const [tab, text] of tabs) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(page.getByText(text).first()).toBeVisible();
  }
});
