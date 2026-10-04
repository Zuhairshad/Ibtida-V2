/// <reference types="jest" />
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BISMILLAH_SKELETON, cacheKey, clearQuranCache, fetchJuz, fetchSurah, fetchSurahList, loadSurah,
  parseMeta, parseSurahEditions, QuranError, splitBismillah, STALE_MS, type SurahLoad,
} from '../quran';
import { SURAHS } from '../../data/surahs';

/* Fixtures follow the AlQuran Cloud response shape with placeholder strings only. */
const S112 = require('./fixtures/surah-112.json');
const S001 = require('./fixtures/surah-001.json');
const JUZ30 = require('./fixtures/juz-30.json');

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** A synthetic, Uthmani-style decorated Bismillah built from the matcher skeleton (wasla alef + marks). */
const DECORATED = BISMILLAH_SKELETON.map(w => w.replace(/^ا/, 'ٱ').split('').join('ِ')).join(' ');

function withBismillah(fixture: typeof S112) {
  const f = clone(fixture);
  f.data[0].ayahs[0].text = `﻿${DECORATED} ${f.data[0].ayahs[0].text}`;
  return f;
}

function mockFetchJson(body: unknown, status = 200) {
  const fn = jest.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }));
  (globalThis as { fetch: unknown }).fetch = fn;
  return fn;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearQuranCache();
});

describe('parseSurahEditions', () => {
  it('merges the three editions per ayah and keeps text verbatim', () => {
    const s = parseSurahEditions(S112.data, 112);
    expect(s.n).toBe(112);
    expect(s.name).toBe('Al-Ikhlas');
    expect(s.arName).toBe('AR_NAME_112');
    expect(s.place).toBe('Makkah');
    expect(s.count).toBe(4);
    expect(s.bismillah).toBeNull();
    expect(s.ayahs[0]).toEqual({ n: 1, num: 6222, juz: 30, page: 604, ar: 'AR_TEXT_112_1', en: 'EN_TEXT_112_1', ur: 'UR_TEXT_112_1' });
    expect(s.ayahs.map(a => a.ar)).toEqual(['AR_TEXT_112_1', 'AR_TEXT_112_2', 'AR_TEXT_112_3', 'AR_TEXT_112_4']);
  });

  it('matches editions by identifier, not position', () => {
    const f = clone(S112);
    f.data.reverse();
    const s = parseSurahEditions(f.data, 112);
    expect(s.ayahs[1]).toMatchObject({ ar: 'AR_TEXT_112_2', en: 'EN_TEXT_112_2', ur: 'UR_TEXT_112_2' });
  });

  it('treats a missing or malformed translation as null but keeps Arabic', () => {
    const f = clone(S112);
    f.data = f.data.filter((e: { edition: { identifier: string } }) => e.edition.identifier !== 'ur.jalandhry');
    f.data[1].ayahs.pop();
    const s = parseSurahEditions(f.data, 112);
    expect(s.ayahs[0].ar).toBe('AR_TEXT_112_1');
    expect(s.ayahs[0].en).toBeNull();
    expect(s.ayahs[0].ur).toBeNull();
  });

  it.each([
    ['not a list', () => ({})],
    ['empty list', () => []],
    ['wrong surah', () => { const f = clone(S112); f.data[0].number = 113; return f.data; }],
    ['wrong ayah count', () => { const f = clone(S112); f.data[0].ayahs.pop(); return f.data; }],
    ['out-of-order ayahs', () => { const f = clone(S112); f.data[0].ayahs.reverse(); return f.data; }],
    ['empty Arabic text', () => { const f = clone(S112); f.data[0].ayahs[2].text = '  '; return f.data; }],
    ['no Arabic edition', () => { const f = clone(S112); f.data[0].edition.identifier = 'xx'; return f.data; }],
  ])('rejects %s', (_label, make) => {
    expect(() => parseSurahEditions(make(), 112)).toThrow(QuranError);
  });
});

describe('Bismillah', () => {
  it('splits the Tanzil Bismillah off ayah 1 into a header, leaving the rest verbatim', () => {
    const s = parseSurahEditions(withBismillah(S112).data, 112);
    expect(s.bismillah).toBe(DECORATED);
    expect(s.ayahs[0].ar).toBe('AR_TEXT_112_1');
    expect(s.ayahs[0].en).toBe('EN_TEXT_112_1');
    expect(s.ayahs[1].ar).toBe('AR_TEXT_112_2');
  });

  it('never strips surah 1 (it is ayah 1) or surah 9 (it has none)', () => {
    const t = `${DECORATED} AR_TEXT_X`;
    expect(splitBismillah(1, 1, t)).toEqual({ bismillah: null, text: t });
    expect(splitBismillah(9, 1, t)).toEqual({ bismillah: null, text: t });
    const f = clone(S001);
    f.data[0].ayahs[0].text = DECORATED;
    expect(parseSurahEditions(f.data, 1).ayahs[0].ar).toBe(DECORATED);
  });

  it('only touches ayah 1, and leaves text without a Bismillah alone', () => {
    const t = `${DECORATED} AR_TEXT_X`;
    expect(splitBismillah(2, 2, t).bismillah).toBeNull();
    expect(splitBismillah(2, 1, 'AR_TEXT_2_1 more words here')).toEqual({ bismillah: null, text: 'AR_TEXT_2_1 more words here' });
    // An ayah that is only the Bismillah is not emptied.
    expect(splitBismillah(2, 1, DECORATED).bismillah).toBeNull();
  });
});

