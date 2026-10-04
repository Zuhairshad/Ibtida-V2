import { expect, test as base, type Page } from '@playwright/test';

export const STORAGE_KEY = 'ibtida.v7.state';

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
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const text = m.text();
      if (!IGNORED.some(r => r.test(text))) errors.push(`console.error: ${text}`);
    });
    await use(errors);
    expect(errors, 'no uncaught page errors or console errors').toEqual([]);
  },
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
