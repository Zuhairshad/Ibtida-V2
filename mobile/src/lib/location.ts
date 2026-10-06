import * as Location from 'expo-location';
import type { City } from '../data/content';

/** Resolves the device position to a named city. Throws when permission is denied. */
export async function detectCity(): Promise<City> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') throw new Error('denied');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude: lat, longitude: lng } = pos.coords;
  let name = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  let cc: string | undefined;
  try {
    const [g] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (g) name = [g.city || g.subregion || g.region, g.country].filter(Boolean).join(', ') || name;
    cc = g?.isoCountryCode?.toUpperCase() || undefined;
  } catch {
    // Reverse geocoding needs a network; coordinates alone are enough for prayer times.
  }
  return { name, lat, lng, ...(cc ? { cc } : {}) };
}

/**
 * Subscribes to raw compass readings (`trueHeading` is -1 when the OS can't give true north).
 * Use `useCompass` in lib/compass.ts, which corrects magnetic readings. Returns an unsubscribe fn.
 */
export async function watchHeading(cb: (h: Location.LocationHeadingObject) => void): Promise<() => void> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') throw new Error('denied');
  const sub = await Location.watchHeadingAsync(cb);
  return () => sub.remove();
}
