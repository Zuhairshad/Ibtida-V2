/**
 * Quran text — the only module that talks to the network for scripture.
 *
 * Source: AlQuran Cloud (https://alquran.cloud, no key), whose text comes from Tanzil.
 *   Arabic  quran-uthmani  (Tanzil Uthmani)
 *   English en.sahih       (Saheeh International)
 *   Urdu    ur.jalandhry   (Fateh Muhammad Jalandhry)
 *
 * Text is shown verbatim. The only transformation is splitting the Bismillah that Tanzil
 * prefixes to ayah 1 (surahs other than 1 and 9) into its own header — its characters are
 * kept exactly as received, just displayed above the first ayah.
 *
 * Offline-first: every surah is cached in AsyncStorage after its first successful load;
 * the cached copy is shown instantly and refreshed in the background when stale.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { isSurah, SURAHS, type Revelation, type SurahMeta } from '../data/surahs';

export const API_BASE = 'https://api.alquran.cloud/v1';
export const EDITIONS = { ar: 'quran-uthmani', en: 'en.sahih', ur: 'ur.jalandhry' } as const;
export const ATTRIBUTION = 'Arabic: Tanzil (Uthmani) · English: Saheeh International · Urdu: Jalandhry · via AlQuran Cloud';

const TIMEOUT_MS = 15000;
/** A cached surah older than this is re-fetched in the background (still shown instantly). */
export const STALE_MS = 24 * 60 * 60 * 1000;
const CACHE_V = 1;
export const cacheKey = (n: number) => `ibtida.quran.v${CACHE_V}.surah.${n}`;
const META_KEY = `ibtida.quran.v${CACHE_V}.meta`;

/* ------------------------------------------------------------------ Types */

export type Ayah = {
  /** Number within the surah. */
  n: number;
  /** Number within the whole mushaf (1–6236). */
  num: number;
  juz: number;
  page: number;
  ar: string;
  en: string | null;
  ur: string | null;
};

export type Surah = {
  n: number;
  /** Transliterated name (from the static index, for consistent spelling across the app). */
  name: string;
  /** Arabic name exactly as the API returns it. */
  arName: string;
  place: Revelation;
  count: number;
  /** Bismillah split off ayah 1, verbatim from the Arabic edition; null for 1 and 9. */
  bismillah: string | null;
  ayahs: Ayah[];
};

export type JuzAyah = { s: number; a: number; text: string };
export type Juz = { n: number; ayahs: JuzAyah[] };

export type QuranErrorKind = 'network' | 'timeout' | 'http' | 'bad_response' | 'aborted';
export class QuranError extends Error {
  kind: QuranErrorKind;
  constructor(kind: QuranErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'QuranError';
    this.kind = kind;
  }
}

/* --------------------------------------------------------------- Network */

