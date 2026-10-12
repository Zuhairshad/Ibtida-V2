import { CITIES } from '../../data/content';
import { careMessage, MILESTONES, type CareKind } from '../../data/care';
import { QUOTES } from '../../data/reminders';
import { getState } from '../../state/store';
import { journeyOf, planCare, CARE_MAX, type CareState } from '../care';
import { planNotifications } from '../notifications';
import { dayKey } from '../prayer';

const NOW = new Date(2026, 9, 12, 10, 0);
const ago = (n: number) => dayKey(new Date(2026, 9, 12 - n, 12));
const days = (...ns: number[]) => Object.fromEntries(ns.map(n => [ago(n), { d: 10, s: 0, q: 0 }]));
const run = (len: number, from = 0) => days(...Array.from({ length: len }, (_, i) => from + i));

const base = (over: Partial<CareState> = {}): CareState => ({
  act: {}, logs: {}, tasLife: {}, since: NOW.getTime() - 40 * 86_400_000, name: '', notifCare: true,
  city: CITIES[0], method: getState().method, hanafi: getState().hanafi, adj: getState().adj, ...over,
});
const kinds = (s: CareState) => planCare(s, NOW).map(i => i.kind.split('.').slice(0, 2).join('.'));
const offsets = (s: CareState) => planCare(s, NOW).map(i => Math.round((new Date(i.at.getFullYear(), i.at.getMonth(), i.at.getDate()).getTime() - new Date(2026, 9, 12).getTime()) / 86_400_000));

describe('journeyOf', () => {
  it('reads streak, best, last run and the week', () => {
    const j = journeyOf(base({ act: { ...run(5), ...run(3, 10) } }), NOW);
    expect(j.streak).toBe(5);
    expect(j.best).toBe(5);
    expect(j.ago).toBe(0);
    expect(j.activeToday).toBe(true);
    expect(j.lastRun).toBe(5);
    expect(j.week).toEqual([false, false, true, true, true, true, true]);
    expect(j.weekDhikr).toBe(50);
  });
  it('keeps yesterday’s streak open while today is unfinished', () => {
    const j = journeyOf(base({ act: run(4, 1) }), NOW);
    expect(j.streak).toBe(4);
    expect(j.activeToday).toBe(false);
    expect(j.ago).toBe(1);
  });
  it('has nothing to say about a person with no history', () => {
    const j = journeyOf(base(), NOW);
    expect([j.streak, j.best, j.ago, j.lastRun]).toEqual([0, 0, null, 0]);
  });
  it('counts only prayers actually prayed', () => {
    const j = journeyOf(base({ logs: { [ago(0)]: { Fajr: 'prayed', Dhuhr: 'missed' } } }), NOW);
    expect(j.weekPrayers).toBe(1);
    expect(j.loggedToday).toBe(2);
  });
});

