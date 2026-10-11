import { CITIES } from '../../data/content';
import { getState } from '../../state/store';
import { planAlarms, wakeAt, wakeClock } from '../fajrAlarm';
import { planNotifications } from '../notifications';
import { timesFor } from '../prayer';

const city = CITIES[0];
const now = new Date(2026, 9, 7, 0, 30);
const base = { ...getState(), hydrated: true, onboarded: true, city, notifLang: 'en' as const, notifs: [true, false, false, false, false, false], adhan: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true } };

describe('wake time', () => {
  it('reads the wheel as a 24-hour clock', () => {
    expect(wakeClock({ h: 3, m: 6, a: 0 })).toEqual({ h: 4, m: 30 });
    expect(wakeClock({ h: 11, m: 0, a: 0 })).toEqual({ h: 0, m: 0 });
    expect(wakeClock({ h: 11, m: 0, a: 1 })).toEqual({ h: 12, m: 0 });
  });
  it('rings at the chosen time before Fajr, else at Fajr', () => {
    const day = new Date(2026, 9, 7, 12);
    const fajr = new Date(2026, 9, 7, 4, 45);
    expect(wakeAt({ wake: { h: 3, m: 6, a: 0 } }, day, fajr).getHours()).toBe(4); // 4:30
    expect(wakeAt({ wake: { h: 4, m: 0, a: 0 } }, day, fajr)).toEqual(fajr); // 5:00 is after Fajr
    expect(wakeAt({ wake: { h: 11, m: 0, a: 0 } }, day, fajr)).toEqual(fajr); // midnight is > 4 h early
  });
});

describe('alarm plan', () => {
  it('is empty when the Fajr alarm is off or before onboarding', () => {
    expect(planAlarms({ ...base, wakeVerify: [false, false, false, false, false] }, now)).toEqual([]);
    expect(planAlarms({ ...base, onboarded: false, wakeVerify: [true, false, false, false, false] }, now)).toEqual([]);
  });
  it('has one verified alarm a day for the next week, before Fajr', () => {
    const plan = planAlarms({ ...base, wakeVerify: [true, false, false, false, false], wake: { h: 3, m: 0, a: 0 }, alarmSound: 'ibtida_chime' }, now);
    expect(plan.length).toBe(8);
    expect(new Set(plan.map(a => a.id)).size).toBe(8);
    for (const a of plan) {
      const fajr = timesFor(city, new Date(a.at), base.method, base.hanafi).Fajr;
      expect(a.at).toBeLessThanOrEqual(fajr.getTime());
      expect(a.verify).toBe(true);
      expect(a.sound).toBe('ibtida_chime');
      expect(a.url).toBe('ibtida://wake-scan?alarm=1');
      expect(a.body).toMatch(/^Fajr begins at /);
    }
  });
  it('keeps a test alarm only while it is in the future', () => {
    const test = { id: 't', at: now.getTime() + 15000, title: 'x', body: '', verify: true, sound: 'alarm', url: '' };
    expect(planAlarms({ ...base, wakeVerify: [false, false, false, false, false] }, now, [test])).toEqual([test]);
    expect(planAlarms({ ...base, wakeVerify: [false, false, false, false, false] }, now, [{ ...test, at: now.getTime() - 1 }])).toEqual([]);
  });
});

describe('never two sounds for one wake', () => {
  const s = { ...base, wakeVerify: [true, true, true, true, true] };
  it('uses a notification for the wake only when there is no native alarm', () => {
    expect(planNotifications(s, now, false).some(p => p.kind.startsWith('wake.Fajr'))).toBe(true);
    expect(planNotifications(s, now, true).some(p => p.kind.startsWith('wake.'))).toBe(false);
  });
  it('verification is Fajr-only: other prayers just get their adhan', () => {
    const plan = planNotifications(s, now, false);
    expect(plan.filter(p => p.kind.startsWith('wake.')).every(p => p.kind.startsWith('wake.Fajr'))).toBe(true);
    expect(plan.some(p => p.kind.startsWith('adhan.Isha'))).toBe(true);
  });
  it('drops the Fajr adhan when the alarm rings at that same minute', () => {
    const atFajr = { ...s, wake: { h: 4, m: 0, a: 1 } }; // 5 pm: not before Fajr → rings at Fajr
    expect(planNotifications(atFajr, now, true).some(p => p.kind.startsWith('adhan.Fajr'))).toBe(false);
    const early = { ...s, wake: { h: 3, m: 0, a: 0 } }; // 4:00 am
    expect(planNotifications(early, now, true).some(p => p.kind.startsWith('adhan.Fajr'))).toBe(true);
  });
});
