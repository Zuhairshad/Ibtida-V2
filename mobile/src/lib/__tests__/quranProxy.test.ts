/// <reference types="jest" />
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanTranslation, configFrom, handle, projectKeyOk, resetToken, type ProxySurah } from '../../../supabase/functions/quran/core';

jest.mock('../supabase', () => ({ supabaseUrl: 'https://proj.supabase.co', supabaseKey: 'anon-key' }));
// eslint-disable-next-line import/first
import { attributionFor, clearQuranCache, fetchSurah, parseProxySurah, quranProxyUrl } from '../quran';

/* ------------------------------------------------- Edge function core (Quran Foundation proxy) */

const CFG = configFrom(k => ({ QF_CLIENT_ID: 'cid', QF_CLIENT_SECRET: 'sec', QF_ENV: 'prelive' } as Record<string, string>)[k])!;
const res = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

/** Fake Quran Foundation: surah 112 (4 verses) served 2 per page, placeholder text only. */
function upstream(opts: { expireOnce?: boolean } = {}) {
  let expired = !!opts.expireOnce;
  const calls: string[] = [];
  const f = jest.fn(async (url: string, init?: RequestInit) => {
    calls.push(url);
    if (url.endsWith('/oauth2/token')) {
      expect((init!.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from('cid:sec').toString('base64')}`);
      expect(String(init!.body)).toBe('grant_type=client_credentials&scope=content');
      return res(200, { access_token: `tok${calls.length}`, expires_in: 3600 });
    }
    const h = init!.headers as Record<string, string>;
    expect(h['x-client-id']).toBe('cid');
    if (expired) { expired = false; return res(401, {}); }
    const u = new URL(url);
    expect(u.origin).toBe('https://apis-prelive.quran.foundation');
    if (u.pathname.endsWith('/chapters/112')) return res(200, { chapter: { id: 112, verses_count: 4, name_arabic: 'AR_NAME', revelation_place: 'makkah', bismillah_pre: true } });
    if (u.pathname.endsWith('/chapters/99')) return res(404, {});
    if (u.pathname.endsWith('/verses/by_key/1:1')) return res(200, { verse: { text_uthmani: 'AR_BISMILLAH' } });
    if (u.pathname.endsWith('/verses/by_chapter/112')) {
      const page = Number(u.searchParams.get('page'));
      const vs = [1, 2].map(k => (page - 1) * 2 + k).map(n => ({
        id: 6220 + n, verse_number: n, juz_number: 30, page_number: 604, text_uthmani: `AR_112_${n}`,
        translations: [{ resource_id: 20, text: `EN_${n}<sup foot_note="9">1</sup>` }, { resource_id: 234, text: `UR_${n}` }],
      }));
      return res(200, { verses: vs, pagination: { next_page: page < 2 ? page + 1 : null } });
    }
    return res(500, {});
  });
  return { f: f as unknown as typeof fetch, calls };
}

beforeEach(() => resetToken());

describe('quran edge function', () => {
  it('authenticates, follows pagination and returns a clean surah', async () => {
    const { f, calls } = upstream();
    const r = await handle(new Request('https://fn/quran?surah=112'), CFG, f);
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('public, max-age=86400');
    const s = await r.json() as ProxySurah;
    expect(s.ayahs.map(a => [a.n, a.num, a.ar, a.en, a.ur])).toEqual([1, 2, 3, 4].map(n => [n, 6220 + n, `AR_112_${n}`, `EN_${n}`, `UR_${n}`]));
    expect(s).toMatchObject({ source: 'quran.foundation', env: 'prelive', n: 112, bismillah: 'AR_BISMILLAH', revelation: 'makkah', translations: { en: 20, ur: 234 } });
    expect(calls.filter(c => c.includes('by_chapter'))).toHaveLength(2);
    // The token is reused for the next request.
    await handle(new Request('https://fn/quran?surah=112'), CFG, f);
    expect(calls.filter(c => c.endsWith('/oauth2/token'))).toHaveLength(1);
  });
  it('gets a new token once when the old one is rejected', async () => {
    const { f, calls } = upstream({ expireOnce: true });
    expect((await handle(new Request('https://fn/quran?surah=112'), CFG, f)).status).toBe(200);
    expect(calls.filter(c => c.endsWith('/oauth2/token'))).toHaveLength(2);
  });
  it('reports missing surahs, bad input and missing configuration', async () => {
    const { f } = upstream();
    expect((await handle(new Request('https://fn/quran?surah=99'), CFG, f)).status).toBe(404);
    expect((await handle(new Request('https://fn/quran?surah=0'), CFG, f)).status).toBe(400);
    expect((await handle(new Request('https://fn/quran?surah=1'), null, f)).status).toBe(503);
    expect(configFrom(() => undefined)).toBeNull();
    expect(configFrom(k => ({ QF_CLIENT_ID: 'a', QF_CLIENT_SECRET: 'b' } as Record<string, string>)[k])).toMatchObject({ env: 'production', enId: 20, urId: 234 });
  });
  it('only serves requests carrying a valid key for this project', async () => {
    const f = jest.fn(async (_u: string, init?: RequestInit) => res((init!.headers as Record<string, string>).apikey === 'good' ? 200 : 401, {})) as unknown as typeof fetch;
    const req = (k?: string) => new Request('https://fn/quran?surah=1', { headers: k ? { apikey: k } : {} });
    expect(await projectKeyOk(req('good'), 'https://p.supabase.co', f)).toBe(true);
    expect(await projectKeyOk(req('good'), 'https://p.supabase.co', f)).toBe(true);
    expect(f).toHaveBeenCalledTimes(1); // remembered after the first check
    expect(await projectKeyOk(req('stolen'), 'https://p.supabase.co', f)).toBe(false);
    expect(await projectKeyOk(req(), 'https://p.supabase.co', f)).toBe(false);
    expect(await projectKeyOk(new Request('https://fn/quran', { method: 'OPTIONS' }), undefined, f)).toBe(true);
  });
  it('strips footnote markers and markup from translations only', () => {
    expect(cleanTranslation('Text<sup foot_note="77">1</sup> more <i>x</i>')).toBe('Text more x');
  });
});

/* ------------------------------------------------------------------- App side */

const proxyBody = (n: number, count: number) => ({
  v: 1, source: 'quran.foundation', env: 'production', n, arName: 'AR_NAME', revelation: 'makkah', bismillah: 'AR_BISMILLAH',
  translations: { en: 20, ur: 234 },
  ayahs: Array.from({ length: count }, (_, i) => ({ n: i + 1, num: i + 1, juz: 30, page: 604, ar: `AR_${i + 1}`, en: `EN_${i + 1}`, ur: `UR_${i + 1}` })),
});
const S112 = require('./fixtures/surah-112.json');

describe('app: Quran Foundation source', () => {
  const OLD = process.env.EXPO_PUBLIC_QURAN_SOURCE;
  beforeEach(async () => { await AsyncStorage.clear(); await clearQuranCache(); process.env.EXPO_PUBLIC_QURAN_SOURCE = 'quran.foundation'; });
  afterAll(() => { process.env.EXPO_PUBLIC_QURAN_SOURCE = OLD; });

  it('is off unless switched on', () => {
    process.env.EXPO_PUBLIC_QURAN_SOURCE = '';
    expect(quranProxyUrl()).toBeNull();
    process.env.EXPO_PUBLIC_QURAN_SOURCE = 'quran.foundation';
    expect(quranProxyUrl()).toBe('https://proj.supabase.co/functions/v1/quran');
  });

  it('loads through the proxy with the publishable key and credits Quran Foundation', async () => {
    const fn = jest.fn(async () => res(200, proxyBody(112, 4)));
    (globalThis as { fetch: unknown }).fetch = fn;
    const s = await fetchSurah(112);
    expect(fn).toHaveBeenCalledWith('https://proj.supabase.co/functions/v1/quran?surah=112', expect.objectContaining({ headers: expect.objectContaining({ apikey: 'anon-key', Authorization: 'Bearer anon-key' }) }));
    expect(s).toMatchObject({ source: 'quran.foundation', bismillah: 'AR_BISMILLAH', place: 'Makkah' });
    expect(s.ayahs[0]).toMatchObject({ n: 1, ar: 'AR_1', en: 'EN_1', ur: 'UR_1' });
    expect(attributionFor(s)).toBe('Arabic: Quran.com (Uthmani) · English: Saheeh International · Urdu: Jalandhry · via Quran Foundation API');
  });

  it('falls back to AlQuran Cloud when the proxy fails (e.g. a pre-production key)', async () => {
    const fn = jest.fn(async (url: string) => (url.includes('/functions/v1/quran') ? res(404, { error: 'not_found' }) : res(200, S112)));
    (globalThis as { fetch: unknown }).fetch = fn;
    const s = await fetchSurah(112);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(s.source).toBe('alquran.cloud');
    expect(attributionFor(s)).toMatch(/AlQuran Cloud/);
  });

  it('rejects a proxy response with the wrong ayah count', () => {
    expect(() => parseProxySurah(proxyBody(112, 3), 112)).toThrow(/expected 4 ayahs/);
    expect(parseProxySurah({ ...proxyBody(1, 7), bismillah: 'X' }, 1).bismillah).toBeNull();
  });
});
