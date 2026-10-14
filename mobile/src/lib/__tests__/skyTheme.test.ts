import { DARK, LIGHT, skyPalette, type SkyPhase } from '../../theme/tokens';

const lum = (c: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const PHASES: SkyPhase[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const TEXT = ['tx', 't2', 't3', 't4', 't5', 't6', 'gold', 'mint'] as const;

describe('prayer-time sky palettes', () => {
  for (const light of [false, true]) {
    const base = light ? LIGHT : DARK;
    for (const phase of PHASES) {
      it(`${phase} ${light ? 'light' : 'dark'}: accent and text stay readable`, () => {
        const p = skyPalette(phase, light);
        const low: string[] = [];
        for (const ground of ['bg', 'card'] as const) {
          if (ratio(p.acc, p[ground]) < 4.5) low.push(`acc on ${ground}: ${ratio(p.acc, p[ground]).toFixed(2)}`);
          for (const k of TEXT) {
            // Never noticeably worse than the plain theme, and 4.5:1 wherever the plain theme reaches it.
            const want = Math.min(4.5, ratio(base[k], base[ground]) * 0.95);
            const got = ratio(p[k], p[ground]);
            if (got < want) low.push(`${k} on ${ground}: ${got.toFixed(2)} < ${want.toFixed(2)}`);
          }
        }
        expect(low).toEqual([]);
      });
    }
  }

  it('each phase looks different, and the palettes are reused', () => {
    expect(new Set(PHASES.map(ph => skyPalette(ph, false).bg)).size).toBe(5);
    expect(new Set(PHASES.map(ph => skyPalette(ph, true).acc)).size).toBe(5);
    expect(skyPalette('Asr', true)).toBe(skyPalette('Asr', true));
  });
});
