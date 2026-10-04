import * as Location from 'expo-location';
import type { City } from '../data/content';

/** Resolves the device position to a named city. Throws when permission is denied. */
export async function detectCity(): Promise<City> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') throw new Error('denied');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude: lat, longitude: lng } = pos.coords;
  let name = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  try {
    const [g] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (g) name = [g.city || g.subregion || g.region, g.country].filter(Boolean).join(', ') || name;
  } catch {
    // Reverse geocoding needs a network; coordinates alone are enough for prayer times.
  }
  return { name, lat, lng };
}

/** Subscribes to the compass heading (true north when available). Returns an unsubscribe fn. */
export async function watchHeading(cb: (deg: number) => void): Promise<() => void> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') throw new Error('denied');
  const sub = await Location.watchHeadingAsync(h => cb(h.trueHeading >= 0 ? h.trueHeading : h.magHeading));
  return () => sub.remove();
}