describe('planCare', () => {
  it('follows an active streak with the return ladder, then stops', () => {
    const s = base({ act: run(5) });
    expect(kinds(s)).toEqual(['care.keep', 'care.back3', 'care.back7', 'care.back14', 'care.back30']);
    expect(offsets(s)).toEqual([1, 3, 7, 14, 30]);
  });
  it('re-anchors on the last active day', () => {
    expect(offsets(base({ act: run(5, 2) }))).toEqual([1, 5, 12, 28]);
  });
  it('does not nag someone who has been away over a month', () => {
    expect(planCare(base({ act: days(45) }), NOW)).toEqual([]);
  });
  it('uses the gentle one-day line for a short run', () => {
    expect(kinds(base({ act: days(0) }))[0]).toBe('care.keep1');
  });
  it('celebrates a milestone streak the next morning', () => {
    const items = planCare(base({ act: run(7) }), NOW);
    const m = items.find(i => i.kind === 'care.milestone.7')!;
    expect(m).toBeDefined();
    expect(m.at.getDate()).toBe(13);
    expect(m.at.getHours()).toBeLessThan(9);
  });
  it('welcomes a brand-new user, but not one with no install date', () => {
    expect(kinds(base({ since: NOW.getTime() }))).toEqual(['care.start1', 'care.start3', 'care.start7']);
    expect(planCare(base({ since: 0 }), NOW)).toEqual([]);
  });
  it('is silent when switched off', () => {
    expect(planCare(base({ act: run(5), notifCare: false }), NOW)).toEqual([]);
  });
  it('sends at most one check-in a day, in the future, at a sensible hour', () => {
    const items = planCare(base({ act: run(8), logs: Object.fromEntries([1, 2, 3, 4].map(n => [ago(n), { Fajr: 'prayed' }])) }), NOW);
    expect(items.length).toBeLessThanOrEqual(CARE_MAX);
    const perDay = new Map<string, number>();
    for (const i of items) {
      expect(i.at.getTime()).toBeGreaterThan(NOW.getTime());
      expect(i.at.getHours()).toBeGreaterThanOrEqual(4);
      expect(i.at.getHours()).toBeLessThanOrEqual(22);
      const k = dayKey(i.at);
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
    }
    expect([...perDay.values()].every(n => n === 1)).toBe(true);
  });
  it('nudges someone who marks their prayers to finish today’s log', () => {
    const logs = Object.fromEntries([1, 2, 3].map(n => [ago(n), { Fajr: 'prayed' as const }]));
    expect(kinds(base({ act: run(4), logs }))).toContain('care.log');
  });
  it('greets by first name only', () => {
    const t = planCare(base({ act: run(5), name: 'Yusuf Ali' }), NOW)[0].title.en;
    expect(t).toMatch(/^Yusuf, /);
    expect(t).not.toMatch(/Ali/);
  });
});

describe('care copy', () => {
  const KINDS: CareKind[] = ['keep', 'keep1', 'back3', 'back7', 'back14', 'back30', 'start1', 'start3', 'start7', 'milestone', 'log'];
  const GUILT = /\b(fail|failed|lazy|shame|guilt|guilty|disappoint|lose|lost|miss(ed)?|neglect|abandon|forgot|wasted?)\b/i;
  const ctxs = [{ name: '', run: 0, prayed: 0, dhikr: 0 }, { name: 'Aisha', run: 5, prayed: 1234, dhikr: 99_000 }];
  it('every kind has English and Urdu text, with no guilt', () => {
    for (const k of KINDS) for (const c of ctxs) for (let d = 0; d < 4; d++) {
      const m = careMessage(k, c, new Date(2026, 9, 12 + d));
      for (const l of [m.title, m.body]) {
        expect(l.en.length).toBeGreaterThan(5);
        expect(l.ur).toMatch(/[؀-ۿ]/);
        expect(l.en).not.toMatch(GUILT);
        expect(l.en + l.ur).not.toMatch(/undefined|NaN|\{|\}/);
      }
      if (m.quote) expect(QUOTES[m.quote].length).toBeGreaterThan(0);
    }
  });
  it('milestones are real streak lengths', () => {
    expect(MILESTONES).toEqual([...MILESTONES].sort((a, b) => a - b));
  });
  it('the return quotes are sourced', () => {
    expect(QUOTES.return.length).toBeGreaterThanOrEqual(4);
  });
});

describe('planNotifications with care', () => {
  const s = { ...getState(), hydrated: true, onboarded: true, city: CITIES[0], notifs: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'], act: run(5), since: NOW.getTime() - 40 * 86_400_000 };
  it('adds the check-ins on their own channel and honours the pending cap', () => {
    const plan = planNotifications({ ...s, notifCare: true } as never, NOW);
    expect(plan.some(n => n.kind.includes('care.back3'))).toBe(true);
    expect(plan.length).toBeLessThanOrEqual(64);
  });
  it('adds none when encouragement is off', () => {
    const plan = planNotifications({ ...s, notifCare: false } as never, NOW);
    expect(plan.some(n => n.kind.includes('care.'))).toBe(false);
  });
});
