import { DARK, LIGHT } from '../../theme/tokens';

const lum = (c: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

describe('light theme', () => {
  const p = LIGHT;
  it('keeps text and the accent readable on the page and on cards', () => {
    const low: string[] = [];
    for (const ground of [p.bg, p.card]) {
      for (const name of ['tx', 't2', 't3', 't4', 't5', 't6', 'acc', 'gold'] as const) {
        const r = ratio(p[name], ground);
        if (r < 4.5) low.push(`${name} on ${ground}: ${r.toFixed(2)}`);
      }
    }
    expect(low).toEqual([]);
  });
  it('keeps text readable on the end colours of the frosted and rose gradients', () => {
    const low: string[] = [];
    for (const g of [p.glass, p.rosy]) {
      for (const ground of g.match(/#[0-9A-Fa-f]{6}/g) ?? []) {
        for (const name of ['tx', 't2', 't3', 't4', 'acc', 'gold'] as const) {
          const r = ratio(p[name], ground);
          if (r < 4.5) low.push(`${name} on ${ground}: ${r.toFixed(2)}`);
        }
      }
    }
    expect(low).toEqual([]);
  });
  it('leaves dark cards flat', () => {
    expect(DARK.glass).toBe('');
    expect(DARK.rosy).toBe('');
  });
  it('keeps the selected pill legible', () => {
    expect(ratio(p.onPill, p.pill)).toBeGreaterThanOrEqual(7);
  });
  it('lifts cards off the page and is not dark', () => {
    expect(p.dark).toBe(false);
    expect(p.card).not.toBe(p.bg);
    expect(lum(p.card)).toBeGreaterThan(lum(p.bg));
  });
});
