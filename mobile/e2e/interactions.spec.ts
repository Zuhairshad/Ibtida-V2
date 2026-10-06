import { button, tapLabel, expect, STORAGE_KEY, stored, storedWhen, test, todayKey, withSample } from './fixtures';
import type { Page } from '@playwright/test';

const visibleText = (page: Page, text: string | RegExp) => page.getByText(text).filter({ visible: true });
const labelled = (page: Page, name: string | RegExp) => page.getByLabel(name, { exact: typeof name === 'string' }).filter({ visible: true });
const inkOf = (page: Page, text: string) => visibleText(page, text).first().evaluate(el => getComputedStyle(el).color);

test.describe('prayer', () => {
  test('log a prayer from the row and persist it', async ({ page, seed, errors }) => {
    await seed(withSample());
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
    await seed(withSample());
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
    await seed(withSample());
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
    await seed(withSample());
    await page.goto('/home');
    await page.getByRole('button', { name: /QIBLA/ }).click();
    await expect(page).toHaveURL(/\/prayer/);
    await expect(visibleText(page, /great-circle bearing/)).toBeVisible();
  });

  test('wake alarm toggles persist and Test the alarm opens the camera scan', async ({ page, seed }) => {
    await seed(withSample());
    await page.goto('/prayer/wake-alarm');
    await page.getByRole('switch', { name: 'Isha' }).click();
    await storedWhen(page, s => s.wakeVerify?.[4] === true);
    await expect(visibleText(page, /No wake verified yet/)).toBeVisible();
    await button(page, 'Test the alarm').click();
    await expect(visibleText(page, 'Scan your wudu station')).toBeVisible();
    // Release builds scan automatically; the dev-only simulate button must not ship.
    await expect(button(page, 'Simulate scan')).toHaveCount(0);
    await tapLabel(page, 'Close');
    await expect(page).toHaveURL(/\/prayer\/wake-alarm$/);
  });
});

