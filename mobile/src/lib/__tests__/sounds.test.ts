jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { sounds: ['ibtida_chime.wav', 'adhan_makkah.wav', 'adhan_takbir.wav'] } } } }));
// eslint-disable-next-line import/first
import { adhanFile, hasSound } from '../sounds';

describe('adhan sounds play only what the build bundles', () => {
  it('uses the recording when it is there', () => {
    expect(adhanFile(0, false)).toBe('adhan_makkah.wav');
    expect(adhanFile(2, false)).toBe('ibtida_chime.wav');
  });
  it('falls back to the system sound when a recording is missing', () => {
    expect(hasSound('adhan_madinah')).toBe(false);
    expect(adhanFile(1, false)).toBe('default');
  });
  it('plays the short opening when chosen (not for the chime)', () => {
    expect(adhanFile(0, true)).toBe('adhan_takbir.wav');
    expect(adhanFile(1, true)).toBe('adhan_takbir.wav');
    expect(adhanFile(2, true)).toBe('ibtida_chime.wav');
  });
  it('silent plays nothing', () => {
    expect(adhanFile(3, false)).toBeNull();
    expect(adhanFile(3, true)).toBeNull();
  });
});
