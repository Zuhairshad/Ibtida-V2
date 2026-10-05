import { test } from '../fixtures';

/**
 * Visual review, not assertions: captures every main screen in dark and light mode to
 * `screenshots/<theme>/<name>.png`. Functional specs can pass while a screen looks broken
 * (a gradient that doesn't paint, a squashed button), so look at these after UI changes.
 * Run: `npm run shots`.
 */
const SCREENS: [string, string, boolean][] = [
  ['welcome', '/welcome', false], ['intent', '/intent', false], ['place', '/place', false], ['method', '/method', false],
  ['wake', '/wake', false], ['auth', '/auth', false],
  ['home', '/home', true], ['search', '/search', true], ['quran', '/home/quran', true], ['reader', '/reader?surah=2&ayah=183', true],
  ['prayer', '/prayer', true], ['wake-alarm', '/prayer/wake-alarm', true], ['mat-tag', '/mat-tag', true], ['wake-scan', '/wake-scan', true],
  ['adhkar', '/adhkar', true], ['session', '/session', true], ['tasbeeh', '/tasbeeh', true], ['goals', '/adhkar/goals', true],
  ['goal-new', '/goal-new', true], ['goal-schedule', '/goal-schedule', true], ['goal-done', '/goal-done', true], ['progress', '/adhkar/progress', true],
  ['focus-setup', '/focus-setup', true], ['focus-active', '/focus-active', true], ['emergency', '/profile/emergency', true],
  ['community', '/community', true], ['circles', '/community/circles', true], ['circle-new', '/circle-new', true],
  ['profile', '/profile', true], ['privacy', '/profile/privacy', true], ['notifications', '/profile/notifications', true], ['offline', '/offline', true],
];

for (const theme of ['dark', 'light'] as const) {
  for (const [name, path, onboarded] of SCREENS) {
    test(`${theme} · ${name}`, async ({ page, seed, errors }) => {
      await seed({ onboarded, theme });
      await page.goto(path);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `screenshots/${theme}/${name}.png` });
      errors.length = 0; // visual run only; functional specs own error checks
    });
  }
}
