/**
 * Worldwide place search for prayer times, and the calculation method suited to a country.
 * Search uses the Open-Meteo geocoding API (GeoNames data, free, no key); offline it falls back
 * to the built-in city list.
 */
import { CITIES, type City } from '../data/content';

const GEO = 'https://geocoding-api.open-meteo.com/v1/search';

type GeoHit = { name: string; latitude: number; longitude: number; country?: string; country_code?: string; admin1?: string };

/** "London, England, United Kingdom" → shown in full; stored as "London, United Kingdom". */
export type Place = City & { detail: string };

export function offlinePlaces(q: string): Place[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return CITIES.filter(c => c.name.toLowerCase().startsWith(s)).slice(0, 6).map(c => ({ ...c, detail: c.name }));
}

export async function searchPlaces(q: string, signal?: AbortSignal): Promise<Place[]> {
  const s = q.trim();
  if (s.length < 2) return offlinePlaces(s);
  const res = await fetch(`${GEO}?name=${encodeURIComponent(s)}&count=8&language=en&format=json`, { signal });
  if (!res.ok) throw new Error(`geocoding ${res.status}`);
  const data = (await res.json()) as { results?: GeoHit[] };
  const seen = new Set<string>();
  return (data.results || []).flatMap(r => {
    const name = [r.name, r.country].filter(Boolean).join(', ');
    const detail = [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : null, r.country].filter(Boolean).join(', ');
    if (seen.has(detail)) return [];
    seen.add(detail);
    return [{ name, detail, lat: r.latitude, lng: r.longitude, cc: r.country_code?.toUpperCase() }];
  }).slice(0, 6);
}

/* ------------------------------------------------------- Method by country */

const KARACHI = ['PK', 'IN', 'BD', 'AF', 'NP', 'LK', 'MV'];
const ISNA = ['US', 'CA'];
const UMM_AL_QURA = ['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE'];
const EGYPT = ['EG', 'SD', 'SS', 'LY', 'SY', 'LB', 'JO', 'PS', 'IQ', 'NG', 'GH', 'SN', 'ML', 'NE', 'SO', 'ET', 'KE', 'TZ', 'UG'];
/** Countries where the Hanafi school predominates (later Asr). */
const HANAFI = ['PK', 'IN', 'BD', 'AF', 'TR', 'UZ', 'TJ', 'KZ', 'KG', 'TM', 'BA', 'AL', 'XK', 'MK'];

/**
 * The method index (into METHODS: Karachi, MWL, ISNA, Umm Al-Qura, Egypt) and Asr school most
 * commonly used in a country. A suggestion only — the user picks what their masjid follows.
 */
export function suggestMethod(cc?: string): { method: number; hanafi: boolean } | null {
  if (!cc) return null;
  const c = cc.toUpperCase();
  const method = KARACHI.includes(c) ? 0 : ISNA.includes(c) ? 2 : UMM_AL_QURA.includes(c) ? 3 : EGYPT.includes(c) ? 4 : 1;
  return { method, hanafi: HANAFI.includes(c) };
}