describe('meta and juz', () => {
  it('parses /meta references', () => {
    const refs = SURAHS.map(s => ({ number: s.n, name: 'AR_NAME', englishName: 'EN', englishNameTranslation: 'EN', numberOfAyahs: s.ayahs, revelationType: s.place === 'Madinah' ? 'Medinan' : 'Meccan' }));
    const list = parseMeta({ surahs: { count: 114, references: refs } });
    expect(list).toHaveLength(114);
    expect(list[1]).toMatchObject({ n: 2, name: 'Al-Baqarah', ayahs: 286, place: 'Madinah' });
    expect(() => parseMeta({ surahs: { references: refs.slice(1) } })).toThrow(QuranError);
  });

  it('falls back to the bundled index when /meta is unreachable', async () => {
    (globalThis as { fetch: unknown }).fetch = jest.fn(async () => { throw new TypeError('Network request failed'); });
    await expect(fetchSurahList()).resolves.toBe(SURAHS);
  });

  it('fetches a juz', async () => {
    const fn = mockFetchJson(JUZ30);
    const j = await fetchJuz(30);
    expect(fn).toHaveBeenCalledWith('https://api.alquran.cloud/v1/juz/30/quran-uthmani', expect.anything());
    expect(j.ayahs[0]).toEqual({ s: 78, a: 1, text: 'AR_TEXT_78_1' });
  });
});

describe('network', () => {
  it('requests all three editions and reports HTTP and API errors', async () => {
    const fn = mockFetchJson(S112);
    await fetchSurah(112);
    expect(fn).toHaveBeenCalledWith('https://api.alquran.cloud/v1/surah/112/editions/quran-uthmani,en.sahih,ur.jalandhry', expect.anything());
    mockFetchJson({}, 503);
    await expect(fetchSurah(112)).rejects.toMatchObject({ kind: 'http' });
    mockFetchJson({ code: 404, status: 'NOT FOUND', data: 'x' });
    await expect(fetchSurah(112)).rejects.toMatchObject({ kind: 'http' });
  });

  it('times out', async () => {
    (globalThis as { fetch: unknown }).fetch = jest.fn((_url: string, init: { signal: AbortSignal }) => new Promise((_res, rej) => {
      init.signal.addEventListener('abort', () => rej(new Error('Aborted')));
    }));
    await expect(fetchSurah(112, { timeoutMs: 20 })).rejects.toMatchObject({ kind: 'timeout' });
  });
});

describe('offline-first cache', () => {
  const run = async (opts: Parameters<typeof loadSurah>[2] = {}) => {
    const events: SurahLoad[] = [];
    await loadSurah(112, e => events.push(e), opts);
    return events;
  };

  it('fetches on a miss and writes the cache', async () => {
    const fn = mockFetchJson(S112);
    const ev = await run({ now: 1000 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(ev.map(e => e.source)).toEqual(['network']);
    const raw = JSON.parse((await AsyncStorage.getItem(cacheKey(112)))!);
    expect(raw).toMatchObject({ v: 1, at: 1000, surah: { n: 112 } });
    expect(raw.surah.ayahs[3].ar).toBe('AR_TEXT_112_4');
  });

  it('serves a fresh cache instantly without touching the network', async () => {
    mockFetchJson(S112);
    await run({ now: 1000 });
    await clearMemoryOnly();
    const fn = mockFetchJson(S112);
    const ev = await run({ now: 1000 + 60_000 });
    expect(fn).not.toHaveBeenCalled();
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ source: 'cache', offline: false });
    expect(ev[0].surah?.ayahs[0].ar).toBe('AR_TEXT_112_1');
  });

  it('shows a stale cache first, then refreshes it', async () => {
    mockFetchJson(S112);
    await run({ now: 1000 });
    const updated = clone(S112);
    updated.data[1].ayahs[0].text = 'EN_TEXT_112_1_REVISED';
    mockFetchJson(updated);
    const ev = await run({ now: 1000 + STALE_MS + 1 });
    expect(ev.map(e => e.source)).toEqual(['cache', 'network']);
    expect(ev[0].surah?.ayahs[0].en).toBe('EN_TEXT_112_1');
    expect(ev[1].surah?.ayahs[0].en).toBe('EN_TEXT_112_1_REVISED');
  });

  it('keeps the cached copy when a refresh fails offline', async () => {
    mockFetchJson(S112);
    await run({ now: 1000 });
    (globalThis as { fetch: unknown }).fetch = jest.fn(async () => { throw new TypeError('Network request failed'); });
    const ev = await run({ now: 1000 + STALE_MS + 1 });
    expect(ev.map(e => [e.source, e.offline, e.error])).toEqual([['cache', false, null], ['cache', true, null]]);
  });

  it('reports an error when there is no cache and no network', async () => {
    (globalThis as { fetch: unknown }).fetch = jest.fn(async () => { throw new TypeError('Network request failed'); });
    const ev = await run();
    expect(ev).toHaveLength(1);
    expect(ev[0].surah).toBeNull();
    expect(ev[0].error).toBeInstanceOf(QuranError);
    expect(ev[0].error?.kind).toBe('network');
  });

  it('ignores and removes a corrupt cache entry', async () => {
    await AsyncStorage.setItem(cacheKey(112), JSON.stringify({ v: 1, at: 1, surah: { n: 112, ayahs: [] } }));
    const fn = mockFetchJson(S112);
    const ev = await run();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(ev.map(e => e.source)).toEqual(['network']);
  });
});

/** Drops the in-memory layer so the next read comes from AsyncStorage. */
async function clearMemoryOnly() {
  const raw = await AsyncStorage.getItem(cacheKey(112));
  await clearQuranCache();
  if (raw) await AsyncStorage.setItem(cacheKey(112), raw);
}
