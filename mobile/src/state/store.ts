import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { AppState as RNAppState } from 'react-native';
import { CITIES, PH, type City, type PrayerName } from '../data/content';
import { isAyahRef } from '../data/surahs';
import type { LockSched } from '../lib/lockTimes';
import type { NotifLang } from '../data/reminders';

/** Reminder time from the goal-schedule wheels: h indexes 1–12, m indexes 00/15/30/45, a 0=AM 1=PM, days Mon…Sun. */
export type Sched = { h: number; m: number; a: number; days: number[] };
export type Goal = {
  id: number; name: string; target: number; prog: number; streak: number;
  remind: string; week: number[]; cg: string | null;
  /** Set once the user saves a schedule for this goal; older goals fall back to `remind`. */
  sched?: Sched;
  /** Reminder days, Mon..Sun (1 = on). Missing means every day. */
  days?: number[];
  /** Day key the current `prog` belongs to; progress starts again each day. */
  day?: string;
  /** Day keys on which the daily target was reached (newest last, capped). */
  hist?: string[];
};
export type Circle = {
  id: number; name: string; priv: string; members: number; code: string; role: 'Owner' | 'Member';
  goals: { name: string; done: number; total: number; id?: string }[];
  /** Server uuid when the circle comes from Supabase (signed in); absent for on-device circles. */
  remoteId?: string;
};
/** `blocked`: locked-app openings intercepted during that session (older records may lack it). */
export type Emergency = { when: string; after: string; reason: string; blocked: number };
export type PrayerLog = 'prayed' | 'missed';
/** One verified two-stage wake scan. `date` is the local day key, `at` epoch ms. */
export type WakeEntry = { date: string; at: number };
export type ThemePref = 'dark' | 'light' | 'system';
/** How each wake station is verified: its printed QR tag, or by recognising the item itself. */
export type WakeMode = 'tag' | 'item';
/** A reading position: surah, ayah and when it was reached (ms). */
export type QPos = { s: number; a: number; at: number };
/** One day of activity: dhikr counted, adhkar sessions completed, Quran ayahs newly read. */
export type DayAct = { d: number; s: number; q: number };

export type AppState = {
  hydrated: boolean;
  onboarded: boolean;
  signedIn: boolean;
  name: string;
  email: string;
  theme: ThemePref;
  intents: boolean[];
  /**
   * Onboarding choices the user actually made, so suggestions never overwrite them: a place was
   * picked, the method was suggested for this place name, the wake time was set from real Fajr.
   */
  ob: { place: boolean; method: string; wake: boolean };
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
  /** W = wudu sink, M = prayer mat. */
  wakeMode: { W: WakeMode; M: WakeMode };
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
  /** Adhkar reading: text size step (index into AZ_SIZES) and background (index into AZ_BGS). */
  azSize: number;
  azBg: number;
  /** Notification language, and whether reminders carry a short hadith. */
  notifLang: NotifLang;
  notifQuotes: boolean;
  /** Recurring Ibadah Lock windows (time, duration, days). */
  locks: LockSched[];
  /** Emergency unlock of a scheduled window: apps open normally until this epoch ms. */
  lockSkip: number;
  sched: Sched;
  /** Consecutive active days, derived from `act` and prayer logs (see `calcStreak`). */
  streak: number;
  /** Activity per day key. */
  act: Record<string, DayAct>;
  /** Today's adhkar counts: category → per-item counts. */
  az: { day: string; c: Record<string, number[]> };
};

const initial: AppState = {
  hydrated: false,
  onboarded: false,
  signedIn: false,
  name: '',
  email: '',
  theme: 'dark',
  intents: [false, false, false, false],
  ob: { place: false, method: '', wake: false },
  city: CITIES[0],
  method: 0,
  hanafi: true,
  wake: { h: 3, m: 6, a: 0 },
  logs: {},
  adhan: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: false },
  sound: 0,
  vib: true,
  goals: [],
  dh: 0,
  tasN: 0,
  joined: [false, false, false],
  ameen: {},
  urdu: {},
  urduAll: true,
  circles: [],
  privacy: [false, false, true, false, true, false],
  notifs: [true, true, true, false, true, false],
  wakeVerify: [true, false, false, false, false],
  wakeLog: [],
  token: '',
  wakeMode: { W: 'tag', M: 'tag' },
  marks: {},
  qLast: null,
  qHist: [],
  qMax: {},
  fontSize: 30,
  showTr: true,
  rTheme: 0,
  emergencies: [],
  focus: { dur: 0, goal: 0, apps: [true, true, true, false, false, false] },
  locks: [],
  lockSkip: 0,
  azSize: 1,
  azBg: 0,
  notifLang: 'both',
  notifQuotes: true,
  sched: { h: 7, m: 0, a: 1, days: [1, 1, 1, 1, 1, 0, 0] },
  streak: 0,
  act: {},
  az: { day: '', c: {} },
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
      rollDay();
      return;
    }
  } catch {
    // Corrupt storage falls back to defaults rather than blocking launch.
  }
  set({ hydrated: true, token: newToken() });
  rollDay();
}

/** Writes that come from the server (pull/merge), so the sync layer does not echo them back. */
let remoteDepth = 0;
export const isRemoteWrite = () => remoteDepth > 0;
export function setFromRemote(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  remoteDepth++;
  try { set(patch); } finally { remoteDepth--; }
}

