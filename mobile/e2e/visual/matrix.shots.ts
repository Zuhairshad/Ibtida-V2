import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { test, withSample } from '../fixtures';
import { makeAdmin } from '../supabaseMock';

/**
 * QA matrix, not assertions: every screen in English/Urdu × light/dark × several phone widths, to
 * `qa/before/web/<lang>-<theme>-<w>x<h>/<screen>.png` (override the root with QA_OUT), plus a JSON of
 * automated layout/a11y checks beside each shot. Run:
 *   npm run web:export && SHOTS=1 npx playwright test e2e/visual/matrix.shots.ts
 * Narrow it with MATRIX_LANG / MATRIX_THEME / MATRIX_SIZES (e.g. "390x852,482x700").
 */
const OUT = process.env.QA_OUT || 'qa/before/web';

const SCREENS: [string, string, boolean][] = [
  ['welcome', '/welcome', false], ['intent', '/intent', false], ['place', '/place', false], ['method', '/method', false],
  ['wake', '/wake', false], ['auth', '/auth', false], ['splash', '/splash', false], ['loading', '/loading', false],
  ['home', '/home', true], ['search', '/search', true], ['quran', '/home/quran', true], ['reader', '/reader?surah=2&ayah=183', true],
  ['prayer', '/prayer', true], ['wake-alarm', '/prayer/wake-alarm', true], ['mat-tag', '/mat-tag', true], ['wake-scan', '/wake-scan', true],
  ['jamaat', '/jamaat', true], ['travel', '/travel', true],
  ['adhkar', '/adhkar', true], ['session', '/session', true], ['tasbeeh', '/tasbeeh', true], ['dhikr-edit', '/dhikr-edit', true],
  ['goals', '/adhkar/goals', true], ['goal-new', '/goal-new', true], ['goal-schedule', '/goal-schedule', true], ['goal-done', '/goal-done', true],
  ['progress', '/adhkar/progress', true],
  ['focus-setup', '/focus-setup', true], ['focus-active', '/focus-active', true], ['lock-schedule', '/lock-schedule', true], ['emergency', '/profile/emergency', true],
  ['community', '/community', true], ['circles', '/community/circles', true], ['circle-new', '/circle-new', true], ['join', '/join?code=TEST1234', true],
  ['inspiration', '/inspiration', true], ['studio', '/studio', true], ['admin', '/admin', true],
  ['profile', '/profile', true], ['privacy', '/profile/privacy', true], ['notifications', '/profile/notifications', true], ['offline', '/offline', true],
];
/** Screens the app translates into Urdu (src/lib/i18n.ts); English left on these is a bug. */
const TRANSLATED = new Set(['home', 'prayer', 'jamaat']);

const pick = <T extends string>(env: string | undefined, all: T[]) => (env ? (env.split(',') as T[]) : all);
const LANGS = pick(process.env.MATRIX_LANG, ['en', 'ur']);
const THEMES = pick(process.env.MATRIX_THEME, ['light', 'dark']);
const SIZES = pick(process.env.MATRIX_SIZES, ['390x852', '412x852', '430x852', '482x852', '390x700', '482x700']);
const ONLY = process.env.MATRIX_SCREENS?.split(',');

