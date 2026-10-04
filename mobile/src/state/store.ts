import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { CITIES, type City, type PrayerName } from '../data/content';

export type Goal = {
  id: number; name: string; target: number; prog: number; streak: number;
  remind: string; week: number[]; cg: string | null;
};
export type Circle = {
  id: number; name: string; priv: string; members: number; code: string; role: 'Owner' | 'Member';
  goals: { name: string; done: number; total: number }[];
};
/** `blocked`: locked-app openings intercepted during that session (older records may lack it). */
export type Emergency = { when: string; after: string; reason: string; blocked: number };
export type PrayerLog = 'prayed' | 'missed';
export type ThemePref = 'dark' | 'light' | 'system';

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
  token: string;
  marks: Record<number, boolean>;
  fontSize: number;
  showTr: boolean;
  rTheme: number;
  emergencies: Emergency[];
  focus: { dur: number; goal: number; apps: boolean[] };
  sched: { h: number; m: number; a: number; days: number[] };
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
  token: 'A7F2-KQ9M-3XPD',
  marks: { 183: true },
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
    saveT = setTimeout(() => {
      const { hydrated: _h, ...rest } = state;
      AsyncStorage.setItem(KEY, JSON.stringify(rest)).catch(() => {});
    }, 250);
  }
}

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
      set({ ...saved, hydrated: true });
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