async function getJson(path: string, opts: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<unknown> {
  const ac = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ac.abort(); }, opts.timeoutMs ?? TIMEOUT_MS);
  const onAbort = () => ac.abort();
  opts.signal?.addEventListener('abort', onAbort);
  try {
    if (opts.signal?.aborted) throw new QuranError('aborted');
    const res = await fetch(API_BASE + path, { signal: ac.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new QuranError('http', `HTTP ${res.status}`);
    let body: unknown;
    try { body = await res.json(); } catch { throw new QuranError('bad_response', 'Response was not JSON'); }
    if (!isObj(body)) throw new QuranError('bad_response', 'Unexpected body');
    if (body.code !== undefined && body.code !== 200) throw new QuranError('http', `API code ${String(body.code)}`);
    return body.data;
  } catch (e) {
    if (e instanceof QuranError) throw e;
    if (timedOut) throw new QuranError('timeout', 'Request timed out');
    if (opts.signal?.aborted) throw new QuranError('aborted');
    throw new QuranError('network', e instanceof Error ? e.message : 'Network error');
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

/* --------------------------------------------------------------- Parsing */

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);
const bad = (why: string): never => { throw new QuranError('bad_response', why); };

/*
 * Bismillah detection. Matching runs on a consonant skeleton (diacritics, tatweel and
 * Quranic annotation marks removed, alef forms unified) so it tolerates Uthmani spelling;
 * the skeleton is only compared against, never displayed.
 */
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ﻿‌-‏]/g;
export const skeleton = (w: string) => w.replace(MARKS, '').replace(/[ٱآأإ]/g, 'ا');
export const BISMILLAH_SKELETON = ['بسم', 'الله', 'الرحمن', 'الرحيم'];

/**
 * Splits a leading Bismillah off ayah 1. Returns the original text untouched (and
 * `bismillah: null`) for surahs 1 and 9, other ayahs, or when no Bismillah is present.
 */
export function splitBismillah(surah: number, ayah: number, text: string): { bismillah: string | null; text: string } {
  if (surah === 1 || surah === 9 || ayah !== 1) return { bismillah: null, text };
  const m = /^﻿?\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)(\s+|$)/.exec(text);
  if (!m) return { bismillah: null, text };
  const words = [m[1], m[2], m[3], m[4]].map(skeleton);
  if (!words.every((w, i) => w === BISMILLAH_SKELETON[i])) return { bismillah: null, text };
  const rest = text.slice(m[0].length);
  if (!rest.trim()) return { bismillah: null, text };
  return { bismillah: m[0].replace(/^﻿/, '').trim(), text: rest };
}

type RawAyah = { number: number; numberInSurah: number; text: string; juz: number; page: number };

function parseEditionAyahs(ed: Obj, count: number, label: string): RawAyah[] {
  const ayahs = ed.ayahs;
  if (!Array.isArray(ayahs) || ayahs.length !== count) bad(`${label}: expected ${count} ayahs`);
  return (ayahs as unknown[]).map((a, i) => {
    if (!isObj(a)) return bad(`${label}: ayah ${i + 1} malformed`);
    if (a.numberInSurah !== i + 1) bad(`${label}: ayah ${i + 1} out of order`);
    if (typeof a.text !== 'string' || !a.text.trim()) bad(`${label}: ayah ${i + 1} has no text`);
    return {
      number: isInt(a.number) ? a.number : 0,
      numberInSurah: i + 1,
      text: a.text as string,
      juz: isInt(a.juz) ? a.juz : 0,
      page: isInt(a.page) ? a.page : 0,
    };
  });
}

const editionId = (ed: Obj) => (isObj(ed.edition) && typeof ed.edition.identifier === 'string' ? ed.edition.identifier : null);

/**
 * Validates `/surah/{n}/editions/quran-uthmani,en.sahih,ur.jalandhry` `data` and merges the
 * editions per ayah. Arabic is required; a missing or malformed translation becomes null.
 */
export function parseSurahEditions(data: unknown, n: number): Surah {
  if (!isSurah(n)) bad(`Invalid surah ${n}`);
  const meta = SURAHS[n - 1];
  if (!Array.isArray(data) || data.length === 0) bad('Expected a list of editions');
  const eds = (data as unknown[]).filter(isObj);
  const pick = (id: string, idx: number) => eds.find(e => editionId(e) === id) ?? (eds.every(e => editionId(e) === null) ? eds[idx] : undefined);
  const arEd = pick(EDITIONS.ar, 0);
  if (!arEd) return bad('Arabic edition missing');
  if (arEd.number !== n) bad(`Expected surah ${n}, got ${String(arEd.number)}`);
  const count = isInt(arEd.numberOfAyahs) ? arEd.numberOfAyahs : meta.ayahs;
  if (count !== meta.ayahs) bad(`Surah ${n}: expected ${meta.ayahs} ayahs, got ${count}`);
  const ar = parseEditionAyahs(arEd, count, 'Arabic');
  const optional = (ed: Obj | undefined, label: string) => {
    if (!ed || ed.number !== n) return null;
    try { return parseEditionAyahs(ed, count, label); } catch { return null; }
  };
  const en = optional(pick(EDITIONS.en, 1), 'English');
  const ur = optional(pick(EDITIONS.ur, 2), 'Urdu');
  const first = splitBismillah(n, 1, ar[0].text);
  const place: Revelation = arEd.revelationType === 'Medinan' ? 'Madinah' : arEd.revelationType === 'Meccan' ? 'Makkah' : meta.place;
  return {
    n,
    name: meta.name,
    arName: typeof arEd.name === 'string' && arEd.name.trim() ? arEd.name : meta.ar,
    place,
    count,
    bismillah: first.bismillah,
    ayahs: ar.map((a, i) => ({
      n: i + 1,
      num: a.number,
      juz: a.juz,
      page: a.page,
      ar: i === 0 ? first.text : a.text,
      en: en ? en[i].text : null,
      ur: ur ? ur[i].text : null,
    })),
  };
}

