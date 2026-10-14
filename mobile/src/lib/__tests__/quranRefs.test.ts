/**
 * Every Quran reference the app shows must point at a real ayah and be labelled with the right
 * surah. Verse text itself is never typed by hand: bundled ayat come from scripts/fetch-ayat.mjs
 * and everything else loads from Tanzil. `node scripts/verify-quran.mjs` checks the text online.
 */
import { ADHKAR, type Dhikr } from '../../data/adhkar';
import { LAUNCH_AYAT, PRAYER_AYAT } from '../../data/ayat';
import { RESULTS } from '../../data/content';
import { isAyahRef, SURAHS } from '../../data/surahs';

const items: Dhikr[] = ADHKAR.flatMap(c => c.items);
const fold = (x: string) => x.toLowerCase().replace(/[^a-z]/g, '');
/** "Quran 21:87", "Quran 43:13–14" inside a source line. */
const cited = (src: string) => [...src.matchAll(/Quran (\d{1,3}):(\d{1,3})(?:[–-](\d{1,3}))?/g)].map(m => ({ s: +m[1], a: +m[2], b: m[3] ? +m[3] : +m[2] }));

describe('Quran references', () => {
  it('bundled ayat are real ayat, each listed once per list', () => {
    for (const list of [PRAYER_AYAT, LAUNCH_AYAT]) {
      for (const x of list) expect(isAyahRef(x.s, x.a)).toBe(true);
      expect(new Set(list.map(x => `${x.s}:${x.a}`)).size).toBe(list.length);
    }
  });

  it('Quranic adhkar point at real passages, and a surah title covers the whole surah', () => {
    const bad: string[] = [];
    for (const d of items) {
      if (!d.q) continue;
      const { s, a } = d.q, b = d.q.b ?? a;
      if (!isAyahRef(s, a) || !isAyahRef(s, b) || b < a) { bad.push(`${d.id}: ${s}:${a}-${b}`); continue; }
      const m = /^Surah (.+)$/.exec(d.title ?? '');
      if (m) {
        if (fold(m[1]) !== fold(SURAHS[s - 1].name)) bad.push(`${d.id}: "${d.title}" is not surah ${s} (${SURAHS[s - 1].name})`);
        if (a !== 1 || b !== SURAHS[s - 1].ayahs) bad.push(`${d.id}: "${d.title}" covers ${a}-${b} of ${SURAHS[s - 1].ayahs}`);
      }
    }
    expect(bad).toEqual([]);
    expect(items.find(d => d.id === 'kursi')?.q).toEqual({ s: 2, a: 255 });
    expect(items.find(d => d.id === 'baqarah-end')?.q).toEqual({ s: 2, a: 285, b: 286 });
  });

  it('Quran citations in sources are real ayat', () => {
    const refs = items.flatMap(d => cited(d.src).map(r => ({ id: d.id, ...r })));
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) expect([r.id, isAyahRef(r.s, r.a) && isAyahRef(r.s, r.b) && r.b >= r.a]).toEqual([r.id, true]);
  });

  it('search shortcuts name the surah they open', () => {
    for (const r of RESULTS.filter(x => x.type === 'Quran')) {
      const m = /^(.+) · (\d{1,3}):(\d{1,3})$/.exec(r.title)!;
      expect(m).not.toBeNull();
      const s = +m[2], a = +m[3];
      expect(isAyahRef(s, a)).toBe(true);
      if (m[1].startsWith('Surah ')) expect(fold(m[1].slice(6))).toBe(fold(SURAHS[s - 1].name));
      if (m[1] === 'Ayat al-Kursi') expect([s, a]).toEqual([2, 255]);
    }
  });
});
