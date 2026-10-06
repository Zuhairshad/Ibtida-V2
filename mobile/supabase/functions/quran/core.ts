/**
 * Quran Foundation content proxy — runtime-agnostic core (Deno on Supabase, Node in tests).
 *
 * The app must never hold the Quran Foundation client secret, so this function does:
 *   1. OAuth2 client_credentials (scope `content`) with HTTP Basic auth, token cached until expiry,
 *   2. GET /content/api/v4 for one surah: Uthmani Arabic + English + Urdu translations,
 *      following pagination, and
 *   3. returns one compact, validated JSON per surah (cacheable for a day).
 *
 * Endpoints and auth match the official @quranjs/api SDK. Text is passed through verbatim except
 * translation footnote markers (<sup foot_note=…>n</sup>) and HTML tags, which are removed.
 */

export type QfEnv = 'production' | 'prelive';
export type Config = {
  clientId: string;
  clientSecret: string;
  env: QfEnv;
  /** Translation resource ids (Quran.com v4). Production: 20 Saheeh International, 234 Jalandhari. */
  enId: number;
  urId: number;
};

const HOSTS: Record<QfEnv, { oauth: string; api: string }> = {
  production: { oauth: 'https://oauth2.quran.foundation', api: 'https://apis.quran.foundation' },
  prelive: { oauth: 'https://prelive-oauth2.quran.foundation', api: 'https://apis-prelive.quran.foundation' },
};

export class UpstreamError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Fetch = typeof fetch;
let token: { value: string; until: number; key: string } | null = null;

/** Base64 for HTTP Basic auth (btoa on Deno/browsers; Buffer on older Node). */
const basic = (id: string, secret: string) => {
  const raw = `${id}:${secret}`;
  if (typeof btoa === 'function') return btoa(raw);
  const B = (globalThis as unknown as { Buffer: { from: (s: string) => { toString: (e: string) => string } } }).Buffer;
  return B.from(raw).toString('base64');
};

