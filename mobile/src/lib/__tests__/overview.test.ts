import { dailyOverview } from '../overview';

const now = new Date(2026, 9, 11, 9, 0);
const today = '2026-10-11';
const goal = (o: Partial<{ id: number; name: string; target: number; prog: number; day: string; cg: string | null; streak: number }>) =>
  ({ id: 1, name: 'Istighfar', target: 100, prog: 0, streak: 0, remind: '', week: [0, 0, 0, 0, 0, 0, 0], cg: null, day: today, ...o });

describe('daily overview', () => {
  it('starts empty with an encouraging message', () => {
    const o = dailyOverview({ logs: {}, act: {}, goals: [], streak: 0 }, now);
    expect(o).toMatchObject({ prayed: 0, dhikr: 0, pct: 0, empty: true });
    expect(o.message).toMatch(/Bismillah/);
  });
  it('counts each source once, from real data', () => {
    const o = dailyOverview({
      logs: { [today]: { Fajr: 'prayed', Dhuhr: 'prayed', Asr: 'missed' } },
      act: { [today]: { d: 133, s: 1, q: 12 } },
      goals: [goal({ prog: 33 })],
      streak: 4,
    }, now);
    expect([o.prayed, o.dhikr, o.sessions, o.ayahs, o.streak]).toEqual([2, 133, 1, 12, 4]);
    // (2/5 + 33/100) / 2
    expect(o.pct).toBe(37);
  });
  it('never shows a goal above 100%, and yesterday’s count is not today’s', () => {
    const o = dailyOverview({ logs: {}, act: {}, goals: [goal({ prog: 140 }), goal({ id: 2, prog: 80, day: '2026-10-10' })], streak: 0 }, now);
    expect(o.goals[0]).toMatchObject({ prog: 100, pct: 100, done: true });
    expect(o.goals[1]).toMatchObject({ prog: 0, pct: 0, done: false });
    expect(o.goalsDone).toBe(1);
  });
  it('links community goals with their end date', () => {
    const o = dailyOverview({ logs: {}, act: {}, goals: [goal({ cg: '1 Million Salawat' })], streak: 0 }, now, n => (n === '1 Million Salawat' ? '2026-10-31T00:00:00Z' : null));
    expect(o.goals[0]).toMatchObject({ community: '1 Million Salawat', communityIdx: 0, endsAt: '2026-10-31T00:00:00Z' });
  });
  it('celebrates a complete day', () => {
    const logs = { [today]: { Fajr: 'prayed', Dhuhr: 'prayed', Asr: 'prayed', Maghrib: 'prayed', Isha: 'prayed' } } as const;
    const o = dailyOverview({ logs, act: {}, goals: [goal({ prog: 100 })], streak: 9 }, now);
    expect(o.pct).toBe(100);
    expect(o.message).toMatch(/every prayer and goal/);
  });
});
