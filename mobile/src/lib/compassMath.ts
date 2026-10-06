/** Pure compass maths (no React Native imports, so it is unit-tested directly). */

export const norm = (d: number) => ((d % 360) + 360) % 360;

/** Signed smallest turn from `from` to `to`, in (-180, 180]. */
export function delta(from: number, to: number) {
  const d = norm(to) - norm(from);
  return d > 180 ? d - 360 : d <= -180 ? d + 360 : d;
}

/** Low-pass filter on a circle (so 359° → 1° averages to 0°, not 180°). `k` is the weight of the new reading. */
export function smooth(prev: number | null, next: number, k = 0.25) {
  if (prev == null) return norm(next);
  return norm(prev + delta(prev, next) * k);
}

/** True heading from a magnetic one: true = magnetic + declination (east positive). */
export const trueFromMagnetic = (mag: number, declination: number) => norm(mag + declination);

/**
 * Next value for an always-increasing/decreasing rotation so an animation never spins the long
 * way round: continue from the previous unwrapped angle by the shortest turn.
 */
export const unwrap = (prevUnwrapped: number, target: number) => prevUnwrapped + delta(prevUnwrapped, target);
