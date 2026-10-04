/// <reference types="jest" />
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JUZ_STARTS, juzOf, juzPct, parseRef, searchSurahs, SURAHS, surahPct, TOTAL_AYAHS } from '../../data/surahs';
import { getState, HISTORY_MAX, hydrate, migrateMarks, recordReading, resetAll } from '../../state/store';

describe('surah index', () => {
  it('has all 114 surahs and 6236 ayahs', () => {
    expect(SURAHS).toHaveLength(114);
    expect(SURAHS.reduce((n, s) => n + s.ayahs, 0)).toBe(TOTAL_AYAHS);
    expect(SURAHS.filter(s => s.place === 'Madinah')).toHaveLength(28);
    expect(JUZ_STARTS).toHaveLength(30);
  });

  it('maps positions to juz', () => {
    expect(juzOf(1, 1)).toBe(1);
    expect(juzOf(2, 141)).toBe(1);
    expect(juzOf(2, 142)).toBe(2);
    expect(juzOf(2, 183)).toBe(2);
    expect(juzOf(114, 6)).toBe(30);
    expect(juzPct(2, 2, 142)).toBeGreaterThan(0);
    expect(juzPct(3, 2, 142)).toBeNull();
    expect(juzPct(30, 114, 6)).toBe(100);
  });

  it('parses references and searches surahs', () => {
    expect(parseRef('2:255')).toEqual({ s: 2, a: 255 });
    expect(parseRef(' 18 . 10 ')).toEqual({ s: 18, a: 10 });
    expect(parseRef('2:287')).toBeNull();
    expect(parseRef('115:1')).toBeNull();
    expect(searchSurahs('baqara').map(s => s.n)).toEqual([2]);
    expect(searchSurahs('ya sin').map(s => s.n)).toEqual([36]);
    expect(searchSurahs('18')[0].n).toBe(18);
    expect(searchSurahs('الكهف').map(s => s.n)).toEqual([18]);
    expect(searchSurahs('')).toHaveLength(114);
  });

  it('computes surah percent', () => {
    expect(surahPct(2, 143)).toBe(50);
    expect(surahPct(1, 7)).toBe(100);
  });
});

describe('bookmarks migration', () => {
  it('maps legacy numeric Al-Baqarah keys to "2:N" and drops invalid ones', () => {
    expect(migrateMarks({ 183: true, 255: true, 999: true, 7: false, '3:5': true, '1:8': true, x: true })).toEqual({ '2:183': true, '2:255': true, '3:5': true });
    expect(migrateMarks(null)).toEqual({});
  });

  it('migrates persisted state on hydrate', async () => {
    await AsyncStorage.setItem('ibtida.v7.state', JSON.stringify({ marks: { 183: true }, qLast: { s: 999, a: 1, at: 0 } }));
    await hydrate();
    expect(getState().marks).toEqual({ '2:183': true });
    expect(getState().qLast).toBeNull();
    expect(getState().qHist).toEqual([]);
  });
});

describe('reading progress', () => {
  beforeEach(async () => { await resetAll(); });

  it('records the last position, per-surah history and furthest ayah', () => {
    recordReading(2, 183, 1);
    recordReading(18, 10, 2);
    recordReading(2, 150, 3);
    const s = getState();
    expect(s.qLast).toEqual({ s: 2, a: 150, at: 3 });
    expect(s.qHist).toEqual([{ s: 2, a: 150, at: 3 }, { s: 18, a: 10, at: 2 }]);
    expect(s.qMax).toEqual({ 2: 183, 18: 10 });
  });

  it('ignores invalid positions and repeats', () => {
    recordReading(2, 5, 1);
    recordReading(2, 5, 9);
    recordReading(2, 999, 10);
    recordReading(0, 1, 11);
    expect(getState().qLast).toEqual({ s: 2, a: 5, at: 1 });
  });

  it('caps history', () => {
    for (let s = 1; s <= HISTORY_MAX + 5; s++) recordReading(s, 1, s);
    expect(getState().qHist).toHaveLength(HISTORY_MAX);
    expect(getState().qHist[0].s).toBe(HISTORY_MAX + 5);
  });
});
