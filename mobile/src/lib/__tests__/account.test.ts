import { getState, resetAccountData, set } from '../../state/store';

describe('switching accounts on one phone', () => {
  it('drops the previous account’s personal data but keeps device settings', () => {
    set({
      hydrated: true, accountId: 'user-a', name: 'Aisha', email: 'a@x.com', theme: 'light', method: 2,
      logs: { '2026-10-07': { Fajr: 'prayed' } }, goals: [{ id: 1, name: 'Istighfar', target: 100, prog: 40, streak: 3, remind: '', week: [0, 0, 0, 0, 0, 0, 0], cg: null }],
      wakeLog: [{ date: '2026-10-07', at: 1 }], tasLife: { 'b:SubhanAllah': { n: 99, rounds: 3 } }, masjid: 'Masjid an-Noor',
    });
    const token = getState().token;
    resetAccountData('user-b');
    const s = getState();
    expect(s.accountId).toBe('user-b');
    expect([s.name, s.email, s.masjid]).toEqual(['', '', '']);
    expect(s.logs).toEqual({});
    expect(s.goals).toEqual([]);
    expect(s.wakeLog).toEqual([]);
    expect(s.tasLife).toEqual({});
    // A fresh wake-tag token: the previous person's printed tags don't stop this account's alarm.
    expect(s.token).not.toBe(token);
    expect(s.theme).toBe('light');
    expect(s.method).toBe(2);
  });
});