/** Validates `/meta` `data.surahs.references`. */
export function parseMeta(data: unknown): SurahMeta[] {
  const refs = isObj(data) && isObj(data.surahs) ? data.surahs.references : undefined;
  if (!Array.isArray(refs) || refs.length !== 114) return bad('Expected 114 surah references');
  return refs.map((r, i) => {
    if (!isObj(r) || r.number !== i + 1 || !isInt(r.numberOfAyahs)) return bad(`Surah reference ${i + 1} malformed`);
    const local = SURAHS[i];
    return {
      n: i + 1,
      name: local.name,
      ar: local.ar,
      ayahs: r.numberOfAyahs,
      place: r.revelationType === 'Medinan' ? 'Madinah' : r.revelationType === 'Meccan' ? 'Makkah' : local.place,
    };
  });
}

/** Validates `/juz/{n}/quran-uthmani` `data`. */
export function parseJuz(data: unknown, n: number): Juz {
  if (!isObj(data) || data.number !== n || !Array.isArray(data.ayahs) || data.ayahs.length === 0) return bad(`Juz ${n} malformed`);
  return {
    n,
    ayahs: data.ayahs.map((a, i) => {
      if (!isObj(a) || !isObj(a.surah) || !isInt(a.surah.number) || !isInt(a.numberInSurah) || typeof a.text !== 'string') return bad(`Juz ${n}: ayah ${i + 1} malformed`);
      const s = a.surah.number;
      const at = a.numberInSurah;
      return { s, a: at, text: splitBismillah(s, at, a.text).text };
    }),
  };
}

/* ----------------------------------------------------------------- Cache */

type CacheEntry = { v: number; at: number; surah: Surah };
const memory = new Map<number, CacheEntry>();

function validEntry(x: unknown, n: number): x is CacheEntry {
  if (!isObj(x) || x.v !== CACHE_V || !isInt(x.at) || !isObj(x.surah)) return false;
  const s = x.surah as Obj;
  return s.n === n && Array.isArray(s.ayahs) && s.ayahs.length === SURAHS[n - 1].ayahs
    && s.ayahs.every(a => isObj(a) && typeof a.ar === 'string');
}

export async function readCachedSurah(n: number): Promise<CacheEntry | null> {
  const hit = memory.get(n);
  if (hit) return hit;
  try {
    const raw = await AsyncStorage.getItem(cacheKey(n));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!validEntry(parsed, n)) { AsyncStorage.removeItem(cacheKey(n)).catch(() => {}); return null; }
    memory.set(n, parsed);
    return parsed;
  } catch {
    return null;
  }
}

async function writeCachedSurah(surah: Surah, now: number) {
  const entry: CacheEntry = { v: CACHE_V, at: now, surah };
  memory.set(surah.n, entry);
  try { await AsyncStorage.setItem(cacheKey(surah.n), JSON.stringify(entry)); } catch { /* storage full: memory copy still serves this session */ }
}

