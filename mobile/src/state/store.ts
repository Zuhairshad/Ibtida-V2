import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { AppState as RNAppState } from 'react-native';
import { CITIES, type City, type PrayerName } from '../data/content';
import { isAyahRef } from '../data/surahs';

/** Reminder time from the goal-schedule wheels: h indexes 1–12, m indexes 00/15/30/45, a 0=AM 1=PM, days Mon…Sun. */
export type Sched = { h: number; m: number; a: number; days: number[] };
export type Goal = {
  id: number; name: string; target: number; prog: number; streak: number;
  remind: string; week: number[]; cg: string | null;
  /** Set once the user saves a schedule for this goal; older goals fall back to `remind`. */
  sched?: Sched;
  /** Reminder days, Mon..Sun (1 = on). Missing means every day. */
  days?: number[];
};
export type Circle = {
  id: number; name: string; priv: string; members: number; code: string; role: 'Owner' | 'Member';
  goals: { name: string; done: number; total: number }[];
};
/** `blocked`: locked-app openings intercepted during that session (older records may lack it). */
export type Emergency = { when: string; after: string; reason: string; blocked: number };
export type PrayerLog = 'prayed' | 'missed';
/** One verified two-stage wake scan. `date` is the local day key, `at` epoch ms. */
export type WakeEntry = { date: string; at: number };
export type ThemePref = 'dark' | 'light' | 'system';
/** A reading position: surah, ayah and when it was reached (ms). */
export type QPos = { s: number; a: number; at: number };

export type AppState = {
  hydrated: boolean;
  onboarded: boolean;
  signedIn: boolean;
  name: string;
  email: string;
  theme: ThemePref;
  intents: boolean[];
  city: City;
  method: number;
  hanafi: boolean;
  wake: { h: number; m: number; a: number };
  logs: Record<string, Partial<Record<PrayerName, PrayerLog>>>;
  adhan: Record<PrayerName, boolean>;
  sound: number;
  vib: boolean;
  goals: Goal[];
  dh: number;
  tasN: number;
  joined: boolean[];
  ameen: Record<string, boolean>;
  urdu: Record<string, boolean>;
  urduAll: boolean;
  circles: Circle[];
  privacy: boolean[];
  notifs: boolean[];
  wakeVerify: boolean[];
  wakeLog: WakeEntry[];
  token: string;
  /** Quran bookmarks keyed "surah:ayah" (e.g. "2:183"). */
  marks: Record<string, boolean>;
  /** Last reading position in the Quran reader. */
  qLast: QPos | null;
  /** Recently read surahs, newest first, one entry per surah. */
  qHist: QPos[];
  /** Furthest ayah reached per surah. */
  qMax: Record<string, number>;
  fontSize: number;
  showTr: boolean;
  rTheme: number;
  emergencies: Emergency[];
  focus: { dur: number; goal: number; apps: boolean[] };
  sched: Sched;
  streak: number;
};

const initial: AppState = {
  hydrated: false,
  onboarded: false,
  signedIn: false,
  name: 'Yusuf Rahman',
  email: '',
  theme: 'dark',
  intents: [true, true, false, true],
  city: CITIES[0],
  method: 0,
  hanafi: true,
  wake: { h: 3, m: 6, a: 0 },
  logs: {},
  adhan: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: false },
  sound: 0,
  vib: true,
  goals: [
    { id: 1, name: 'Durood Sharif', target: 100, prog: 33, streak: 9, remind: '8:00 pm', week: [1, 1, 1, 1, 0, 1, 1], cg: '1 Million Salawat' },
    { id: 2, name: 'Istighfar', target: 100, prog: 100, streak: 12, remind: 'after Fajr', week: [1, 1, 1, 1, 1, 1, 1], cg: null },
    { id: 3, name: 'SubhanAllahi wa bihamdihi', target: 100, prog: 40, streak: 4, remind: '7:30 am', week: [0, 1, 1, 0, 1, 1, 1], cg: null },
  ],
  dh: 0,
  tasN: 21,
  joined: [true, false, false],
  ameen: {},
  urdu: {},
  urduAll: true,
  circles: [
    { id: 1, name: 'Rahman family', priv: 'Private', members: 6, code: 'K7Q2M9XA', role: 'Owner', goals: [{ name: 'Fajr together · 30 days', done: 216, total: 300 }, { name: '10,000 Salawat', done: 6420, total: 10000 }] },
    { id: 2, name: 'Thursday halaqa', priv: 'Invite only', members: 14, code: 'P3WZ8LNC', role: 'Member', goals: [{ name: 'One juz a week', done: 9, total: 20 }] },
  ],
  privacy: [false, false, true, false, true, false],
  notifs: [true, true, true, false, true, false],
  wakeVerify: [true, false, false, false, false],
  wakeLog: [],
  token: 'A7F2-KQ9M-3XPD',
  marks: {},
  qLast: null,
  qHist: [],
  qMax: {},
  fontSize: 30,
  showTr: true,
  rTheme: 0,
  emergencies: [
    { when: 'Thu 24 Sep · 9:42 pm', after: 'after 11 min', reason: 'Family call about travel plans', blocked: 2 },
    { when: 'Sat 19 Sep · 6:15 am', after: 'after 4 min', reason: 'Needed directions to the masjid', blocked: 0 },
  ],
  focus: { dur: 0, goal: 0, apps: [true, true, true, false, false, false] },
  sched: { h: 7, m: 0, a: 1, days: [1, 1, 1, 1, 1, 0, 0] },
  streak: 9,
};

