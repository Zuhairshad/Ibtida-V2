import { activeLock, daysLabel, daysMask, durLabel, overlaps, rangeLabel, toNativeWindows, upcomingLocks, type LockSched } from '../lockTimes';

const WEEKDAYS = [1, 1, 1, 1, 1, 0, 0];
const lock = (p: Partial<LockSched> = {}): LockSched => ({ id: 'a', h: 5, m: 0, dur: 45, days: WEEKDAYS, on: true, ...p });
// 2026-10-05 is a Monday.
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m);

describe('activeLock', () => {
  it('is active inside the window on a selected day', () => {
    expect(activeLock([lock()], at(5, 5, 10))?.end).toEqual(at(5, 5, 45));
  });
  it('is not active before, after, or on an unselected day', () => {
    expect(activeLock([lock()], at(5, 4, 59))).toBeNull();
    expect(activeLock([lock()], at(5, 5, 45))).toBeNull();
    expect(activeLock([lock()], at(10, 5, 10))).toBeNull(); // Saturday
  });
  it('carries a window past midnight into the next day', () => {
    const late = lock({ h: 23, m: 30, dur: 60, days: [1, 0, 0, 0, 0, 0, 0] }); // Monday 23:30 → Tue 00:30
    expect(activeLock([late], at(6, 0, 15))?.start).toEqual(at(5, 23, 30));
    expect(activeLock([late], at(6, 0, 31))).toBeNull();
  });
  it('ignores disabled windows and honours an emergency skip', () => {
    expect(activeLock([lock({ on: false })], at(5, 5, 10))).toBeNull();
    expect(activeLock([lock()], at(5, 5, 10), at(5, 5, 45).getTime())).toBeNull();
    expect(activeLock([lock()], at(6, 5, 10), at(5, 5, 45).getTime())).not.toBeNull(); // next day locks again
  });
});

describe('labels and native shape', () => {
  it('formats days, durations and ranges', () => {
    expect(daysLabel(WEEKDAYS)).toBe('Weekdays');
    expect(daysLabel([1, 1, 1, 1, 1, 1, 1])).toBe('Every day');
    expect(daysLabel([0, 0, 0, 0, 0, 1, 1])).toBe('Weekends');
    expect(daysLabel([1, 0, 1, 0, 1, 0, 0])).toBe('Mon, Wed, Fri');
    expect(durLabel(45)).toBe('45 min');
    expect(durLabel(90)).toBe('1 hr 30 min');
    expect(rangeLabel(lock({ h: 23, m: 30, dur: 60 }))).toBe('11:30 pm – 12:30 am');
  });
  it('maps to the native bitmask', () => {
    expect(daysMask(WEEKDAYS)).toBe(0b0011111);
    expect(toNativeWindows([lock()])).toEqual([{ id: 'a', start: 300, duration: 45, days: 31, enabled: true }]);
  });
});

describe('upcoming and overlaps', () => {
  it('lists the next starts in order', () => {
    const up = upcomingLocks([lock()], at(5, 6), 3);
    expect(up.map(u => u.start)).toEqual([at(6, 5), at(7, 5), at(8, 5)]);
  });
  it('detects overlapping windows on shared days', () => {
    expect(overlaps(lock(), lock({ h: 5, m: 30 }))).toBe(true);
    expect(overlaps(lock(), lock({ h: 6 }))).toBe(false);
    expect(overlaps(lock(), lock({ days: [0, 0, 0, 0, 0, 1, 1] }))).toBe(false);
    expect(overlaps(lock({ h: 23, dur: 120, days: [0, 0, 0, 0, 0, 0, 1] }), lock({ h: 0, m: 30, days: [1, 0, 0, 0, 0, 0, 0] }))).toBe(true);
  });
});
