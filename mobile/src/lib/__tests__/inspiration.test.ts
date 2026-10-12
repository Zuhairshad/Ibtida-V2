import { editorialDay, fromRow, groupFeed, publishedOn, validateDraft, type Draft, type Inspiration } from '../inspiration';
import { BACKGROUNDS, designFor, FORMATS, hasText } from '../studio';

const now = new Date(2026, 9, 11, 15, 0).getTime();
const post = (o: Partial<Inspiration>): Inspiration => ({ id: 'x', kind: 'reminder', title: null, ar: null, en: 'Text', ur: null, source: null, surah: null, ayah: null, status: 'published', publishAt: now - 1000, ...o });
const draft = (o: Partial<Draft>): Draft => ({ kind: 'reminder', title: '', ar: '', en: 'A reminder', ur: '', source: '', surah: null, ayah: null, status: 'published', publishAt: now, ...o });

describe('admin post checks (mirror the database)', () => {
  it('needs text in at least one language', () => {
    expect(validateDraft(draft({ en: '  ' }))).toContain('Write the text in at least one language');
    expect(validateDraft(draft({ en: '', ur: 'اردو' }))).toEqual([]);
  });
  it('hadith and ayah must carry their source; ayahs their reference', () => {
    expect(validateDraft(draft({ kind: 'hadith' }))[0]).toMatch(/hadith source/);
    expect(validateDraft(draft({ kind: 'hadith', source: 'Sahih Muslim 596' }))).toEqual([]);
    expect(validateDraft(draft({ kind: 'ayah', source: 'Al-Baqarah 2:153' }))).toContain('Pick the surah and ayah');
    expect(validateDraft(draft({ kind: 'ayah', source: 'Al-Baqarah 2:153', surah: 2, ayah: 153 }))).toEqual([]);
  });
  it('limits lengths', () => {
    expect(validateDraft(draft({ en: 'x'.repeat(1201) }))[0]).toMatch(/too long/);
    expect(validateDraft(draft({ title: 't'.repeat(81) }))[0]).toMatch(/title/);
  });
});

describe('feed', () => {
  it('shows only published posts that are due, newest first, grouped by day', () => {
    const g = groupFeed([
      post({ id: 'a', publishAt: now - 60_000 }),
      post({ id: 'b', publishAt: now - 3_600_000 }),
      post({ id: 'c', publishAt: now - 86_400_000 }),
      post({ id: 'draft', status: 'draft' }),
      post({ id: 'archived', status: 'archived' }),
      post({ id: 'later', publishAt: now + 3_600_000 }),
    ], now);
    expect(g.map(x => x.posts.map(p => p.id))).toEqual([['a', 'b'], ['c']]);
  });
  it('counts a day’s published posts for the 3-a-day limit', () => {
    const list = [post({ id: 'a' }), post({ id: 'b' }), post({ id: 'c', status: 'draft' }), post({ id: 'd', publishAt: now - 86_400_000 })];
    expect(publishedOn(list, now)).toBe(2);
    expect(publishedOn(list, now, 'a')).toBe(1);
  });
  it('counts the limit in the editors’ day (Asia/Karachi), as the database does', () => {
    // 20:30 UTC on 11 Oct is already 01:30 on 12 Oct in Karachi.
    expect(editorialDay(Date.parse('2026-10-11T20:30:00Z'))).toBe('2026-10-12');
    expect(editorialDay(Date.parse('2026-10-11T18:59:00Z'))).toBe('2026-10-11');
    const late = Date.parse('2026-10-11T20:30:00Z'), earlySameKarachiDay = Date.parse('2026-10-11T19:30:00Z');
    expect(publishedOn([post({ id: 'x', publishAt: earlySameKarachiDay })], late)).toBe(1);
  });
  it('reads database rows', () => {
    const p = fromRow({ id: '1', kind: 'ayah', title: null, body_ar: 'ع', body_en: 'E', body_ur: null, source: 'Al-Baqarah 2:153', surah: 2, ayah: 153, status: 'published', publish_at: '2026-10-11T10:00:00Z' });
    expect(p).toMatchObject({ ar: 'ع', en: 'E', surah: 2, ayah: 153, publishAt: Date.parse('2026-10-11T10:00:00Z') });
  });
});

describe('studio', () => {
  it('exports at the platforms’ real sizes', () => {
    const f = Object.fromEntries(FORMATS.map(x => [x.key, [x.w, x.h]]));
    expect(f.status).toEqual([1080, 1920]);
    expect(f.story).toEqual([1080, 1920]);
    expect(f.reel).toEqual([1080, 1920]);
    expect(f.post).toEqual([1080, 1080]);
    expect(f.portrait).toEqual([1080, 1350]);
  });
  it('starts each post with readable colours for its background', () => {
    for (const kind of ['ayah', 'hadith', 'reminder', 'quote'] as const) {
      const d = designFor({ kind, title: null, ar: 'ع', en: 'E', ur: null, source: 'S' });
      const bg = BACKGROUNDS.find(b => d.bg.type === 'preset' && b.key === d.bg.key)!;
      expect(d.color).toBe(bg.light ? '#1F2A22' : '#FBF7EE');
      expect(hasText(d)).toBeTruthy();
    }
    expect(designFor({ kind: 'ayah', title: null, ar: 'ع', en: null, ur: null, source: null }).frame).toBe('arch');
  });
});