test.describe('location', () => {
  test.use({ geolocation: { latitude: 51.5074, longitude: -0.1278 }, permissions: ['geolocation'] });

  test('"Use my current location" sets the city from the device position', async ({ page, seed, errors }) => {
    await seed(withSample());
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
    await seed(withSample());
    await page.goto('/home');
    await button(page, 'Open daily insight').click();
    await expect(visibleText(page, 'Today’s insight')).toBeVisible();
    await expect(visibleText(page, 'MILESTONES')).toBeVisible();
    await labelled(page, 'Close').click();
    await expect(visibleText(page, 'Today’s insight')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('quick actions navigate', async ({ page, seed }) => {
    await seed(withSample());
    await page.goto('/home');
    await visibleText(page, 'Quran').first().click();
    await expect(page).toHaveURL(/\/home\/quran$/);
    await page.getByLabel('Search surahs').fill('18');
    await expect(visibleText(page, 'Al-Kahf')).toBeVisible();
    await expect(visibleText(page, 'Al-Baqarah')).toHaveCount(0);
  });
});

test.describe('quran reader', () => {
  test('reader settings sheet changes size, translation, theme and bookmarks', async ({ page, seed }) => {
    await seed(withSample());
    await page.goto('/reader?surah=2&ayah=184');
    await expect(visibleText(page, 'EN_TEXT_2_184')).toBeVisible();
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
    expect(s.marks['2:184']).toBe(true);
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
    await seed(withSample());
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

  test('category tiles open their adhkar with real counts', async ({ page, seed }) => {
    await seed();
    await page.goto('/adhkar');
    await button(page, /^Evening adhkar, 17 adhkar/).click();
    await expect(page).toHaveURL(/\/session/);
    await expect(visibleText(page, '1 / 17')).toBeVisible();
    // Quranic adhkar come from the Quran source, with their reference.
    await expect(visibleText(page, 'AYAT AL-KURSI')).toBeVisible();
  });

  test('an adhkar session counts by tap, swipes and runs to completion', async ({ page, seed }) => {
    await seed();
    await page.goto('/session?cat=Gratitude');
    await expect(visibleText(page, '1 / 6')).toBeVisible();
    await expect(visibleText(page, /Verified · At-Tirmidhi 3383/)).toBeVisible();
    // Next / previous move between adhkar without counting.
    await button(page, 'Next dhikr').click();
    await expect(visibleText(page, '2 / 6')).toBeVisible();
    await button(page, 'Previous dhikr').click();
    await expect(visibleText(page, '1 / 6')).toBeVisible();
    // Each count completes a dhikr and moves on to the next one by itself.
    for (let step = 1; step <= 6; step++) {
      await expect(visibleText(page, `${step} / 6`)).toBeVisible();
      await labelled(page, /^Count\./).click();
    }
    await expect(visibleText(page, 'All complete today · May Allah accept')).toBeVisible();
    const key = await todayKey(page);
    const s = await storedWhen(page, x => x.az?.c?.Gratitude?.every((n: number) => n === 1) && x.act?.[key]?.s === 1);
    expect(s.act[key].d).toBe(6);
    // Progress is kept for the day: the Gratitude tile shows 100%.
    await page.goto('/adhkar');
    await expect(button(page, /^Gratitude adhkar, 6 adhkar, \d+ minutes, 100 percent done today/)).toBeVisible();
  });

  test('adhkar text size and background are adjustable and remembered', async ({ page, seed }) => {
    await seed();
    await page.goto('/session?cat=Gratitude');
    await button(page, 'Reading settings').click();
    await expect(labelled(page, 'Text size Normal')).toBeVisible();
    await button(page, 'Larger text').click();
    await button(page, 'Larger text').click();
    await expect(labelled(page, 'Text size Larger')).toBeVisible();
    await page.getByRole('radio', { name: 'White background' }).click();
    await button(page, 'Done').click();
    await storedWhen(page, x => x.azSize === 3 && x.azBg === 5);
    await page.reload();
    await button(page, 'Reading settings').click();
    await expect(labelled(page, 'Text size Larger')).toBeVisible();
  });

  test('create a goal', async ({ page, seed }) => {
    await seed(withSample());
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
    await seed(withSample());
    await page.goto('/adhkar/goals');
    await button(page, 'Schedule').first().click();
    await expect(page).toHaveURL(/\/goal-schedule/);
    await labelled(page, '9').click();
    await labelled(page, '30').click();
    await labelled(page, 'Sat').click();
    await button(page, 'Save schedule').click();
    await expect(page).toHaveURL(/\/adhkar\/goals$/);
    // Streaks come from real history; the seeded goal has none yet.
    await expect(visibleText(page, /0-day streak · 9:30 pm/)).toBeVisible();
    const s = await storedWhen(page, x => x.goals?.[0]?.remind === '9:30 pm');
    expect(s.goals[0].days).toEqual([1, 1, 1, 1, 1, 1, 0]);
  });

  test('progress ranges switch', async ({ page, seed }) => {
    await seed(withSample());
    await page.goto('/adhkar/progress');
    await expect(visibleText(page, 'Your activity will appear here')).toBeVisible();
    await page.goto('/tasbeeh');
    for (let i = 0; i < 3; i++) await labelled(page, /^Count\./).click();
    await page.goto('/adhkar/progress');
    for (const r of ['Today', 'Month', 'Year', 'Week']) await page.getByRole('tab', { name: r }).click();
    await expect(visibleText(page, '2 weeks ago')).toBeVisible();
    await expect(visibleText(page, 'Dhikr counted')).toBeVisible();
  });
});

test.describe('ibadah lock', () => {
  // A horizontal *touch* swipe in desktop Chromium triggers its swipe-to-go-back gesture, so drive the
  // slider with a mouse (react-native-web's responder system handles both).
  test.use({ isMobile: false, hasTouch: false });
  test('emergency unlock sheet logs the reason', async ({ page, seed, errors }) => {
    await seed(withSample());
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

test.describe('scheduled ibadah lock', () => {
  test('add, edit, switch off and remove a lock time', async ({ page, seed, errors }) => {
    await seed();
    await page.goto('/focus-setup');
    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(visibleText(page, 'No lock times yet')).toBeVisible();
    await button(page, 'Add lock time').click();
    await expect(page).toHaveURL(/\/lock-schedule$/);
    // 6:30 am, 1 hr 30 min, weekdays.
    await labelled(page, '6').click();
    for (const m of ['10', '20', '30']) await labelled(page, m).click(); // the wheel shows two steps either side
    await button(page, '1 hr 30 min').click();
    await button(page, 'Weekdays').click();
    await expect(visibleText(page, '6:30 am for 1 hr 30 min · Weekdays')).toBeVisible();
    await button(page, 'Accept & schedule lock').click();
    await expect(page).toHaveURL(/\/focus-setup/);
    await expect(visibleText(page, '6:30 am – 8:00 am').first()).toBeVisible();
    await expect(visibleText(page, '1 hr 30 min · Weekdays')).toBeVisible();
    let s = await storedWhen(page, x => x.locks?.length === 1);
    expect(s.locks[0]).toMatchObject({ h: 6, m: 30, dur: 90, days: [1, 1, 1, 1, 1, 0, 0], on: true });

    await page.getByRole('switch', { name: /6:30 am – 8:00 am on/ }).click();
    await storedWhen(page, x => x.locks?.[0]?.on === false);

    await button(page, /^Lock time 6:30 am – 8:00 am/).click();
    await expect(page).toHaveURL(/\/lock-schedule\?id=/);
    await button(page, 'Longer').click();
    await labelled(page, 'Sat').click();
    await button(page, 'Save lock time').click();
    s = await storedWhen(page, x => x.locks?.[0]?.dur === 95);
    expect(s.locks[0].days).toEqual([1, 1, 1, 1, 1, 1, 0]);
    expect(s.locks[0].on).toBe(true);

    await button(page, /^Lock time/).click();
    page.once('dialog', d => d.accept());
    await button(page, 'Remove lock time').click();
    await storedWhen(page, x => x.locks?.length === 0);
    expect(errors).toEqual([]);
  });

  test('during a lock time the lock screen counts down and can be unlocked in an emergency', async ({ page, seed }) => {
    const now = new Date();
    const start = new Date(now.getTime() - 10 * 60_000);
    await seed({ locks: [{ id: 'l1', h: start.getHours(), m: start.getMinutes(), dur: 60, days: [1, 1, 1, 1, 1, 1, 1], on: true }] });
    await page.goto('/lock-scheduled');
    await expect(visibleText(page, 'Your apps are resting')).toBeVisible();
    await expect(visibleText(page, /^IBADAH TIME · /)).toBeVisible();
    await button(page, 'Emergency unlock').click();
    await button(page, 'Need directions').click();
    await button(page, 'Unlock').click();
    await expect(page).toHaveURL(/\/profile\/emergency$/);
    const s = await storedWhen(page, x => x.lockSkip > Date.now());
    expect(s.emergencies[0].reason).toBe('Need directions');
    await page.goto('/lock-scheduled');
    await expect(visibleText(page, 'No lock running')).toBeVisible();
  });
});

test.describe('community', () => {
  test('create a circle', async ({ page, seed, errors }) => {
    await seed(withSample());
    await page.goto('/community');
    await button(page, 'New circle').first().click();
    await expect(page).toHaveURL(/\/circle-new$/);
    await expect(button(page, 'Create circle')).toHaveAttribute('aria-disabled', 'true');
    await page.getByLabel('Circle name').fill('Friday brothers');
    await page.getByRole('radio', { name: /Invite only/ }).click();
    // A target adopted from the community goals, with a circle-sized count…
    await page.getByRole('checkbox', { name: /^1 Million Salawat/ }).click();
    // …and one of our own.
    await page.getByRole('tab', { name: 'Make my own' }).click();
    await page.getByLabel('Target name').fill('Surah al-Kahf every Friday');
    await page.getByLabel('Count to reach').fill('40');
    await button(page, 'Add target').click();
    await button(page, 'Create circle · 2 targets').click();
    await expect(page).toHaveURL(/\/community\/circle\/\d+$/);
    await expect(page.getByRole('heading', { name: 'Friday brothers' })).toBeVisible();
    await expect(visibleText(page, '0 / 10,000')).toBeVisible();
    await expect(visibleText(page, 'Surah al-Kahf every Friday')).toBeVisible();
    const s = await storedWhen(page, x => x.circles?.length === 3);
    expect(s.circles[2]).toMatchObject({
      name: 'Friday brothers', priv: 'Invite only', role: 'Owner',
      goals: [{ name: '1 Million Salawat', done: 0, total: 10000 }, { name: 'Surah al-Kahf every Friday', done: 0, total: 40 }],
    });
    // More targets can be added later from the circle.
    await button(page, '+ Add target').click();
    await expect(page).toHaveURL(/\/circle-goal/);
    await page.getByRole('checkbox', { name: /^10 Million Istighfar/ }).click();
    await button(page, 'Add target').click();
    await storedWhen(page, x => x.circles?.[2]?.goals?.length === 3);

    await button(page, 'Back').click();
    await expect(page).toHaveURL(/\/community$/);
    await expect(visibleText(page, 'Friday brothers')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('delete a circle asks for confirmation', async ({ page, seed }) => {
    await seed(withSample());
    await page.goto('/community');
    await visibleText(page, 'Thursday halaqa').first().click();
    await expect(page).toHaveURL(/\/community\/circle\/2$/);
    page.once('dialog', d => d.accept());
    await button(page, 'Leave circle').click();
    await expect(page).toHaveURL(/\/community$/);
    await storedWhen(page, x => x.circles?.length === 1);
    await expect(page.getByText('Thursday halaqa', { exact: true }).filter({ visible: true })).toHaveCount(0);
  });

  test('joining by invite code needs an account; community goals can be joined', async ({ page, seed }) => {
    await seed(withSample());
    await page.goto('/community/circles');
    await page.getByLabel('Invite code').fill('ab12-cd34');
    await expect(page.getByLabel('Invite code')).toHaveValue('AB12CD34');
    await button(page, 'Join circle').click();
    // Codes are checked by the server — no circle is made up offline.
    await expect(page).toHaveURL(/\/auth/);
    expect((await stored(page)).circles).toHaveLength(2);

    await page.goto('/community');
    await page.getByRole('tab', { name: 'Goals' }).click();
    await expect(visibleText(page, 'Sign in to see live progress').first()).toBeVisible();
    await button(page, 'Join').first().click();
    await storedWhen(page, s => s.joined?.[1] === true);
    await page.getByRole('tab', { name: 'Feed' }).click();
    await expect(visibleText(page, 'Sign in to see the feed')).toBeVisible();
  });

  test('contributing to a community goal counts toward a linked personal goal', async ({ page, seed }) => {
    await seed(withSample());
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
    await seed(withSample());
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
    await seed(withSample());
    await page.goto('/profile/notifications');
    await page.getByRole('switch', { name: 'Quran' }).click();
    await storedWhen(page, s => s.notifs?.[3] === true);
    await page.goto('/profile/privacy');
    await page.getByRole('switch', { name: 'Analytics' }).click();
    await storedWhen(page, s => s.privacy?.[5] === true);
  });

  test('profile menu rows navigate', async ({ page, seed }) => {
    await seed(withSample());
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
    await seed(withSample());
    await page.goto('/mat-tag');
    await expect(visibleText(page, 'TOKEN A7F2-KQ9M-3XPD-W')).toBeVisible();
    await page.getByRole('tab', { name: 'Prayer mat' }).click();
    await expect(visibleText(page, 'TOKEN A7F2-KQ9M-3XPD-M')).toBeVisible();
    await button(page, 'Regenerate').click();
    await storedWhen(page, s => s.token !== 'A7F2-KQ9M-3XPD');
  });

  test('a station can be verified by scanning the item itself', async ({ page, seed }) => {
    await seed();
    await page.goto('/mat-tag');
    // A fresh install gets its own random token, never a shared sample one.
    const s0 = await storedWhen(page, x => typeof x.token === 'string' && /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(x.token));
    expect(s0.token).not.toBe('A7F2-KQ9M-3XPD');
    await page.getByRole('radio', { name: /The sink itself/ }).click();
    await expect(visibleText(page, /^TOKEN /)).toHaveCount(0);
    await page.getByRole('tab', { name: 'Prayer mat' }).click();
    await expect(visibleText(page, /^TOKEN /)).toBeVisible(); // the mat still uses its tag
    await page.getByRole('radio', { name: /The prayer mat itself/ }).click();
    await storedWhen(page, x => x.wakeMode?.W === 'item' && x.wakeMode?.M === 'item');
    await button(page, 'Test with my prayer mat').click();
    await expect(page).toHaveURL(/\/wake-scan\?test=M/);
    await expect(visibleText(page, 'Test · Prayer mat')).toBeVisible();
    await expect(visibleText(page, 'Now point at your prayer mat')).toBeVisible();
  });
});

test.describe('notifications and qibla', () => {
  test('reminders can be in Urdu with a daily hadith, previewed live', async ({ page, seed }) => {
    await seed();
    await page.goto('/profile/notifications');
    const preview = page.getByLabel('Notification preview');
    // Default: English and Urdu together, with a sourced hadith.
    await expect(preview.getByText(/^Time for \w+ · \S+ کا وقت$/)).toBeVisible();
    await expect(preview.getByText(/— .*\d/)).toBeVisible();
    await page.getByRole('tab', { name: 'اردو' }).click();
    await expect(preview.getByText(/^(فجر|ظہر|عصر|مغرب|عشاء) کا وقت$/)).toBeVisible();
    await storedWhen(page, x => x.notifLang === 'ur');
    await page.getByRole('switch', { name: 'Daily hadith' }).click();
    await expect(preview.getByText(/«/)).toHaveCount(0);
    await storedWhen(page, x => x.notifQuotes === false);
  });

  test('qibla card shows the true bearing and an honest compass status', async ({ page, seed }) => {
    await seed({ city: { name: 'London, United Kingdom', lat: 51.5074, lng: -0.1278, cc: 'GB' } });
    await page.goto('/prayer?qibla=1');
    await expect(visibleText(page, '119° east-southeast of true north')).toBeVisible();
    await expect(labelled(page, 'Qibla bearing 119 degrees from true north')).toBeVisible();
    // Browsers that gate motion sensors ask for a tap first; a desktop browser then has no
    // compass, so the dial stays on the calculated bearing and says so.
    const tap = button(page, 'Use compass');
    if (await tap.isVisible()) await tap.click();
    await expect(visibleText(page, /This device has no compass|Compass access is off/)).toBeVisible({ timeout: 8000 });
  });
});

test.describe('search', () => {
  test('search filters results and opens a match', async ({ page, seed, errors }) => {
    await seed(withSample());
    await page.goto('/home');
    await button(page, 'Search').first().click();
    await expect(page).toHaveURL(/\/search$/);
    await page.getByRole('textbox', { name: 'Search' }).fill('istighfar');
    await expect(visibleText(page, /^\d+ matches$/)).toBeVisible();
    await button(page, 'Hadith').click();
    await expect(button(page, /^Sayyid al-Istighfar Forgiveness adhkar · Sahih al-Bukhari 6306/)).toBeVisible();
    await button(page, 'Azkar').click();
    await expect(visibleText(page, '1 match')).toBeVisible();
    await button(page, /Forgiveness adhkar/).click();
    await expect(page).toHaveURL(/\/session/);
    await expect(visibleText(page, 'Forgiveness Adhkar')).toBeVisible();

    // Arabic without harakat finds the vowelled text, and opens the session at that dhikr.
    await page.goto('/search');
    await page.getByRole('textbox', { name: 'Search' }).fill('حسبنا الله');
    await button(page, /Hasbunallahu wa niʿmal-wakil Protection adhkar/).click();
    await expect(page).toHaveURL(/\/session\?cat=Protection&i=\d+/);
    await expect(visibleText(page, 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ')).toBeVisible();

    await page.goto('/search');
    await page.getByRole('textbox', { name: 'Search' }).fill('zzzz');
    await expect(visibleText(page, 'Nothing matched')).toBeVisible();
    await labelled(page, 'Clear').click();
    await button(page, 'kursi').click();
    await expect(visibleText(page, 'Ayat al-Kursi · 2:255')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
