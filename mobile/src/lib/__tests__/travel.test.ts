jest.mock('expo-task-manager', () => ({ isTaskDefined: () => true, defineTask: jest.fn() }));
jest.mock('expo-location', () => ({ GeofencingEventType: { Enter: 1, Exit: 2 } }));
// eslint-disable-next-line import/first
import { onFenceEvent, travelDua } from '../travel';

const H = 3600_000;
describe('travel reminder', () => {
  it('reminds once when leaving home', () => {
    const r = onFenceEvent('exit', { away: false, lastAt: 0 }, 10 * H);
    expect(r).toEqual({ remind: true, flags: { away: true, lastAt: 10 * H } });
  });
  it('does not repeat for the same departure', () => {
    expect(onFenceEvent('exit', { away: true, lastAt: 10 * H }, 12 * H).remind).toBe(false);
  });
  it('re-arms after coming home, but never within a few hours', () => {
    const home = onFenceEvent('enter', { away: true, lastAt: 10 * H }, 11 * H).flags;
    expect(home.away).toBe(false);
    expect(onFenceEvent('exit', home, 12 * H).remind).toBe(false); // back and out again within 4 h
    expect(onFenceEvent('exit', home, 15 * H).remind).toBe(true);
  });
  it('uses the sourced dua from the adhkar data', () => {
    const d = travelDua()!;
    expect(d.src).toBe('Sahih Muslim 1342');
    expect(d.ar).toMatch(/سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا/);
  });
});
