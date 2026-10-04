import { useMemo } from 'react';
import { useNow } from '../components/motion';
import { PH, type PrayerName } from '../data/content';
import { getState, set, useApp, type PrayerLog } from '../state/store';
import { dayKey, nextPrayer, timesFor } from './prayer';

/** Live prayer schedule for today, re-evaluated every second. */
export function usePrayerNow() {
  const now = useNow();
  const city = useApp(s => s.city);
  const method = useApp(s => s.method);
  const hanafi = useApp(s => s.hanafi);
  const key = dayKey(now);
  const logs = useApp(s => s.logs[key]) || {};
  const times = useMemo(() => timesFor(city, now, method, hanafi), [city, method, hanafi, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = nextPrayer(city, now, method, hanafi);
  const doneCount = PH.filter(p => logs[p] === 'prayed').length;
  return { now, key, city, method, hanafi, times, next, logs, doneCount };
}

export function setLog(key: string, p: PrayerName, v: PrayerLog | null) {
  set(s => {
    const day = { ...(s.logs[key] || {}) };
    if (v) day[p] = v; else delete day[p];
    return { logs: { ...s.logs, [key]: day } };
  });
}

/** Per-item Urdu visibility; falls back to the global "Urdu translation" switch. */
export function useUrdu(k: string): [boolean, () => void] {
  const own = useApp(s => s.urdu[k]);
  const all = useApp(s => s.urduAll);
  const on = own !== undefined ? own : all;
  return [on, () => set(s => {
    const cur = s.urdu[k] !== undefined ? s.urdu[k] : s.urduAll;
    return { urdu: { ...s.urdu, [k]: !cur } };
  })];
}

export function fmtCountdown(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s).padStart(2, '0')}s`;
}

export function clock(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const firstName = () => getState().name.split(' ')[0];
export const initials = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