export async function resetAll() {
  await AsyncStorage.removeItem(KEY).catch(() => {});
  state = { ...initial, hydrated: true, token: newToken() };
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
    token: saved.token || newToken(),
    locks: Array.isArray(saved.locks) ? saved.locks : [],
    // Installs from before this field finished onboarding with their own choices.
    ob: saved.ob ?? { place: true, method: saved.city?.name ?? '', wake: true },
    wakeMode: saved.wakeMode && saved.wakeMode.W && saved.wakeMode.M ? saved.wakeMode : { W: 'tag', M: 'tag' },
    act: saved.act && typeof saved.act === 'object' ? saved.act : {},
    az: saved.az && typeof saved.az === 'object' && saved.az.c ? saved.az : { day: '', c: {} },
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
  const firstTime = (state.qMax[String(s)] ?? 0) < a;
  set(st => {
    const pos = { s, a, at };
    const key = String(s);
    return {
      qLast: pos,
      qHist: [pos, ...st.qHist.filter(h => h.s !== s)].slice(0, HISTORY_MAX),
      qMax: (st.qMax[key] ?? 0) >= a ? st.qMax : { ...st.qMax, [key]: a },
    };
  });
  // A newly reached ayah counts toward today's reading.
  if (firstTime) addAct('q', 1);
}

export const markKey = (s: number, a: number) => `${s}:${a}`;

/* ------------------------------------------------------------- Activity */

const pad = (n: number) => String(n).padStart(2, '0');
/** Local day key, e.g. "2026-10-06" (same format as `lib/prayer` dayKey). */
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const keyBack = (n: number, from = new Date()) => todayKey(new Date(from.getFullYear(), from.getMonth(), from.getDate() - n, 12));

const TOKEN_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** A fresh wake-tag token, e.g. "A7F2-KQ9M-3XPD". */
export function newToken() {
  const part = () => Array.from({ length: 4 }, () => TOKEN_ABC[Math.floor(Math.random() * TOKEN_ABC.length)]).join('');
  return `${part()}-${part()}-${part()}`;
}

const ACT_DAYS = 400;
const isActive = (s: Pick<AppState, 'act' | 'logs'>, k: string) => {
  const a = s.act[k];
  if (a && (a.d > 0 || a.s > 0 || a.q > 0)) return true;
  const l = s.logs[k];
  return !!l && PH.some(p => l[p] === 'prayed');
};

/** Consecutive active days ending today (or yesterday, while today is still open). */
export function calcStreak(s: Pick<AppState, 'act' | 'logs'>, now = new Date()) {
  let i = isActive(s, keyBack(0, now)) ? 0 : 1;
  let n = 0;
  while (isActive(s, keyBack(i, now))) { n++; i++; }
  return n;
}

/** Record activity for today: dhikr counted (`d`), adhkar sessions finished (`s`), ayahs read (`q`). */
export function addAct(kind: keyof DayAct, n = 1) {
  if (!n) return;
  set(st => {
    const k = todayKey();
    const cur = st.act[k] || { d: 0, s: 0, q: 0 };
    const act = { ...st.act, [k]: { ...cur, [kind]: Math.max(0, cur[kind] + n) } };
    const keys = Object.keys(act);
    if (keys.length > ACT_DAYS) keys.sort().slice(0, keys.length - ACT_DAYS).forEach(x => { delete act[x]; });
    return { act, streak: calcStreak({ act, logs: st.logs }) };
  });
}

/** Re-derive the streak after prayer logs change. */
export function refreshStreak() {
  const n = calcStreak(state);
  if (n !== state.streak) set({ streak: n });
}

/* ---------------------------------------------------------------- Goals */

const HIST_MAX = 120;

/** Streak and Mon..Sun strip for a goal, from the days its target was met. */
export function goalStats(g: Goal, now = new Date()) {
  const today = todayKey(now);
  const met = new Set(g.hist || []);
  if (g.day === today && g.prog >= g.target) met.add(today);
  let i = met.has(today) ? 0 : 1;
  let streak = 0;
  while (met.has(keyBack(i, now))) { streak++; i++; }
  const dow = (now.getDay() + 6) % 7; // Monday = 0
  const week = Array.from({ length: 7 }, (_, d) => (d <= dow && met.has(keyBack(dow - d, now)) ? 1 : 0));
  return { streak, week };
}

/** Move a goal into today: yesterday's result goes into `hist`, today's count starts at zero. */
function rollGoal(g: Goal, today: string): Goal {
  if (!g.day) return { ...g, day: today, ...goalStats({ ...g, day: today }) };
  if (g.day === today) return g;
  const hist = g.prog >= g.target ? [...(g.hist || []).filter(d => d !== g.day), g.day].slice(-HIST_MAX) : g.hist || [];
  const next = { ...g, day: today, prog: 0, hist };
  return { ...next, ...goalStats(next) };
}

/** Start a new day for goals and today's adhkar counts. Safe to call often. */
export function rollDay() {
  const today = todayKey();
  const goals = state.goals.map(g => rollGoal(g, today));
  const changed = goals.some((g, i) => g !== state.goals[i]);
  const az = state.az.day === today ? state.az : { day: today, c: {} };
  const streak = calcStreak(state);
  if (changed || az !== state.az || streak !== state.streak) {
    // Day rollover is bookkeeping, not a user edit — don't echo it to the server as one.
    setFromRemote({ ...(changed ? { goals } : {}), az, streak });
  }
}

/** Count toward a personal goal (negative to undo). Returns the goal after the change. */
export function countGoal(id: number, delta: number): Goal | undefined {
  rollDay();
  let out: Goal | undefined;
  set(s => ({
    goals: s.goals.map(g => {
      if (g.id !== id) return g;
      const next = { ...g, prog: Math.max(0, g.prog + delta) };
      out = { ...next, ...goalStats(next) };
      return out;
    }),
  }));
  if (out) addAct('d', delta);
  return out;
}

RNAppState.addEventListener('change', s => { if (s === 'active' && state.hydrated) rollDay(); });
