import { expect, test as base, type Page } from '@playwright/test';
import { mockGeocoding } from './geoMock';
import { mockQuranApi } from './quranMock';
import { mockSupabase } from './supabaseMock';

export const STORAGE_KEY = 'ibtida.v7.state';

/**
 * A lived-in profile for tests that need goals, circles and history. The app itself starts empty;
 * tests that exercise those features seed this explicitly. Goals carry no `day`, so the app adopts
 * them into today without resetting their progress.
 */
export const SAMPLE = {
  name: 'Yusuf Rahman',
  token: 'A7F2-KQ9M-3XPD',
  joined: [true, false, false],
  goals: [
    { id: 1, name: 'Durood Sharif', target: 100, prog: 33, streak: 9, remind: '8:00 pm', week: [1, 1, 1, 1, 0, 1, 1], cg: '1 Million Salawat' },
    { id: 2, name: 'Istighfar', target: 100, prog: 100, streak: 12, remind: 'after Fajr', week: [1, 1, 1, 1, 1, 1, 1], cg: null },
    { id: 3, name: 'SubhanAllahi wa bihamdihi', target: 100, prog: 40, streak: 4, remind: '7:30 am', week: [0, 1, 1, 0, 1, 1, 1], cg: null },
  ],
  circles: [
    { id: 1, name: 'Rahman family', priv: 'Private', members: 1, code: 'K7Q2M9XA', role: 'Owner', goals: [{ name: 'Fajr together · 30 days', done: 216, total: 300 }] },
    { id: 2, name: 'Thursday halaqa', priv: 'Invite only', members: 1, code: 'P3WZ8LNC', role: 'Member', goals: [{ name: 'One juz a week', done: 9, total: 20 }] },
  ],
  emergencies: [
    { when: 'Thu 24 Sep · 9:42 pm', after: 'after 11 min', reason: 'Family call about travel plans', blocked: 2 },
    { when: 'Sat 19 Sep · 6:15 am', after: 'after 4 min', reason: 'Needed directions to the masjid', blocked: 0 },
  ],
};
export const withSample = (extra: Record<string, unknown> = {}) => ({ ...SAMPLE, ...extra });

/** Web-only noise that is expected when running React Native on react-native-web. */
const IGNORED = [
  /useNativeDriver/, // no native animated module on web; falls back to JS animation
];

type Fixtures = {
  /** Uncaught page errors and console errors seen during the test; asserted empty afterwards. */
  errors: string[];
  /** Seeds AsyncStorage (localStorage on web) before the app boots. Call before the first goto. */
  seed: (state?: Record<string, unknown>) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  errors: [async ({ page }, use) => {
    // Tests never touch the network: the Quran API is served from placeholder data.
    await mockQuranApi(page);
    await mockSupabase(page);
    await mockGeocoding(page);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const text = m.text();
      if (!IGNORED.some(r => r.test(text))) errors.push(`console.error: ${text}`);
    });
    await use(errors);
    expect(errors, 'no uncaught page errors or console errors').toEqual([]);
  }, { auto: true }],
  seed: async ({ page }, use) => {
    await use(async (state = {}) => {
      // Only on the first document load, so reloads see what the app itself persisted.
      await page.addInitScript(([key, value]) => {
        if (sessionStorage.getItem('e2e.seeded')) return;
        sessionStorage.setItem('e2e.seeded', '1');
        localStorage.setItem(key, value);
      }, [STORAGE_KEY, JSON.stringify({ onboarded: true, ...state })] as const);
    });
  },
});

export { expect };

/** Reads the persisted app state (writes are debounced 250ms, so poll). */
export async function stored(page: Page) {
  return page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), STORAGE_KEY);
}

/** The persisted state once `pred` holds. */
export async function storedWhen(page: Page, pred: (s: Record<string, any>) => boolean) {
  await expect.poll(async () => pred(await stored(page)), { timeout: 5000 }).toBe(true);
  return stored(page);
}

/**
 * Clicks the control with this accessibility label that is actually on top. Inactive tab scenes and
 * screens under the current one stay mounted on web, so a label like "Back" can match several elements.
 */
export async function tapLabel(page: Page, label: string, timeout = 10_000) {
  const all = page.getByLabel(label, { exact: true });
  const until = Date.now() + timeout;
  do {
    const n = await all.count();
    for (let i = 0; i < n; i++) {
      const el = all.nth(i);
      const onTop = await el.evaluate(node => {
        const r = node.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!hit && node.contains(hit);
      }).catch(() => false);
      if (onTop) return el.click();
    }
    await page.waitForTimeout(100);
  } while (Date.now() < until);
  throw new Error(`no on-screen control labelled "${label}"`);
}

export const button =(page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });

/** Local-date key the app uses for prayer logs (YYYY-MM-DD). */
export function todayKey(page: Page) {
  return page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}
