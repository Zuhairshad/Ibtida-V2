import { verseItems } from '../../components/VerseStrip';

describe('verseItems', () => {
  const day = new Date(2026, 9, 12, 12);
  it('alternates ayat and hadith, each with Arabic, both translations and a source', () => {
    const items = verseItems(day);
    expect(items.map(i => i.kind)).toEqual(['ayah', 'hadith', 'ayah', 'hadith', 'ayah', 'hadith']);
    for (const i of items) {
      expect(i.ar).toMatch(/[؀-ۿ]/);
      expect(i.en.length).toBeGreaterThan(10);
      expect(i.ur).toMatch(/[؀-ۿ]/);
      expect(i.src).toMatch(/\d/);
    }
  });
  it('has no repeats within a day and starts somewhere new the next day', () => {
    const a = verseItems(day);
    expect(new Set(a.map(i => i.id)).size).toBe(a.length);
    expect(verseItems(new Date(2026, 9, 13, 12))[0].id).not.toBe(a[0].id);
  });
  it('is stable within a day', () => {
    expect(verseItems(new Date(2026, 9, 12, 3)).map(i => i.id)).toEqual(verseItems(new Date(2026, 9, 12, 23)).map(i => i.id));
  });
});
