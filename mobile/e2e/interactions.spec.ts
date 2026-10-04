import { button, expect, STORAGE_KEY, stored, storedWhen, test, todayKey } from './fixtures';
import type { Page } from '@playwright/test';

const visibleText = (page: Page, text: string | RegExp) => page.getByText(text).filter({ visible: true });
const labelled = (page: Page, name: string | RegExp) => page.getByLabel(name, { exact: typeof name === 'string' }).filter({ visible: true });
const inkOf = (page: Page, text: string) => visibleText(page, text).first().evaluate(el => getComputedStyle(el).color);

test.describe('prayer', () => {
  test('log a prayer from the row and persist it', async ({ page, seed, errors }) => {
    await seed();
    await page.goto('/prayer');
    await button(page, 'Mark Dhuhr as prayed').click();
    await expect(button(page, 'Unmark Dhuhr')).toBeVisible();
    await expect(visibleText(page, 'Dhuhr logged · May Allah accept it')).toBeVisible();
    // The check must not also open the detail sheet behind it.
    await expect(visibleText(page, /RAK’AH/)).toHaveCount(0);
    const key = await todayKey(page);
    await storedWhen(page, s => s.logs?.[key]?.Dhuhr === 'prayed');

    await page.reload();
    await expect(button(page, 'Unmark Dhuhr')).toBeVisible();
    await button(page, 'Unmark Dhuhr').click();
    await expect(button(page, 'Mark Dhuhr as prayed')).toBeVisible();
    await storedWhen(page, s => !s.logs?.[key]?.Dhuhr);
    expect(errors).toEqual([]);
  });

  test('prayer detail sheet opens, logs and closes', async ({ page, seed }) => {
    await seed();
    await page.goto('/prayer');
    await page.getByRole('button', { name: /^Asr \d/ }).click();
    await expect(visibleText(page, 'RAK’AH · COMMON HANAFI PRACTICE')).toBeVisible();
    await button(page, 'Madinah').click();
    await button(page, 'Prayed on time').click();
    await expect(visibleText(page, 'RAK’AH · COMMON HANAFI PRACTICE')).toHaveCount(0);
    await expect(button(page, 'Unmark Asr')).toBeVisible();
    const key = await todayKey(page);
    const s = await storedWhen(page, x => x.logs?.[key]?.Asr === 'prayed');
    expect(s.sound).toBe(1);

    // Re-open and dismiss with the drag handle, then with the scrim.
    await page.getByRole('button', { name: /^Isha \d/ }).click();
    await expect(visibleText(page, 'RAK’AH · COMMON HANAFI PRACTICE')).toBeVisible();
    await labelled(page, 'Close').click();
    await expect(visibleText(page, 'RAK’AH · COMMON HANAFI PRACTICE')).toHaveCount(0);
    await page.getByRole('button', { name: /^Fajr \d/ }).click();
    await expect(visibleText(page, 'RAK’AH · COMMON HANAFI PRACTICE')).toBeVisible();
    await labelled(page, 'Dismiss').click({ position: { x: 20, y: 20 } });
    await expect(visibleText(page, 'RAK’AH · COMMON HANAFI PRACTICE')).toHaveCount(0);
  });

  test('location sheet changes the calculation method', async ({ page, seed }) => {
    await seed();
    await page.goto('/prayer');
    await expect(visibleText(page, /Lahore, Pakistan · Karachi · Hanafi Asr/)).toBeVisible();
    await button(page, 'Location and method').click();
    await expect(visibleText(page, 'Location & method')).toBeVisible();
    await page.getByRole('radio', { name: 'Muslim World League' }).click();
    await page.getByRole('tab', { name: 'Shafi‘i, Maliki, Hanbali' }).filter({ visible: true }).click();
    await button(page, 'Save & recalculate').click();
    await expect(visibleText(page, 'Location & method')).toHaveCount(0);
    await expect(visibleText(page, /Lahore, Pakistan · MWL · Standard Asr/)).toBeVisible();
    const s = await storedWhen(page, x => x.method === 1);
    expect(s.hanafi).toBe(false);
  });

  test('Qibla shortcut on Home opens the compass on Prayer', async ({ page, seed }) => {
    await seed();
    await page.goto('/home');
    await page.getByRole('button', { name: /QIBLA/ }).click();
    await expect(page).toHaveURL(/\/prayer/);
    await expect(visibleText(page, /Showing the calculated bearing/)).toBeVisible();
  });

  test('wake alarm toggles persist and the scan flow completes', async ({ page, seed }) => {
    await seed();
    await page.goto('/prayer/wake-alarm');
    await page.getByRole('switch', { name: 'Isha' }).click();
    await storedWhen(page, s => s.wakeVerify?.[4] === true);
    await button(page, 'Test the alarm').click();
    await expect(visibleText(page, 'Scan your wudu station')).toBeVisible();
    await button(page, 'Simulate scan').click();
    await expect(visibleText(page, 'Now scan your prayer mat')).toBeVisible();
    await button(page, 'Simulate scan').click();
    await expect(visibleText(page, 'You’re up. Alhamdulillah.')).toBeVisible();
    await button(page, 'Done').click();
    await expect(page).toHaveURL(/\/prayer\/wake-alarm$/);
  });
});

