/**
 * Fajr wake alarm: plans the next week of alarms from the wake time and Fajr, hands them to the
 * native alarm (Android builds), and routes a ringing alarm to the wake scanner.
 *
 * Without the native module (iOS, web, Expo Go) the wake is a time-sensitive notification instead;
 * `planNotifications` adds it only in that case, so the alarm never sounds twice.
 */
import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as FajrAlarm from '../../modules/fajr-alarm';
import { ayahFor, ayahRef } from '../data/reminders';
import { getState, subscribe, type AppState as Store } from '../state/store';
import { addDays, dayKey, fmtTime, jamaatAt, timesFor } from './prayer';

export { FajrAlarm };

const HORIZON_DAYS = 7;
const WAKE_MINS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
/** A wake time this long or less before Fajr is used; anything earlier rings at Fajr itself. */
const MAX_BEFORE_FAJR_MS = 4 * 3600_000;
export const ALARM_URL = 'ibtida://wake-scan?alarm=1';

/** Alarm sounds, in the order of the chips. Adhan recordings appear only when bundled. */
export const ALARM_SOUNDS: { key: string; label: string }[] = [
  { key: 'alarm', label: 'Alarm tone' },
  { key: 'ibtida_chime', label: 'Soft chime' },
  { key: 'adhan_takbir', label: 'Allahu Akbar' },
  { key: 'adhan_makkah', label: 'Adhan · Makkah' },
  { key: 'adhan_madinah', label: 'Adhan · Madinah' },
  { key: 'silent', label: 'Vibrate only' },
];

/** The wake wheel's {h, m, a} as a 24-hour clock. */
export function wakeClock(w: Store['wake']) {
  return { h: ((w.h + 1) % 12) + (w.a ? 12 : 0), m: WAKE_MINS[w.m] ?? 0 };
}

/** When the Fajr alarm rings on `day`: the chosen wake time if it is before Fajr (within 4 h), else at Fajr. */
export function wakeAt(s: Pick<Store, 'wake'>, day: Date, fajr: Date): Date {
  const { h, m } = wakeClock(s.wake);
  const w = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
  return w < fajr && fajr.getTime() - w.getTime() < MAX_BEFORE_FAJR_MS ? w : fajr;
}

/** Fajr wake alarms for the next week (only when the Fajr wake alarm is on). */
export function planAlarms(s: Store, now = new Date(), extra: FajrAlarm.AlarmSpec[] = []): FajrAlarm.AlarmSpec[] {
  const out: FajrAlarm.AlarmSpec[] = [];
  if (s.onboarded && s.wakeVerify[0]) {
    for (let d = 0; d <= HORIZON_DAYS; d++) {
      const day = addDays(now, d);
      const fajr = timesFor(s.city, day, s.method, s.hanafi, s.adj).Fajr;
      const at = wakeAt(s, day, fajr);
      if (at.getTime() <= now.getTime() + 5000) continue;
      const a = ayahFor(day, 0);
      const j = jamaatAt(s.jamaat ?? {}, 'Fajr', day);
      out.push({
        id: `fajr.${dayKey(day)}`,
        at: at.getTime(),
        title: 'Wake for Fajr',
        body: `Fajr begins at ${fmtTime(fajr)}${j ? ` · jamaat ${fmtTime(j.at)}` : ''}\n\n“${a.en}” — ${ayahRef(a)}`,
        verify: true,
        sound: s.alarmSound || 'alarm',
        url: ALARM_URL,
      });
    }
  }
  return [...out, ...extra.filter(e => e.at > now.getTime())];
}

let test: FajrAlarm.AlarmSpec | null = null;
let chain: Promise<unknown> = Promise.resolve();

/** Re-sends the plan to the native alarm. Serialised; a no-op without the native module. */
export function syncAlarms() {
  if (!FajrAlarm.isSupported()) return chain;
  chain = chain.then(() => {
    const s = getState();
    if (!s.hydrated) return 0;
    return FajrAlarm.schedule(planAlarms(s, new Date(), test ? [test] : []));
  }).catch(() => 0);
  return chain;
}

/** A one-off alarm in `seconds`, exactly like the real one, so the user can lock the phone and try it. */
export async function testAlarm(seconds = 15) {
  const s = getState();
  test = {
    id: `test.${Date.now()}`,
    at: Date.now() + seconds * 1000,
    title: 'Test · Wake for Fajr',
    body: 'This is how your Fajr alarm rings. Scan your wudu station, then your prayer mat, to stop it.',
    verify: true,
    sound: s.alarmSound || 'alarm',
    url: ALARM_URL,
  };
  await syncAlarms();
  return test.at;
}

/** Only the fields that change the alarm plan. */
function signature(s: Store) {
  return JSON.stringify([s.hydrated, s.onboarded, s.wakeVerify[0], s.wake, s.city, s.method, s.hanafi, s.adj, s.jamaat, s.alarmSound]);
}

/**
 * Mount once in the root layout: keeps the native alarms in sync, re-plans each time the app comes
 * to the foreground, and opens the scanner while an alarm is ringing.
 */
export function useFajrAlarm() {
  const path = usePathname();
  const pathRef = useRef(path);
  useEffect(() => { pathRef.current = path; }, [path]);
  useEffect(() => {
    if (!FajrAlarm.isSupported()) return;
    let last = '';
    const check = () => {
      const sig = signature(getState());
      if (sig !== last) { last = sig; syncAlarms(); }
    };
    const toScanner = () => {
      const r = FajrAlarm.getRinging();
      if (r && getState().onboarded && !pathRef.current.startsWith('/wake-scan')) router.push('/wake-scan?alarm=1');
    };
    check();
    // Let the first route settle before redirecting a cold start from the alarm.
    const t = setTimeout(toScanner, 400);
    const unsub = subscribe(check);
    const app = AppState.addEventListener('change', st => { if (st === 'active') { syncAlarms(); toScanner(); } });
    return () => { unsub(); app.remove(); clearTimeout(t); };
  }, []);
}