async function accessToken(cfg: Config, f: Fetch): Promise<string> {
  const key = `${cfg.env}:${cfg.clientId}`;
  if (token && token.key === key && token.until > Date.now() + 60_000) return token.value;
  const res = await f(`${HOSTS[cfg.env].oauth}/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic(cfg.clientId, cfg.clientSecret)}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'content' }).toString(),
  });
  const body = await res.json().catch(() => ({})) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !body.access_token) throw new UpstreamError(502, `token: ${res.status} ${body.error ?? ''}`.trim());
  token = { value: body.access_token, until: Date.now() + (body.expires_in ?? 3600) * 1000, key };
  return token.value;
}

/** For tests: forget the cached token. */
export const resetToken = () => { token = null; };

async function api(cfg: Config, f: Fetch, path: string, retried = false): Promise<Record<string, unknown>> {
  const res = await f(`${HOSTS[cfg.env].api}/content/api/v4${path}`, {
    headers: { 'x-auth-token': await accessToken(cfg, f), 'x-client-id': cfg.clientId, Accept: 'application/json' },
  });
  if (res.status === 401 && !retried) { resetToken(); return api(cfg, f, path, true); }
  if (res.status === 404) throw new UpstreamError(404, `not found: ${path}`);
  if (!res.ok) throw new UpstreamError(502, `upstream ${res.status} for ${path}`);
  return await res.json() as Record<string, unknown>;
}

/** Translation text without footnote markers or markup. */
export const cleanTranslation = (s: string) =>
  s.replace(/<sup[^>]*>.*?<\/sup>/gi, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export type ProxyAyah = { n: number; num: number; juz: number; page: number; ar: string; en: string | null; ur: string | null };
export type ProxySurah = {
  v: 1;
  source: 'quran.foundation';
  env: QfEnv;
  n: number;
  arName: string;
  revelation: 'makkah' | 'madinah';
  /** Verbatim Bismillah (verse 1:1) for surahs that open with it; null for 1 and 9. */
  bismillah: string | null;
  translations: { en: number | null; ur: number | null };
  ayahs: ProxyAyah[];
};

type RawVerse = {
  id: number; verse_number: number; juz_number: number; page_number: number; text_uthmani: string;
  translations?: { resource_id: number; text: string }[];
};

let bismillahCache: string | null = null;

export async function getSurah(cfg: Config, f: Fetch, n: number): Promise<ProxySurah> {
  if (!Number.isInteger(n) || n < 1 || n > 114) throw new UpstreamError(400, 'surah must be 1–114');
  const ch = (await api(cfg, f, `/chapters/${n}`)).chapter as Record<string, unknown> | undefined;
  if (!ch) throw new UpstreamError(404, `chapter ${n} missing`);
  const count = Number(ch.verses_count);

  const verses: RawVerse[] = [];
  for (let page = 1; page <= 10; page++) {
    const r = await api(cfg, f, `/verses/by_chapter/${n}?translations=${cfg.enId},${cfg.urId}&fields=text_uthmani&per_page=50&page=${page}`);
    verses.push(...((r.verses as RawVerse[]) || []));
    const next = (r.pagination as { next_page?: number | null } | undefined)?.next_page;
    if (!next) break;
  }
  if (verses.length !== count) throw new UpstreamError(502, `surah ${n}: expected ${count} verses, got ${verses.length}`);

  const tr = (v: RawVerse, id: number) => {
    const t = v.translations?.find(x => x.resource_id === id)?.text;
    return t ? cleanTranslation(t) : null;
  };
  const ayahs: ProxyAyah[] = verses.map((v, i) => {
    if (v.verse_number !== i + 1 || typeof v.text_uthmani !== 'string' || !v.text_uthmani.trim()) {
      throw new UpstreamError(502, `surah ${n}: verse ${i + 1} malformed`);
    }
    return { n: v.verse_number, num: v.id, juz: v.juz_number, page: v.page_number, ar: v.text_uthmani.trim(), en: tr(v, cfg.enId), ur: tr(v, cfg.urId) };
  });

  let bismillah: string | null = null;
  if (ch.bismillah_pre && n !== 1 && n !== 9) {
    if (!bismillahCache) {
      const one = (await api(cfg, f, '/verses/by_key/1:1?fields=text_uthmani')).verse as RawVerse | undefined;
      bismillahCache = one?.text_uthmani?.trim() || null;
    }
    bismillah = bismillahCache;
  }

  return {
    v: 1, source: 'quran.foundation', env: cfg.env, n,
    arName: String(ch.name_arabic ?? ''),
    revelation: ch.revelation_place === 'madinah' ? 'madinah' : 'makkah',
    bismillah,
    translations: { en: ayahs.some(a => a.en) ? cfg.enId : null, ur: ayahs.some(a => a.ur) ? cfg.urId : null },
    ayahs,
  };
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', ...extra } });

/** HTTP handler: `GET ?surah=N` → ProxySurah, `GET ?health=1` → status. */
export async function handle(req: Request, cfg: Config | null, f: Fetch = fetch): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'GET') return json(405, { error: 'method_not_allowed' });
  if (!cfg) return json(503, { error: 'not_configured', message: 'Set QF_CLIENT_ID and QF_CLIENT_SECRET' });
  const url = new URL(req.url);
  try {
    if (url.searchParams.has('health')) {
      const r = await api(cfg, f, '/chapters');
      return json(200, { ok: true, env: cfg.env, chapters: ((r.chapters as unknown[]) || []).length });
    }
    const s = await getSurah(cfg, f, Number(url.searchParams.get('surah')));
    // Scripture doesn't change: let clients and CDNs keep it for a day.
    return json(200, s, { 'Cache-Control': 'public, max-age=86400' });
  } catch (e) {
    const status = e instanceof UpstreamError ? e.status : 502;
    return json(status, { error: status === 404 ? 'not_found' : status === 400 ? 'bad_request' : 'upstream', message: e instanceof Error ? e.message : String(e) });
  }
}

const knownKeys = new Set<string>();

/**
 * Only this project's apps may use the proxy: the request's `apikey` must be a valid API key for
 * the Supabase project (checked once against its Auth settings endpoint, then remembered). Needed
 * because publishable keys (`sb_publishable_…`) are not JWTs, so platform JWT checks can't be used.
 */
export async function projectKeyOk(req: Request, projectUrl: string | undefined, f: Fetch = fetch): Promise<boolean> {
  if (req.method === 'OPTIONS') return true;
  const key = req.headers.get('apikey')?.trim();
  if (!key || !projectUrl) return false;
  if (knownKeys.has(key)) return true;
  try {
    const r = await f(`${projectUrl.replace(/\/$/, '')}/auth/v1/settings`, { headers: { apikey: key } });
    if (r.ok) { knownKeys.add(key); return true; }
  } catch { /* treat as not verified */ }
  return false;
}

export const unauthorized = () => json(401, { error: 'unauthorized', message: 'Missing or invalid apikey' });

/** Reads configuration from an env getter (Deno.env.get / process.env). */
export function configFrom(get: (k: string) => string | undefined): Config | null {
  const clientId = get('QF_CLIENT_ID')?.trim();
  const clientSecret = get('QF_CLIENT_SECRET')?.trim();
  if (!clientId || !clientSecret) return null;
  return {
    clientId, clientSecret,
    env: get('QF_ENV')?.trim() === 'prelive' ? 'prelive' : 'production',
    enId: Number(get('QF_TRANSLATION_EN') || 20),
    urId: Number(get('QF_TRANSLATION_UR') || 234),
  };
}