/** For tests and "clear cache". */
export async function clearQuranCache() {
  memory.clear();
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter(k => k.startsWith('ibtida.quran.')));
}

/* -------------------------------------------------------------- Fetchers */

/** Fetches a surah (all three editions) from the network and caches it. */
export async function fetchSurah(n: number, opts: { signal?: AbortSignal; timeoutMs?: number; now?: number } = {}): Promise<Surah> {
  if (!isSurah(n)) throw new QuranError('bad_response', `Invalid surah ${n}`);
  const data = await getJson(`/surah/${n}/editions/${EDITIONS.ar},${EDITIONS.en},${EDITIONS.ur}`, opts);
  const surah = parseSurahEditions(data, n);
  await writeCachedSurah(surah, opts.now ?? Date.now());
  return surah;
}

/** Surah list from `/meta`, cached; falls back to the bundled index offline. */
export async function fetchSurahList(opts: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<SurahMeta[]> {
  try {
    const list = parseMeta(await getJson('/meta', opts));
    AsyncStorage.setItem(META_KEY, JSON.stringify(list)).catch(() => {});
    return list;
  } catch (e) {
    try {
      const raw = await AsyncStorage.getItem(META_KEY);
      const cached: unknown = raw ? JSON.parse(raw) : null;
      if (Array.isArray(cached) && cached.length === 114) return cached as SurahMeta[];
    } catch { /* fall through */ }
    if (e instanceof QuranError && e.kind === 'aborted') throw e;
    return SURAHS;
  }
}

/** Arabic text of a juz (Bismillah prefixes split off as in the reader). */
export async function fetchJuz(n: number, opts: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<Juz> {
  if (!Number.isInteger(n) || n < 1 || n > 30) throw new QuranError('bad_response', `Invalid juz ${n}`);
  return parseJuz(await getJson(`/juz/${n}/${EDITIONS.ar}`, opts), n);
}

export type SurahLoad = { surah: Surah | null; source: 'cache' | 'network' | null; offline: boolean; error: QuranError | null };

/**
 * Offline-first load. Emits the cached copy immediately (if any), then refreshes from the
 * network when there is no cache or it is older than `staleMs`. A failed refresh keeps the
 * cached copy (offline: true); with no cache the error is emitted.
 */
export async function loadSurah(n: number, emit: (s: SurahLoad) => void, opts: { signal?: AbortSignal; staleMs?: number; now?: number; timeoutMs?: number } = {}) {
  const now = opts.now ?? Date.now();
  const cached = await readCachedSurah(n);
  if (opts.signal?.aborted) return;
  if (cached) emit({ surah: cached.surah, source: 'cache', offline: false, error: null });
  if (cached && now - cached.at < (opts.staleMs ?? STALE_MS)) return;
  try {
    const fresh = await fetchSurah(n, { signal: opts.signal, timeoutMs: opts.timeoutMs, now });
    if (!opts.signal?.aborted) emit({ surah: fresh, source: 'network', offline: false, error: null });
  } catch (e) {
    if (opts.signal?.aborted) return;
    const err = e instanceof QuranError ? e : new QuranError('network');
    emit(cached ? { surah: cached.surah, source: 'cache', offline: true, error: null } : { surah: null, source: null, offline: true, error: err });
  }
}

/** React binding for `loadSurah`, with a `retry`. */
export function useSurah(n: number) {
  const [state, setState] = useState<SurahLoad & { loading: boolean }>({ surah: null, source: null, offline: false, error: null, loading: true });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const ac = new AbortController();
    setState(s => (s.surah?.n === n ? s : { surah: null, source: null, offline: false, error: null, loading: true }));
    loadSurah(n, r => setState({ ...r, loading: false }), { signal: ac.signal });
    return () => ac.abort();
  }, [n, nonce]);
  return { ...state, retry: () => { setState(s => ({ ...s, error: null, loading: !s.surah })); setNonce(x => x + 1); } };
}
