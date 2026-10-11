/**
 * Islamic Inspiration feed: posts published by admins (supabase/migrations/0026_inspiration.sql),
 * delivered live to open apps and cached for offline reading.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type InspirationKind = 'ayah' | 'hadith' | 'reminder' | 'quote';
export type PostStatus = 'draft' | 'published' | 'archived';

export type Inspiration = {
  id: string;
  kind: InspirationKind;
  title: string | null;
  ar: string | null;
  en: string | null;
  ur: string | null;
  source: string | null;
  surah: number | null;
  ayah: number | null;
  status: PostStatus;
  /** Epoch ms. */
  publishAt: number;
};

export const KINDS: { key: InspirationKind; label: string }[] = [
  { key: 'ayah', label: 'Quranic Ayah' },
  { key: 'hadith', label: 'Hadith' },
  { key: 'reminder', label: 'Reminder' },
  { key: 'quote', label: 'Quote' },
];
export const kindLabel = (k: InspirationKind) => KINDS.find(x => x.key === k)?.label ?? k;

/** Posts a day may hold (mirrors the database trigger). */
export const DAILY_MAX = 3;

const CACHE_KEY = 'ibtida.inspiration.v1';
const COLUMNS = 'id, kind, title, body_ar, body_en, body_ur, source, surah, ayah, status, publish_at';

type Row = {
  id: string; kind: InspirationKind; title: string | null; body_ar: string | null; body_en: string | null; body_ur: string | null;
  source: string | null; surah: number | null; ayah: number | null; status: PostStatus; publish_at: string;
};

export const fromRow = (r: Row): Inspiration => ({
  id: r.id, kind: r.kind, title: r.title, ar: r.body_ar, en: r.body_en, ur: r.body_ur, source: r.source,
  surah: r.surah, ayah: r.ayah, status: r.status, publishAt: Date.parse(r.publish_at),
});

const toRow = (p: Draft) => ({
  kind: p.kind,
  title: p.title?.trim() || null,
  body_ar: p.ar?.trim() || null,
  body_en: p.en?.trim() || null,
  body_ur: p.ur?.trim() || null,
  source: p.source?.trim() || null,
  surah: p.kind === 'ayah' ? p.surah : null,
  ayah: p.kind === 'ayah' ? p.ayah : null,
  status: p.status,
  publish_at: new Date(p.publishAt).toISOString(),
});

export type Draft = Omit<Inspiration, 'id'> & { id?: string };

/** What an admin must fix before saving, or [] when the post is ready. Mirrors the database checks. */
export function validateDraft(d: Draft): string[] {
  const out: string[] = [];
  if (![d.ar, d.en, d.ur].some(x => x && x.trim())) out.push('Write the text in at least one language');
  if ((d.kind === 'ayah' || d.kind === 'hadith') && !d.source?.trim()) out.push(d.kind === 'ayah' ? 'Add the surah and ayah reference' : 'Add the hadith source, e.g. Sahih Muslim 596');
  if (d.kind === 'ayah' && (!d.surah || !d.ayah)) out.push('Pick the surah and ayah');
  for (const [k, v] of [['Arabic', d.ar], ['English', d.en], ['Urdu', d.ur]] as const) if (v && v.length > 1200) out.push(`${k} text is too long (1,200 characters at most)`);
  if (d.title && d.title.length > 80) out.push('Keep the title under 80 characters');
  return out;
}

/** Day key in the user's own calendar. */
export const dayOf = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Newest first, grouped by day: today's posts lead the feed. Drafts and future posts never show here. */
export function groupFeed(posts: Inspiration[], now = Date.now()) {
  const visible = posts.filter(p => p.status === 'published' && p.publishAt <= now).sort((a, b) => b.publishAt - a.publishAt);
  const groups: { day: string; posts: Inspiration[] }[] = [];
  for (const p of visible) {
    const day = dayOf(p.publishAt);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.posts.push(p); else groups.push({ day, posts: [p] });
  }
  return groups;
}