/** Runs in the page: layout and accessibility problems visible on the current screen. */
function audit({ checkEnglish }: { checkEnglish: boolean }) {
  const W = innerWidth, H = innerHeight;
  const onTop = (el: Element) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const x = Math.min(Math.max(r.left + r.width / 2, 0), W - 1), y = Math.min(Math.max(r.top + r.height / 2, 0), H - 1);
    const hit = document.elementFromPoint(x, y);
    return !!hit && (el.contains(hit) || hit.contains(el));
  };
  const desc = (el: Element) => {
    const t = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const r = el.getBoundingClientRect();
    return `${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[${el.getAttribute('role')}]` : ''} "${t}" @${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`;
  };
  const clippedByAncestor = (el: Element) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(auto|scroll)/.test(s.overflowX)) return true; // horizontal scroller: intentional
      if (s.overflowX === 'hidden' && p.getBoundingClientRect().right <= W + 1) return true;
    }
    return false;
  };
  const directText = (el: Element) => Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent!.trim());
  const all = Array.from(document.querySelectorAll('body *'));
  const visible = all.filter(el => {
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < H && r.right > 0 && r.left < W && onTop(el);
  });

  const overflowX = visible.filter(el => el.getBoundingClientRect().right > W + 1 && !clippedByAncestor(el)).map(desc);
  const pageScroll = document.documentElement.scrollWidth > W + 1 ? [`document.scrollWidth ${document.documentElement.scrollWidth} > ${W}`] : [];

  const truncated: string[] = [];
  for (const el of visible) {
    if (!directText(el)) continue;
    const s = getComputedStyle(el);
    const ellipsis = s.textOverflow === 'ellipsis' || (s as unknown as Record<string, string>).webkitLineClamp !== 'none' && !!(s as unknown as Record<string, string>).webkitLineClamp;
    const he = el as HTMLElement;
    if (!ellipsis && he.scrollWidth > he.clientWidth + 1 && s.overflowX !== 'visible') truncated.push(`h: ${desc(el)}`);
    if (he.scrollHeight > he.clientHeight + 2 && s.overflowY === 'hidden' && !ellipsis) truncated.push(`v: ${desc(el)} (${he.scrollHeight}>${he.clientHeight})`);
  }

  const controls = visible.filter(el => /^(button|link|radio|tab|switch|checkbox)$/.test(el.getAttribute('role') || ''));
  const small = controls.filter(el => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map(desc);
  const unnamed = controls.filter(el => !(el.getAttribute('aria-label') || el.textContent || '').trim()).map(desc);

  const parse = (c: string) => { const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
  const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
    const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const lowContrast: string[] = [];
  for (const el of visible) {
    if (!directText(el)) continue;
    const s = getComputedStyle(el);
    const fg = parse(s.color);
    let bg: ReturnType<typeof parse> | null = null;
    for (let p: Element | null = el; p; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (ps.backgroundImage && ps.backgroundImage !== 'none') { bg = null; break; } // gradient/image: can't judge
      const c = parse(ps.backgroundColor);
      if (c.a >= 0.99) { bg = c; break; }
    }
    if (!bg) continue;
    // Blend translucent text over its background.
    const mix = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
    const [a, b] = [lum(mix), lum(bg)];
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const size = parseFloat(s.fontSize), bold = Number(s.fontWeight) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    if (ratio < need) lowContrast.push(`${ratio.toFixed(2)} < ${need}: ${desc(el)} color=${s.color} size=${size}`);
  }

  const english: string[] = [];
  if (checkEnglish) {
    for (const el of visible) {
      if (!directText(el)) continue;
      const t = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim();
      if (/[A-Za-z]{3,}/.test(t) && !/^(am|pm|AM|PM)$/.test(t)) english.push(t.slice(0, 60));
    }
  }
  const uniq = (a: string[]) => Array.from(new Set(a));
  return { overflowX: uniq(overflowX), pageScroll, truncated: uniq(truncated), small: uniq(small), unnamed: uniq(unnamed), lowContrast: uniq(lowContrast), english: uniq(english) };
}

for (const lang of LANGS) for (const theme of THEMES) for (const size of SIZES) {
  const [width, height] = size.split('x').map(Number);
  test.describe(`${lang}-${theme}-${size}`, () => {
    test.use({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: theme });
    for (const [name, path, onboarded] of SCREENS) {
      if (ONLY && !ONLY.includes(name)) continue;
      test(name, async ({ page, seed, errors }) => {
        if (name === 'admin') makeAdmin(page);
        await seed(withSample({ onboarded, theme, lang }));
        await page.goto(path);
        await page.waitForTimeout(1600);
        const dir = `${OUT}/${lang}-${theme}-${size}`;
        mkdirSync(dir, { recursive: true });
        await page.screenshot({ path: `${dir}/${name}.png` });
        const result = await page.evaluate(audit, { checkEnglish: lang === 'ur' && TRANSLATED.has(name) });
        const file = `${dir}/${name}.json`;
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, JSON.stringify({ screen: name, path, lang, theme, size, errors: [...errors], ...result }, null, 1));
        errors.length = 0; // visual run only; functional specs own error checks
      });
    }
  });
}