test.describe('location', () => {
  test.use({ geolocation: { latitude: 51.5074, longitude: -0.1278 }, permissions: ['geolocation'] });

  test('"Use my current location" sets the city from the device position', async ({ page, seed, errors }) => {
    await seed();
    await page.goto('/prayer');
    await button(page, 'Location and method').click();
    await button(page, /Use my current location/).click();
    // Reverse geocoding is native-only, so web falls back to coordinates; either way the city updates.
    await expect(visibleText(page, /Location set · /).first()).toBeVisible();
    const s = await storedWhen(page, x => Math.abs((x.city?.lat ?? 0) - 51.5074) < 0.01);
    expect(s.city.lng).toBeCloseTo(-0.1278, 2);
    expect(errors).toEqual([]);
  });
});

test.describe('home', () => {
  test('daily insight sheet opens and closes', async ({ page, seed, errors }) => {
    await seed();
    await page.goto('/home');
    await button(page, 'Open daily insight').click();
    await expect(visibleText(page, 'Today’s insight')).toBeVisible();
    await expect(visibleText(page, 'MILESTONES')).toBeVisible();
    await labelled(page, 'Close').click();
    await expect(visibleText(page, 'Today’s insight')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('quick actions navigate', async ({ page, seed }) => {
    await seed();
    await page.goto('/home');
    await visibleText(page, 'Quran').first().click();
    await expect(page).toHaveURL(/\/home\/quran$/);
    await page.getByLabel('Search surahs').fill('18');
    await expect(visibleText(page, 'Al-Kahf')).toBeVisible();
    await expect(visibleText(page, 'Al-Fatihah')).toHaveCount(0);
  });
});

test.describe('quran reader', () => {
  test('reader settings sheet changes size, translation, theme and bookmarks', async ({ page, seed }) => {
    await seed();
    await page.goto('/reader');
    await button(page, 'Bookmark 2:184').click();
    await expect(button(page, 'Remove bookmark 2:184')).toBeVisible();

    await labelled(page, 'Reading settings').click();
    await expect(visibleText(page, 'Arabic size')).toBeVisible();
    await button(page, 'Larger').click();
    await expect(visibleText(page, '32 pt')).toBeVisible();
    await page.getByRole('switch', { name: 'Show translation' }).click();
    await page.getByRole('tab', { name: 'Sepia' }).click();
    await labelled(page, 'Close').click();
    await expect(visibleText(page, 'Arabic size')).toHaveCount(0);
    await expect(visibleText(page, 'Licensed translation loading…')).toHaveCount(0);

    const s = await storedWhen(page, x => x.rTheme === 2);
    expect(s.fontSize).toBe(32);
    expect(s.showTr).toBe(false);
    expect(s.marks['184']).toBe(true);
  });
});

test.describe('adhkar', () => {
  test('tasbeeh counts to the end of a round', async ({ page, seed, errors }) => {
    await seed({ tasN: 30, dh: 0 });
    await page.goto('/tasbeeh');
    const counter = labelled(page, /^Count\. \d+ of 33$/);
    await expect(counter).toHaveAttribute('aria-label', 'Count. 30 of 33');
    for (let i = 0; i < 3; i++) await counter.click();
    await expect(counter).toHaveAttribute('aria-label', 'Count. 33 of 33');
    await expect(visibleText(page, 'SubhanAllah · round of 33 complete')).toBeVisible();
    await storedWhen(page, s => s.tasN === 33);

    // Next round starts from the lit-bead reset, switching dhikr resets the count.
    await counter.click();
    await expect(counter).toHaveAttribute('aria-label', 'Count. 34 of 33');
    await button(page, 'Allahu Akbar').click();
    await expect(labelled(page, 'Count. 0 of 34')).toBeVisible();
    await button(page, 'Reset').click();
    expect(errors).toEqual([]);
  });

  test('the last taps are saved immediately when the app is backgrounded', async ({ page, seed }) => {
    await seed({ tasN: 5, dh: 0 });
    await page.goto('/tasbeeh');
    const counter = labelled(page, /^Count\./);
    await expect(counter).toHaveAttribute('aria-label', 'Count. 5 of 33');
    await counter.click();
    // Background the app well inside the 250ms save debounce and read storage synchronously.
    const saved = await page.evaluate(k => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      return JSON.parse(localStorage.getItem(k) || '{}').tasN;
    }, STORAGE_KEY);
    expect(saved).toBe(6);
  });

  test('counting a goal to its target shows Goal complete and returns Home', async ({ page, seed }) => {
    const goals = [{ id: 1, name: 'Durood Sharif', target: 100, prog: 98, streak: 9, remind: '8:00 pm', week: [1, 1, 1, 1, 0, 1, 1], cg: '1 Million Salawat' }];
    await seed({ goals });
    await page.goto('/adhkar/goals');
    await button(page, 'Count now').click();
    await expect(page).toHaveURL(/\/tasbeeh/);
    const counter = labelled(page, /^Count\./);
    await expect(counter).toHaveAttribute('aria-label', 'Count. 98 of 100');
    await counter.click();
    await counter.click();
    await expect(page).toHaveURL(/\/goal-done/);
    await expect(visibleText(page, 'Durood Sharif complete. May Allah accept your worship.')).toBeVisible();
    await storedWhen(page, s => s.goals[0].prog === 100);
    await button(page, 'Back to Home').click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(visibleText(page, 'Salam,')).toBeVisible();
  });

  test('a goal that is already complete does not count past its target', async ({ page, seed }) => {
    await seed();
    await page.goto('/tasbeeh?goal=2'); // Istighfar, seeded at 100 / 100
    const counter = labelled(page, /^Count\./);
    await expect(counter).toHaveAttribute('aria-label', 'Count. 100 of 100');
    await expect(visibleText(page, /^0 remaining/)).toBeVisible();
    // Extra counts are kept, but don't re-trigger the Goal complete screen.
    await counter.click();
    await expect(counter).toHaveAttribute('aria-label', 'Count. 101 of 100');
    await expect(page).toHaveURL(/\/tasbeeh/);
    await expect(visibleText(page, /^0 remaining/)).toBeVisible();
  });

  test('an adhkar session runs to completion', async ({ page, seed }) => {
    await seed();
    await page.goto('/adhkar');
    await button(page, /^Evening adhkar/).click();
    await expect(page).toHaveURL(/\/session/);
    for (const [step, n] of [[1, 100], [2, 3], [3, 33]] as const) {
      await expect(visibleText(page, `${step} / 3`)).toBeVisible();
      const counter = labelled(page, /^Count\./);
      for (let i = 0; i < n; i++) await counter.click();
    }
    await expect(page).toHaveURL(/\/home$/);
    await expect(visibleText(page, 'Evening adhkar complete · May Allah accept')).toBeVisible();
  });

  test('create a goal', async ({ page, seed }) => {
    await seed();
    await page.goto('/adhkar/goals');
    await expect(visibleText(page, 'Three active.')).toBeVisible();
    await button(page, 'New goal').click();
    await expect(page).toHaveURL(/\/goal-new$/);
    await page.getByRole('radio', { name: /La ilaha illa Allah/ }).click();
    await button(page, 'Increase').click();
    await button(page, 'Weekdays').click();
    await button(page, 'Create goal').click();
    await expect(page).toHaveURL(/\/adhkar\/goals$/);
    await expect(visibleText(page, 'Four active.')).toBeVisible();
    await expect(page.getByText('La ilaha illa Allah', { exact: true }).filter({ visible: true })).toBeVisible();
    const s = await storedWhen(page, x => x.goals?.length === 4);
    expect(s.goals[3]).toMatchObject({ name: 'La ilaha illa Allah', target: 133, prog: 0, days: [1, 1, 1, 1, 1, 0, 0] });
  });

  test('schedule a goal reminder', async ({ page, seed }) => {
    await seed();
    await page.goto('/adhkar/goals');
    await button(page, 'Schedule').first().click();
    await expect(page).toHaveURL(/\/goal-schedule/);
    await labelled(page, '9').click();
    await labelled(page, '30').click();
    await labelled(page, 'Sat').click();
    await button(page, 'Save schedule').click();
    await expect(page).toHaveURL(/\/adhkar\/goals$/);
    await expect(visibleText(page, /9-day streak · 9:30 pm/)).toBeVisible();
    const s = await storedWhen(page, x => x.goals?.[0]?.remind === '9:30 pm');
    expect(s.goals[0].days).toEqual([1, 1, 1, 1, 1, 1, 0]);
  });

  test('progress ranges switch', async ({ page, seed }) => {
    await seed();
    await page.goto('/adhkar/progress');
    for (const r of ['Today', 'Month', 'Year', 'Week']) await page.getByRole('tab', { name: r }).click();
    await expect(visibleText(page, '2 weeks ago')).toBeVisible();
  });
});

test.describe('ibadah lock', () => {
  // A horizontal *touch* swipe in desktop Chromium triggers its swipe-to-go-back gesture, so drive the
  // slider with a mouse (react-native-web's responder system handles both).
  test.use({ isMobile: false, hasTouch: false });
  test('emergency unlock sheet logs the reason', async ({ page, seed, errors }) => {
    await seed();
    await page.goto('/home');
    await visibleText(page, 'Ibadah Lock').first().click();
    await expect(page).toHaveURL(/\/focus-setup$/);
    await button(page, 'Activate Ibadah Lock').click();
    await expect(page).toHaveURL(/\/focus-active/);
    await expect(visibleText(page, 'LOCK ACTIVE')).toBeVisible();

    const knob = page.getByLabel('Emergency unlock slider');
    const slide = async () => {
      // A previous mouse drag leaves a DOM text selection; pressing on it would start an HTML drag instead.
      await page.evaluate(() => getSelection()?.removeAllRanges());
      const box = (await knob.boundingBox())!;
      const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      for (let dx = 0; dx <= 320; dx += 40) await page.mouse.move(cx + dx, cy);
      await page.mouse.up();
    };
    // A short drag springs back without unlocking.
    const box = (await knob.boundingBox())!;
    await page.mouse.move(box.x + 27, box.y + 27);
    await page.mouse.down();
    await page.mouse.move(box.x + 127, box.y + 27);
    await page.mouse.up();
    await expect(visibleText(page, 'End the lock early?')).toHaveCount(0);
    await expect.poll(async () => (await knob.boundingBox())!.x).toBeCloseTo(box.x, 0);

    await slide();
    await expect(visibleText(page, 'End the lock early?')).toBeVisible();
    await button(page, 'Keep going').click();
    await expect(visibleText(page, 'End the lock early?')).toHaveCount(0);

    await slide();
    await expect(visibleText(page, 'End the lock early?')).toBeVisible();
    await button(page, 'Work call').click();
    await button(page, 'Unlock').click();
    await expect(page).toHaveURL(/\/profile\/emergency$/);
    await expect(visibleText(page, '“Work call”')).toBeVisible();
    const s = await storedWhen(page, x => x.emergencies?.length === 3);
    expect(s.emergencies[0].reason).toBe('Work call');
    expect(errors).toEqual([]);
  });
});

test.describe('community', () => {
  test('create a circle', async ({ page, seed, errors }) => {
    await seed();
    await page.goto('/community');
    await button(page, 'New circle').first().click();
    await expect(page).toHaveURL(/\/circle-new$/);
    await expect(button(page, 'Create circle')).toHaveAttribute('aria-disabled', 'true');
    await page.getByLabel('Circle name').fill('Friday brothers');
    await page.getByRole('radio', { name: /Invite only/ }).click();
    await button(page, 'Create circle').click();
    await expect(page).toHaveURL(/\/community\/circle\/\d+$/);
    await expect(page.getByRole('heading', { name: 'Friday brothers' })).toBeVisible();
    await button(page, '+ Add goal').click();
    await expect(visibleText(page, '1,000 Istighfar together')).toBeVisible();
    const s = await storedWhen(page, x => x.circles?.length === 3);
    expect(s.circles[2]).toMatchObject({ name: 'Friday brothers', priv: 'Invite only', role: 'Owner' });

    await button(page, 'Back').click();
    await expect(page).toHaveURL(/\/community$/);
    await expect(visibleText(page, 'Friday brothers')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('delete a circle asks for confirmation', async ({ page, seed }) => {
    await seed();
    await page.goto('/community');
    await visibleText(page, 'Thursday halaqa').first().click();
    await expect(page).toHaveURL(/\/community\/circle\/2$/);
    page.once('dialog', d => d.accept());
    await button(page, 'Leave circle').click();
    await expect(page).toHaveURL(/\/community$/);
    await storedWhen(page, x => x.circles?.length === 1);
    await expect(page.getByText('Thursday halaqa', { exact: true }).filter({ visible: true })).toHaveCount(0);
  });

  test('join with an invite code, join a community goal and say Ameen', async ({ page, seed }) => {
    await seed();
    await page.goto('/community/circles');
    await page.getByLabel('Invite code').fill('ab12-cd34');
    await expect(page.getByLabel('Invite code')).toHaveValue('AB12CD34');
    await button(page, 'Join circle').click();
    await expect(page.getByText('Masjid youth circle', { exact: true })).toBeVisible();

    await page.goto('/community');
    await page.getByRole('tab', { name: 'Goals' }).click();
    await button(page, 'Join').first().click();
    await storedWhen(page, s => s.joined?.[1] === true);
    await page.getByRole('tab', { name: 'Feed' }).click();
    await button(page, 'Say Ameen').first().click();
    await storedWhen(page, s => s.ameen?.f1 === true);
  });

  test('contributing to a community goal counts toward a linked personal goal', async ({ page, seed }) => {
    await seed();
    await page.goto('/community/goal/2'); // 10 Million Istighfar — no linked personal goal
    await button(page, 'Join & contribute').click();
    await expect(page).toHaveURL(/\/tasbeeh/);
    // Falls back to the free counter rather than silently counting Durood toward Istighfar.
    await expect(visibleText(page, /Counting toward 1 Million Salawat/)).toHaveCount(0);

    await page.goto('/community/goal/0'); // 1 Million Salawat — linked to Durood Sharif
    await button(page, 'Contribute with Tasbeeh').click();
    await expect(visibleText(page, 'Counting toward 1 Million Salawat')).toBeVisible();
  });
});

test.describe('profile', () => {
  test('toggle Light / Dark appearance', async ({ page, seed, errors }) => {
    await seed();
    await page.goto('/profile');
    expect(await inkOf(page, 'Appearance')).toBe('rgb(245, 243, 239)');
    await page.getByRole('tab', { name: 'Light' }).click();
    await expect.poll(() => inkOf(page, 'Appearance')).toBe('rgb(15, 16, 20)');
    await storedWhen(page, s => s.theme === 'light');
    // Light mode survives a relaunch, and immersive screens stay dark.
    await page.reload();
    await expect.poll(() => inkOf(page, 'Appearance')).toBe('rgb(15, 16, 20)');
    await page.goto('/tasbeeh');
    expect(await inkOf(page, 'Tap to count · hold to undo')).not.toBe('rgb(15, 16, 20)');
    await page.goto('/profile');
    await page.getByRole('tab', { name: 'Dark' }).click();
    await expect.poll(() => inkOf(page, 'Appearance')).toBe('rgb(245, 243, 239)');
    await page.getByRole('tab', { name: 'Auto' }).click();
    await storedWhen(page, s => s.theme === 'system');
    expect(errors).toEqual([]);
  });

  test('settings toggles persist', async ({ page, seed }) => {
    await seed();
    await page.goto('/profile/notifications');
    await page.getByRole('switch', { name: 'Quran' }).click();
    await storedWhen(page, s => s.notifs?.[3] === true);
    await page.goto('/profile/privacy');
    await page.getByRole('switch', { name: 'Analytics' }).click();
    await storedWhen(page, s => s.privacy?.[5] === true);
  });

  test('profile menu rows navigate', async ({ page, seed }) => {
    await seed();
    await page.goto('/profile');
    const rows: [RegExp, RegExp][] = [
      [/^Goals/, /\/adhkar\/goals$/], [/^Quran bookmarks/, /\/home\/quran$/], [/^Wake alarm/, /\/prayer\/wake-alarm$/],
      [/^Emergency history/, /\/profile\/emergency$/], [/^Notifications/, /\/profile\/notifications$/], [/^Privacy/, /\/profile\/privacy$/],
      [/^Offline & sync/, /\/offline$/],
    ];
    for (const [name, url] of rows) {
      await page.goto('/profile');
      await page.getByRole('button', { name }).click();
      await expect(page).toHaveURL(url);
    }
  });

  test('sign out returns to sign-in', async ({ page, seed }) => {
    await seed({ signedIn: true });
    await page.goto('/profile');
    await button(page, 'Sign out').click();
    await expect(page).toHaveURL(/\/auth/);
    await expect(visibleText(page, 'Welcome back')).toBeVisible();
    await storedWhen(page, s => s.signedIn === false);
  });

  test('mat tag regenerates a token', async ({ page, seed }) => {
    await seed();
    await page.goto('/mat-tag');
    await expect(visibleText(page, 'TOKEN A7F2-KQ9M-3XPD-W')).toBeVisible();
    await page.getByRole('tab', { name: 'Prayer mat' }).click();
    await expect(visibleText(page, 'TOKEN A7F2-KQ9M-3XPD-M')).toBeVisible();
    await button(page, 'Regenerate').click();
    await storedWhen(page, s => s.token !== 'A7F2-KQ9M-3XPD');
  });
});

test.describe('search', () => {
  test('search filters results and opens a match', async ({ page, seed, errors }) => {
    await seed();
    await page.goto('/home');
    await button(page, 'Search').first().click();
    await expect(page).toHaveURL(/\/search$/);
    await page.getByRole('textbox', { name: 'Search' }).fill('istighfar');
    await expect(visibleText(page, '4 semantic matches via Kalimat')).toBeVisible();
    await button(page, 'Hadith').click();
    await expect(visibleText(page, '2 semantic matches via Kalimat')).toBeVisible();
    await button(page, 'Azkar').click();
    await expect(visibleText(page, '1 semantic match via Kalimat')).toBeVisible();
    await button(page, /Forgiveness adhkar/).click();
    await expect(page).toHaveURL(/\/session/);
    await expect(visibleText(page, 'Forgiveness Adhkar')).toBeVisible();

    await page.goto('/search');
    await page.getByRole('textbox', { name: 'Search' }).fill('zzzz');
    await expect(visibleText(page, 'Nothing matched')).toBeVisible();
    await labelled(page, 'Clear').click();
    await button(page, 'kursi').click();
    await expect(visibleText(page, 'Ayat al-Kursi · 2:255')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
