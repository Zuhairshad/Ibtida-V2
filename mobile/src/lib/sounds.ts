/**
 * Which sound files this build bundles (assets/sounds, listed by app.config.js in `extra.sounds`).
 * Choices whose recording isn't bundled are shown as unavailable instead of silently playing
 * something else.
 */
import Constants from 'expo-constants';

const bundled = new Set<string>(((Constants.expoConfig?.extra as { sounds?: string[] } | undefined)?.sounds) ?? []);

/** The bundled file for a base name (e.g. 'adhan_makkah' → 'adhan_makkah.wav'), or null. */
export function soundFile(base: string): string | null {
  for (const f of bundled) if (f.replace(/\.[a-z0-9]+$/, '') === base) return f;
  return null;
}

export const hasSound = (base: string) => soundFile(base) !== null;

/** Adhan sound chips, in order (index stored as `sound`). */
export const ADHAN_CHOICES = [
  { key: 'makkah', label: 'Makkah', file: 'adhan_makkah' },
  { key: 'madinah', label: 'Madinah', file: 'adhan_madinah' },
  { key: 'chime', label: 'Soft chime', file: 'ibtida_chime' },
  { key: 'silent', label: 'Silent', file: null },
] as const;

/** The short opening ("Allahu Akbar, Allahu Akbar") used instead of the full adhan when chosen. */
export const TAKBIR = 'adhan_takbir';

/**
 * The file a prayer notification plays: the chosen adhan (or its short opening), the chime,
 * the system sound when a recording isn't bundled, or nothing for Silent.
 */
export function adhanFile(sound: number, short: boolean): string | 'default' | null {
  const c = ADHAN_CHOICES[sound] ?? ADHAN_CHOICES[0];
  if (c.key === 'silent') return null;
  if (short && c.key !== 'chime') return soundFile(TAKBIR) ?? soundFile(c.file!) ?? 'default';
  return (c.file && soundFile(c.file)) || 'default';
}