/** How many posts are published for the day of `ms` (excluding `exceptId`). */
export const publishedOn = (posts: Inspiration[], ms: number, exceptId?: string) =>
  posts.filter(p => p.status === 'published' && p.id !== exceptId && dayOf(p.publishAt) === dayOf(ms)).length;

/* ------------------------------------------------------------------ Feed */

type FeedState = { posts: Inspiration[]; loading: boolean; error: string | null; live: boolean };
let feed: FeedState = { posts: [], loading: true, error: null, live: false };
const listeners = new Set<() => void>();
const put = (p: Partial<FeedState>) => { feed = { ...feed, ...p }; listeners.forEach(l => l()); };

async function readCache() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const list = raw ? (JSON.parse(raw) as Inspiration[]) : [];
    if (Array.isArray(list) && list.length && !feed.posts.length) put({ posts: list });
  } catch { /* nothing cached */ }
}

const writeCache = (posts: Inspiration[]) => AsyncStorage.setItem(CACHE_KEY, JSON.stringify(posts.slice(0, 60))).catch(() => {});

/** Loads the latest published posts (falls back to the cached copy offline). */
export async function refreshFeed() {
  await readCache();
  if (!supabase) { put({ loading: false, error: feed.posts.length ? null : 'offline-build' }); return; }
  const { data, error } = await supabase.from('inspirations').select(COLUMNS)
    .eq('status', 'published').lte('publish_at', new Date().toISOString())
    .order('publish_at', { ascending: false }).limit(60);
  if (error) { put({ loading: false, error: feed.posts.length ? null : 'unavailable' }); return; }
  const posts = (data as Row[]).map(fromRow);
  put({ posts, loading: false, error: null });
  writeCache(posts);
}

let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

/** New, edited and removed posts arrive while the app is open. */
function startLive() {
  if (!supabase || channel) return;
  channel = supabase.channel('inspirations-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inspirations' }, () => { refreshFeed().catch(() => {}); })
    .subscribe(status => put({ live: status === 'SUBSCRIBED' }));
}

/** The feed, kept fresh and live while any screen uses it. */
export function useInspirationFeed() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick(x => x + 1);
    listeners.add(l);
    refreshFeed().catch(() => put({ loading: false }));
    startLive();
    return () => { listeners.delete(l); };
  }, []);
  return { ...feed, groups: groupFeed(feed.posts), refresh: refreshFeed };
}

export function findPost(id: string) {
  return feed.posts.find(p => p.id === id) ?? null;
}

/* ----------------------------------------------------------------- Admin */

/** Whether the signed-in account may publish (checked by the database on every write too). */
export async function checkAdmin(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

/** Every post, including drafts, archived and scheduled ones (admins only). */
export async function adminList(): Promise<Inspiration[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('inspirations').select(COLUMNS).order('publish_at', { ascending: false }).limit(200);
  if (error) throw new Error(friendly(error));
  return (data as Row[]).map(fromRow);
}

export async function savePost(d: Draft): Promise<Inspiration> {
  if (!supabase) throw new Error('Publishing needs the online app');
  const problems = validateDraft(d);
  if (problems.length) throw new Error(problems[0]);
  const q = d.id
    ? supabase.from('inspirations').update(toRow(d)).eq('id', d.id).select(COLUMNS).single()
    : supabase.from('inspirations').insert(toRow(d)).select(COLUMNS).single();
  const { data, error } = await q;
  if (error || !data) throw new Error(friendly(error));
  refreshFeed().catch(() => {});
  return fromRow(data as Row);
}

export async function deletePost(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from('inspirations').delete().eq('id', id);
  if (error) throw new Error(friendly(error));
  refreshFeed().catch(() => {});
}

function friendly(e: { message?: string; code?: string } | null): string {
  if (!e) return 'Something went wrong — try again';
  if (e.code === 'P0010') return e.message ?? 'Three posts are already published for that day';
  if (e.code === '42501' || /row-level security/i.test(e.message ?? '')) return 'Only admins can publish';
  if (!e.code) return 'You’re offline — try again when connected';
  return e.message ?? 'Something went wrong — try again';
}
