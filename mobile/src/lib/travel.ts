/**
 * Travel dua reminder.
 *
 * The user saves a home location (on this phone only — never synced or uploaded) and a radius.
 * One geofence around home is handed to the OS, which wakes Ibtida only when the phone leaves or
 * re-enters that area: no continuous tracking, no location history, and small moves inside the
 * area never trigger anything. Leaving sends one gentle reminder per departure (re-armed only
 * after coming back home, and never more than once every few hours).
 *
 * The dua shown is the sourced "Setting out on a journey" entry from the adhkar data (Sahih Muslim 1342).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { ADHKAR } from '../data/adhkar';

export const TRAVEL_TASK = 'ibtida-travel-geofence';
const FLAGS_KEY = 'ibtida.travel.v1';
const STATE_KEY = 'ibtida.v7.state';
/** Radius choices in km. A reminder is for real journeys, not trips to the shop. */
export const RADII_KM = [10, 25, 50];
const MIN_GAP_MS = 4 * 3600_000;
const NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

export type Home = { lat: number; lng: number; radiusKm: number };
type Flags = { away: boolean; lastAt: number };

/** The travel dua entry from the adhkar data (shown in the reminder and the Travel session). */
export function travelDua() {
  for (const c of ADHKAR) for (const d of c.items) if (d.id === 'safar') return d;
  return null;
}

async function readFlags(): Promise<Flags> {
  try {
    const raw = await AsyncStorage.getItem(FLAGS_KEY);
    const f = raw ? (JSON.parse(raw) as Partial<Flags>) : {};
    return { away: !!f.away, lastAt: typeof f.lastAt === 'number' ? f.lastAt : 0 };
  } catch {
    return { away: false, lastAt: 0 };
  }
}
const writeFlags = (f: Flags) => AsyncStorage.setItem(FLAGS_KEY, JSON.stringify(f)).catch(() => {});

/**
 * Pure decision for one geofence event, so it can be tested: whether to remind, and the new flags.
 * Leaving reminds once per departure; coming home re-arms it.
 */
export function onFenceEvent(kind: 'exit' | 'enter', f: Flags, now: number): { remind: boolean; flags: Flags } {
  if (kind === 'enter') return { remind: false, flags: { ...f, away: false } };
  if (f.away || now - f.lastAt < MIN_GAP_MS) return { remind: false, flags: { ...f, away: true } };
  return { remind: true, flags: { away: true, lastAt: now } };
}

async function notifyDeparture() {
  // Headless: read only the language setting from the saved app state.
  let lang = 'both' as 'en' | 'ur' | 'both';
  try {
    const s = JSON.parse((await AsyncStorage.getItem(STATE_KEY)) || '{}') as { notifLang?: typeof lang; travelOn?: boolean };
    if (s.travelOn === false) return;
    if (s.notifLang) lang = s.notifLang;
  } catch { /* defaults */ }
  const d = travelDua();
  const first = d?.ar?.split('،').slice(0, 4).join('،') ?? '';
  const title = lang === 'ur' ? 'سفر بخیر · سفر کی دعا' : lang === 'en' ? 'Safe travels · the dua for travel' : 'Safe travels · سفر کی دعا';
  const line = lang === 'ur' ? 'سفر کی دعا پڑھنا نہ بھولیں۔' : 'You’ve left home — remember the dua for setting out.';
  await Notifications.scheduleNotificationAsync({
    content: { title, body: [first ? `${first}…` : '', line, d?.src ? `— ${d.src}` : ''].filter(Boolean).join('\n'), data: { url: '/session?cat=Travel' }, sound: 'default' },
    trigger: Platform.OS === 'android' ? { channelId: 'reminders-v2' } : null,
  });
}

if (NATIVE && !TaskManager.isTaskDefined(TRAVEL_TASK)) {
  TaskManager.defineTask<{ eventType: Location.GeofencingEventType }>(TRAVEL_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const kind = data.eventType === Location.GeofencingEventType.Exit ? 'exit' : 'enter';
    const r = onFenceEvent(kind, await readFlags(), Date.now());
    await writeFlags(r.flags);
    if (r.remind) await notifyDeparture().catch(() => {});
  });
}

export type TravelPermission = 'granted' | 'foreground-only' | 'denied' | 'unsupported';

export async function travelPermission(): Promise<TravelPermission> {
  if (!NATIVE) return 'unsupported';
  const fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted) return 'denied';
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.granted ? 'granted' : 'foreground-only';
}

/** Asks for location in two clear steps: while using the app (to save home), then "Allow all the time". */
export async function requestTravelPermission(): Promise<TravelPermission> {
  if (!NATIVE) return 'unsupported';
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return 'denied';
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.granted ? 'granted' : 'foreground-only';
}

/** The phone's current position, to save as home. */
export async function currentPosition() {
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

/** Starts (or replaces) the one geofence around home. Starting while outside counts as already away. */
export async function startTravelWatch(home: Home) {
  if (!NATIVE) return false;
  if ((await travelPermission()) !== 'granted') return false;
  await Location.startGeofencingAsync(TRAVEL_TASK, [{
    identifier: 'home', latitude: home.lat, longitude: home.lng, radius: home.radiusKm * 1000, notifyOnEnter: true, notifyOnExit: true,
  }]);
  return true;
}

export async function stopTravelWatch() {
  if (!NATIVE) return;
  try {
    if (await Location.hasStartedGeofencingAsync(TRAVEL_TASK)) await Location.stopGeofencingAsync(TRAVEL_TASK);
  } catch { /* not running */ }
  await writeFlags({ away: false, lastAt: 0 });
}

export async function travelWatching() {
  if (!NATIVE) return false;
  try { return await Location.hasStartedGeofencingAsync(TRAVEL_TASK); } catch { return false; }
}