type Listener = () => void;
let state: AppState = initial;
const listeners = new Set<Listener>();
const KEY = 'ibtida.v7.state';
let saveT: ReturnType<typeof setTimeout> | undefined;

export function getState() {
  return state;
}

export function set(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  listeners.forEach(l => l());
  if (state.hydrated) {
    clearTimeout(saveT);
    // Counters write locally first and are debounced, so a burst of taps is never lost.
    saveT = setTimeout(save, 250);
  }
}

function save() {
  clearTimeout(saveT);
  saveT = undefined;
  const { hydrated: _h, ...rest } = state;
  AsyncStorage.setItem(KEY, JSON.stringify(rest)).catch(() => {});
}

// Flush a pending debounced save when the app is backgrounded, so the last taps survive the app being killed.
RNAppState.addEventListener('change', s => { if (s !== 'active' && saveT !== undefined) save(); });

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useApp<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}

export async function hydrate() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<AppState>;
      set({ ...saved, ...migrate(saved), hydrated: true });
      return;
    }
  } catch {
    // Corrupt storage falls back to defaults rather than blocking launch.
  }
  set({ hydrated: true });
}

export async function resetAll() {
  await AsyncStorage.removeItem(KEY).catch(() => {});
  state = { ...initial, hydrated: true };
  listeners.forEach(l => l());
}

/* ----------------------------------------------------------------- Quran */

/**
 * Bookmarks used to be numeric keys into Al-Baqarah (the only surah the v7 reader showed);
 * they are now "surah:ayah". Numeric keys map to "2:N"; anything invalid is dropped.
 */
export function migrateMarks(marks: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!marks || typeof marks !== 'object') return out;
  for (const [k, v] of Object.entries(marks as Record<string, unknown>)) {
    if (!v) continue;
    const key = /^\d+$/.test(k) ? `2:${k}` : k;
    const m = /^(\d+):(\d+)$/.exec(key);
    if (m && isAyahRef(+m[1], +m[2])) out[key] = true;
  }
  return out;
}

const isPos = (p: unknown): p is QPos =>
  !!p && typeof p === 'object' && isAyahRef((p as QPos).s, (p as QPos).a) && typeof (p as QPos).at === 'number';

function migrate(saved: Partial<AppState>): Partial<AppState> {
  return {
    marks: migrateMarks(saved.marks),
    qLast: isPos(saved.qLast) ? saved.qLast : null,
    qHist: Array.isArray(saved.qHist) ? saved.qHist.filter(isPos) : [],
    qMax: saved.qMax && typeof saved.qMax === 'object' ? saved.qMax : {},
  };
}

export const HISTORY_MAX = 30;

/** Saves the reader position: last position, per-surah history and furthest ayah. */
export function recordReading(s: number, a: number, at = Date.now()) {
  if (!isAyahRef(s, a)) return;
  const cur = state.qLast;
  if (cur && cur.s === s && cur.a === a) return;
  set(st => {
    const pos = { s, a, at };
    const key = String(s);
    return {
      qLast: pos,
      qHist: [pos, ...st.qHist.filter(h => h.s !== s)].slice(0, HISTORY_MAX),
      qMax: (st.qMax[key] ?? 0) >= a ? st.qMax : { ...st.qMax, [key]: a },
    };
  });
}

export const markKey = (s: number, a: number) => `${s}:${a}`;
