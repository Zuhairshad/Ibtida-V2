/**
 * Scheduled Ibadah Lock windows — pure time maths shared by the UI, notifications and the native
 * sync. A window opens at `h:m` on each selected day and lasts `dur` minutes (it may run past
 * midnight; the day is the day it opens). Mirrors `LockSchedule.kt`.
 */

export type LockSched = {
  id: string;
  /** 24-hour clock. */
  h: number;
  m: number;
  /** Minutes, 5 … 720. */
  dur: number;
  /** Mon…Sun, 1 = on. */
  days: number[];
  on: boolean;
};

export const DUR_MIN = 5;
export const DUR_MAX = 12 * 60;
const DAY_LETTERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const monIdx = (d: Date) => (d.getDay() + 6) % 7;

/** Bitmask for the native module: Monday = bit 0 … Sunday = bit 6. */
export const daysMask = (days: number[]) => days.reduce((a, on, i) => (on ? a | (1 << i) : a), 0);

export const toNativeWindows = (locks: LockSched[]) =>
  locks.map(l => ({ id: l.id, start: l.h * 60 + l.m, duration: Math.max(0, Math.min(DUR_MAX, l.dur)), days: daysMask(l.days), enabled: l.on }));

/** "5:05 am" */
export function clock12(h: number, m: number) {
  const ap = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
}

/** "45 min", "1 hr", "1 hr 30 min" */
export function durLabel(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** "Every day", "Weekdays", "Weekends", "Mon, Wed, Fri", "No days". */
export function daysLabel(days: number[]) {
  const on = days.map(Boolean);
  const n = on.filter(Boolean).length;
  if (n === 7) return 'Every day';
  if (n === 0) return 'No days';
  if (n === 5 && on.slice(0, 5).every(Boolean)) return 'Weekdays';
  if (n === 2 && on[5] && on[6]) return 'Weekends';
  return DAY_LETTERS.filter((_, i) => on[i]).join(', ');
}

/** "5:00 – 5:45 am" style range for one window. */
export function rangeLabel(l: Pick<LockSched, 'h' | 'm' | 'dur'>) {
  const endMin = (l.h * 60 + l.m + l.dur) % (24 * 60);
  return `${clock12(l.h, l.m)} – ${clock12(Math.floor(endMin / 60), endMin % 60)}`;
}

const startOn = (l: LockSched, day: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), l.h, l.m, 0, 0);

/** The window running at `now` (respecting an emergency skip), latest-ending first. */
export function activeLock(locks: LockSched[], now = new Date(), skipUntil = 0): { lock: LockSched; start: Date; end: Date } | null {
  let best: { lock: LockSched; start: Date; end: Date } | null = null;
  for (const l of locks) {
    if (!l.on || l.dur <= 0) continue;
    for (const back of [0, 1]) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
      if (!l.days[monIdx(day)]) continue;
      const start = startOn(l, day);
      const end = new Date(start.getTime() + l.dur * 60_000);
      if (now >= start && now < end && end.getTime() > skipUntil && (!best || end > best.end)) best = { lock: l, start, end };
    }
  }
  return best;
}

/** Every window start in the next `days` days, soonest first. */
export function upcomingLocks(locks: LockSched[], now = new Date(), days = 7) {
  const out: { lock: LockSched; start: Date; end: Date }[] = [];
  for (const l of locks) {
    if (!l.on || l.dur <= 0) continue;
    for (let d = 0; d <= days; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      if (!l.days[monIdx(day)]) continue;
      const start = startOn(l, day);
      if (start > now) out.push({ lock: l, start, end: new Date(start.getTime() + l.dur * 60_000) });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Two enabled windows that overlap on a shared day (shown as a gentle warning, not blocked). */
export function overlaps(a: Pick<LockSched, 'h' | 'm' | 'dur' | 'days'>, b: Pick<LockSched, 'h' | 'm' | 'dur' | 'days'>) {
  const week = 7 * 24 * 60;
  const spans = (l: typeof a) => l.days.flatMap((on, i) => (on ? [[i * 1440 + l.h * 60 + l.m, i * 1440 + l.h * 60 + l.m + l.dur]] : []));
  for (const [s1, e1] of spans(a)) for (const [s2, e2] of spans(b)) {
    for (const shift of [-week, 0, week]) if (s1 < e2 + shift && s2 + shift < e1) return true;
  }
  return false;
}
