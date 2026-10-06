import { delta, norm, smooth, trueFromMagnetic, unwrap } from '../compassMath';
import { qibla } from '../prayer';

// Reference bearings from an independent great-circle calculation to the Kaaba (21.4225° N, 39.8262° E).
describe('qibla bearing', () => {
  it.each([
    ['Lahore', 31.5204, 74.3587, 260.37],
    ['London', 51.5074, -0.1278, 118.99],
    ['New York', 40.7128, -74.006, 58.48],
    ['Jakarta', -6.2088, 106.8456, 295.15],
    ['Sydney', -33.8688, 151.2093, 277.5],
  ])('%s', (name, lat, lng, want) => {
    expect(Math.abs(qibla({ name: String(name), lat: Number(lat), lng: Number(lng) }).deg - Number(want))).toBeLessThanOrEqual(0.5);
  });
  it('names the direction', () => {
    expect(qibla({ name: 'London', lat: 51.5074, lng: -0.1278 }).dir).toBe('ESE');
    expect(qibla({ name: 'New York', lat: 40.7128, lng: -74.006 }).dir).toBe('ENE');
  });
});

describe('compass maths', () => {
  it('wraps and finds the short way round', () => {
    expect(norm(-10)).toBe(350);
    expect(delta(359, 1)).toBe(2);
    expect(delta(1, 359)).toBe(-2);
    expect(delta(0, 180)).toBe(180);
  });
  it('smooths across north without flipping to south', () => {
    expect(smooth(359, 1, 0.5)).toBeCloseTo(0, 5);
    expect(smooth(null, 370)).toBe(10);
  });
  it('corrects magnetic to true north (east declination positive)', () => {
    expect(trueFromMagnetic(100, -10.1)).toBeCloseTo(89.9, 5);
    expect(trueFromMagnetic(359, 2)).toBeCloseTo(1, 5);
  });
  it('unwraps rotation so the needle never spins the long way', () => {
    expect(unwrap(719, 1)).toBe(721);
    expect(unwrap(0, 350)).toBe(-10);
  });
});
