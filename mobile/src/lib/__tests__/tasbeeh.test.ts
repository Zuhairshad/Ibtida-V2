import { getState, set, countGoal } from '../../state/store';
import { allDhikr, nextKey, parseTarget, tap, undo } from '../tasbeeh';

describe('a round never passes its target', () => {
  it('counts up to the target and completes exactly once', () => {
    let r = { count: 30, target: 33 };
    const events: boolean[] = [];
    for (let i = 0; i < 3; i++) { const x = tap(r, 'repeat'); events.push(x.completed); r = { ...r, count: x.count }; }
    expect(r.count).toBe(33);
    expect(events).toEqual([false, false, true]);
  });
  it('the tap after completion starts the next round at 1 (never 34 / 33)', () => {
    expect(tap({ count: 33, target: 33 }, 'repeat')).toEqual({ count: 1, added: 1, completed: false, advance: false });
    expect(tap({ count: 33, target: 33 }, 'next')).toEqual({ count: 1, added: 1, completed: false, advance: true });
  });
  it("'stop' waits at the target and ignores taps", () => {
    expect(tap({ count: 33, target: 33 }, 'stop')).toEqual({ count: 33, added: 0, completed: false, advance: false });
  });
  it('repairs an old over-count like 37 / 33', () => {
    const x = tap({ count: 37, target: 33 }, 'repeat');
    expect(x.count).toBe(1);
  });
  it('a target of 1 completes on every tap', () => {
    expect(tap({ count: 0, target: 1 }, 'repeat').completed).toBe(true);
    expect(tap({ count: 1, target: 1 }, 'repeat').completed).toBe(true);
  });
  it('undo steps back and reopens a completed round', () => {
    expect(undo({ count: 33, target: 33 })).toEqual({ count: 32, removed: 1, reopened: true });
    expect(undo({ count: 5, target: 33 })).toEqual({ count: 4, removed: 1, reopened: false });
    expect(undo({ count: 0, target: 33 })).toEqual({ count: 0, removed: 0, reopened: false });
  });
});

describe('custom targets', () => {
  it.each([['25', 25], ['70', 70], ['150', 150], ['500', 500], ['1,000', 1000], [' 99 ', 99], ['100000', 100000]])('accepts %s', (s, n) => {
    expect(parseTarget(s)).toBe(n);
  });
  it.each(['', '0', '-5', '12.5', 'abc', '1e3', '100001', '3-3'])('rejects %p', s => {
    expect(parseTarget(s)).toBeNull();
  });
  it('apply per dhikr and keep the presets', () => {
    const list = allDhikr([], { 'b:SubhanAllah': 70 });
    expect(list.find(d => d.key === 'b:SubhanAllah')!.t).toBe(70);
    expect(list.find(d => d.key === 'b:Allahu Akbar')!.t).toBe(34);
  });
});

describe('custom dhikr', () => {
  const custom = [
    { id: 'a', name: 'SubhanAllahil-Azim', ar: 'سُبْحَانَ اللهِ الْعَظِيمِ', tr: 'Subhan Allahil-Azim', target: 100 },
    { id: 'b', name: 'Old one', ar: '', target: 33, archived: true },
  ];
  it('appear after the built-ins; archived ones are hidden', () => {
    const list = allDhikr(custom);
    expect(list.at(-1)).toMatchObject({ key: 'c:a', label: 'SubhanAllahil-Azim', t: 100, custom: true, note: 'Subhan Allahil-Azim' });
    expect(list.some(d => d.key === 'c:b')).toBe(false);
  });
  it("'Next dhikr' walks the list and wraps", () => {
    const list = allDhikr(custom);
    expect(nextKey(list, 'b:SubhanAllah')).toBe('b:Alhamdulillah');
    expect(nextKey(list, 'c:a')).toBe('b:SubhanAllah');
  });
});

describe('goals', () => {
  it('stop counting at the target, so the same contribution is never counted twice', () => {
    set({ hydrated: true, goals: [{ id: 7, name: 'Istighfar', target: 3, prog: 2, streak: 0, remind: '', week: [0, 0, 0, 0, 0, 0, 0], cg: null }] });
    expect(countGoal(7, 1)!.prog).toBe(3);
    expect(countGoal(7, 1)!.prog).toBe(3);
    expect(countGoal(7, 5)!.prog).toBe(3);
    expect(getState().goals[0].prog).toBe(3);
  });
});
