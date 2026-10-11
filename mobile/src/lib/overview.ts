/**
 * Today at a glance, from the app's own data only: prayers logged, dhikr counted, adhkar sessions,
 * ayahs read, goal progress and the streak. Each count comes from one place (`logs` for prayers,
 * `act` for dhikr/sessions/ayahs, each goal's own `prog`), so nothing is counted twice.
 */
import { COMMUNITY_GOALS, PH } from '../data/content';
import type { AppState } from '../state/store';

export type OverviewGoal = {
  id: number;
  name: string;
  prog: number;
  target: number;
  /** 0–100, never above 100. */
  pct: number;
  done: boolean;
  /** Community goal this personal goal counts toward, if any. */
  community: string | null;
  /** Index into COMMUNITY_GOALS, for opening its page. */
  communityIdx: number | null;
  /** When the community goal ends (ISO), when known from the server. */
  endsAt: string | null;
  streak: number;
};

export type Overview = {
  prayed: number;
  dhikr: number;
  sessions: number;
  ayahs: number;
  goals: OverviewGoal[];
  goalsDone: number;
  /** Prayers and goals together: share of today's targets met, 0–100. */
  pct: number;
  streak: number;
  /** True when nothing at all has been done yet today. */
  empty: boolean;
  message: string;
};

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function dailyOverview(
  s: Pick<AppState, 'logs' | 'act' | 'goals' | 'streak'>,
  now = new Date(),
  endsAt: (community: string) => string | null = () => null,
): Overview {
  const key = dayKey(now);
  const log = s.logs[key] || {};
  const prayed = PH.filter(p => log[p] === 'prayed').length;
  const act = s.act[key] || { d: 0, s: 0, q: 0 };
  // A goal last counted on another day has nothing done yet today.
  const goals: OverviewGoal[] = s.goals.map(g => {
    const prog = g.day && g.day !== key ? 0 : Math.max(0, Math.min(g.prog, g.target));
    const target = Math.max(1, g.target);
    const ci = g.cg ? COMMUNITY_GOALS.findIndex(c => c.name === g.cg) : -1;
    return {
      id: g.id, name: g.name, prog, target, pct: Math.round((prog / target) * 100), done: prog >= target,
      community: g.cg, communityIdx: ci >= 0 ? ci : null, endsAt: g.cg ? endsAt(g.cg) : null, streak: g.streak,
    };
  });
  const goalsDone = goals.filter(g => g.done).length;
  // Each prayer counts once, each goal by how far along it is.
  const parts = [prayed / 5, ...goals.map(g => g.prog / g.target)];
  const pct = Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
  const empty = prayed === 0 && act.d === 0 && act.s === 0 && act.q === 0 && goals.every(g => g.prog === 0);
  return {
    prayed, dhikr: act.d, sessions: act.s, ayahs: act.q, goals, goalsDone, pct, streak: s.streak, empty,
    message: messageFor({ prayed, goals, goalsDone, empty, streak: s.streak }, now),
  };
}

function messageFor(o: { prayed: number; goals: OverviewGoal[]; goalsDone: number; empty: boolean; streak: number }, now: Date): string {
  const allGoals = o.goals.length > 0 && o.goalsDone === o.goals.length;
  if (o.prayed === 5 && (allGoals || o.goals.length === 0)) return 'Alhamdulillah — every prayer and goal met today. May Allah accept it.';
  if (o.empty) {
    if (o.streak > 0) return `Keep your ${o.streak}-day streak going — one prayer or one dhikr is enough to begin.`;
    return now.getHours() < 12 ? 'A new day. Begin with Bismillah and one small act.' : 'It’s not too late — start with one dhikr.';
  }
  if (allGoals) return 'Every goal met today. The most beloved deeds are the consistent ones.';
  const left = o.goals.filter(g => !g.done);
  if (left.length === 1) return `Nearly there — ${left[0].target - left[0].prog} more for ${left[0].name}.`;
  if (o.prayed < 5 && o.prayed > 0) return `${o.prayed} of 5 prayers logged. Keep each one on time.`;
  return 'Small and steady. Every count is written.';
}
