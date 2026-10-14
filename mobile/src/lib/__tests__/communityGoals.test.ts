import { cgDhikrKey, cgForDhikr, COMMUNITY_GOALS } from '../../data/content';

describe('community goal attribution', () => {
  it('each dhikr goal names a built-in dhikr, and Fajr together counts prayers', () => {
    expect(COMMUNITY_GOALS.map((_, i) => cgDhikrKey(i))).toEqual(['b:Durood', null, 'b:Astaghfirullah']);
  });

  it('free-counter taps count toward the joined goal for that dhikr', () => {
    expect(cgForDhikr('b:Durood', [true, false, false])).toBe('1 Million Salawat');
    expect(cgForDhikr('b:Astaghfirullah', [false, false, true])).toBe('10 Million Istighfar');
  });

  it('not joined, or a dhikr no goal counts, only adds to the Ummah total', () => {
    expect(cgForDhikr('b:Durood', [false, true, true])).toBeNull();
    expect(cgForDhikr('b:SubhanAllah', [true, true, true])).toBeNull();
    expect(cgForDhikr('c:123', [true, true, true])).toBeNull();
  });
});
