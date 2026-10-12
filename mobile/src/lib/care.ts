import { PH } from '../data/content';
import { careMessage, MILESTONES, type CareKind, type CareMsg } from '../data/care';
import { calcStreak, isActive, type AppState } from '../state/store';
import { addDays, dayKey, timesFor } from './prayer';

/**
 * Encouragement that comes from the person's own history. Local notifications are scheduled ahead of
 * time, so every message here is written to stay true however long the phone stays closed: it names
 * what already happened (a streak reached, prayers marked), never a count that could go stale. The
 * plan is rebuilt whenever the app opens or progress changes, so any activity re-anchors it.
 */

const MIN = 60_000;
const DAYS = 400;
/** Days after the last activity on which a check-in is sent, and what it says. The ladder then stops for good. */
const LADDER: Record<number, CareKind> = { 1: 'keep', 3: 'back3', 7: 'back7', 14: 'back14', 30: 'back30' };
const START: Record<number, CareKind> = { 1: 'start1', 3: 'start3', 7: 'start7' };
export const CARE_MAX = 8;

export type CareState = Pick<AppState, 'act' | 'logs' | 'tasLife' | 'since' | 'name' | 'notifCare' | 'city' | 'method' | 'hanafi' | 'adj'>;

export type Journey = {
  /** Consecutive active days ending today (or yesterday while today is open). */
  streak: number;
  /** Longest run of active days on record. */
  best: number;
  /** Days since the last active day (0 = today); null when there is no activity yet. */
  ago: number | null;
  activeToday: boolean;
  /** Length of the run that ended on the last active day. */
  lastRun: number;
  /** Last seven days, oldest first, today last. */
  week: boolean[];
  weekPrayers: number;
  weekDhikr: number;
  weekAyahs: number;
  /** Over the whole history. */
  prayed: number;
  dhikr: number;
  loggedToday: number;
  /** Marks prayers on most days, so an evening nudge to mark them is welcome. */
  logger: boolean;
  /** Days since the app first ran. */
  sinceAgo: number;
};

const keyAgo = (now: Date, n: number) => dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, 12));
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();

export function journeyOf(s: Pick<AppState, 'act' | 'logs' | 'tasLife' | 'since'>, now = new Date()): Journey {
  const keys = Array.from({ length: DAYS }, (_, i) => keyAgo(now, i));
  const active = keys.map(k => isActive(s, k));
  const first = active.indexOf(true);
  const runAt = (i: number) => { let n = 0; while (i < DAYS && active[i]) { n++; i++; } return n; };
  let best = 0;
  for (let i = 0; i < DAYS; i++) if (active[i]) { const r = runAt(i); best = Math.max(best, r); i += r; }
  const last7 = keys.slice(0, 7);
  const sum = (f: (k: string) => number, ks: string[]) => ks.reduce((a, k) => a + f(k), 0);
  const prayedOn = (k: string) => PH.filter(p => s.logs[k]?.[p] === 'prayed').length;
  const loggedOn = (k: string) => PH.filter(p => !!s.logs[k]?.[p]).length;
  return {
    streak: calcStreak(s, now),
    best,
    ago: first < 0 ? null : first,
    activeToday: active[0],
    lastRun: first < 0 ? 0 : runAt(first),
    week: last7.map((_, i) => active[6 - i]),
    weekPrayers: sum(prayedOn, last7),
    weekDhikr: sum(k => s.act[k]?.d ?? 0, last7),
    weekAyahs: sum(k => s.act[k]?.q ?? 0, last7),
    prayed: sum(prayedOn, keys),
    dhikr: sum(k => s.act[k]?.d ?? 0, keys),
    loggedToday: loggedOn(keys[0]),
    logger: last7.slice(1).filter(k => loggedOn(k) > 0).length >= 3,
    sinceAgo: s.since > 0 ? Math.max(0, Math.round((startOfDay(now) - startOfDay(new Date(s.since))) / 86_400_000)) : 0,
  };
}

export type CareItem = CareMsg & { at: Date; kind: string };

/**
 * The check-ins to schedule, soonest first. At most one a day (plus a morning celebration), none late
 * at night, and the whole ladder ends after a month of silence.
 */
export function planCare(s: CareState, now = new Date()): CareItem[] {
  if (s.notifCare === false) return [];
  const j = journeyOf(s, now);
  const fresh = j.ago === null;
  // Someone who has not started has no history to lean on; only a welcome ladder from install day.
  if (fresh && !(s.since > 0)) return [];
  const anchor = fresh ? j.sinceAgo : j.ago!;
  const steps = fresh ? START : LADDER;
  const name = s.name.trim().split(/\s+/)[0]?.slice(0, 20) ?? '';
  const ctx = { name, run: 0, prayed: j.prayed, dhikr: j.dhikr };
  const out: CareItem[] = [];
  const taken = new Set<string>();
  const times = (day: Date) => timesFor(s.city, day, s.method, s.hanafi, s.adj);

  for (let d = 0; d + anchor <= 30; d++) {
    let kind = steps[anchor + d];
    if (!kind) continue;
    const day = addDays(now, d);
    const run = fresh ? 0 : j.lastRun;
    if (kind === 'keep' && run < 2) kind = 'keep1';
    // Just after Maghrib: people are usually home and the day's last chance is still ahead.
    const at = new Date(times(day).Maghrib.getTime() + 40 * MIN);
    out.push({ at, kind: `care.${kind}.${dayKey(day)}`, ...careMessage(kind, { ...ctx, run }, day) });
    taken.add(dayKey(day));
  }

  // A streak milestone reached today is celebrated tomorrow morning, once.
  if (j.activeToday && MILESTONES.includes(j.streak)) {
    const day = addDays(now, 1);
    out.push({ at: new Date(times(day).Fajr.getTime() + 40 * MIN), kind: `care.milestone.${j.streak}`, ...careMessage('milestone', { ...ctx, run: j.streak }, day) });
  }

  // Someone who marks their prayers is nudged to finish today's log, unless another check-in is already due.
  if (j.logger && j.loggedToday < PH.length && !taken.has(dayKey(now))) {
    out.push({ at: new Date(times(now).Isha.getTime() + 30 * MIN), kind: `care.log.${dayKey(now)}`, ...careMessage('log', ctx, now) });
  }

  return out.filter(n => n.at.getTime() > now.getTime() + 5000).sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, CARE_MAX);
}
