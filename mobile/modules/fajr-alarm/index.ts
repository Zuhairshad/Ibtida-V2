/**
 * Fajr wake alarm — a real alarm clock on Android: exact AlarmManager alarms, a lock-screen alarm
 * screen and a foreground service that keeps sounding until the wake is verified in the app.
 *
 * iOS, web and Expo Go have no such module: `isSupported()` is false and the app falls back to a
 * time-sensitive notification (see src/lib/notifications.ts).
 */
import { requireOptionalNativeModule, type NativeModule } from 'expo';
import { Platform } from 'react-native';

export type AlarmSpec = {
  id: string;
  /** Epoch ms. */
  at: number;
  title: string;
  body: string;
  /** Only stops after the in-app verification (wudu, then prayer mat). */
  verify: boolean;
  /** 'alarm' (system alarm tone), 'silent', or a bundled raw sound name such as 'ibtida_chime'. */
  sound: string;
  /** Deep link the alarm screen opens, e.g. ibtida://wake-scan?alarm=1. */
  url: string;
};

export type AlarmStatus = {
  notifications: boolean;
  /** Exact alarms allowed ("Alarms & reminders"). Without it Android may delay the alarm. */
  exactAlarms: boolean;
  /** Full-screen alarm over the lock screen (Android 14+ asks for it separately). */
  fullScreen: boolean;
  /** Ibtida is exempt from battery optimisation. */
  batteryUnrestricted: boolean;
  /** Alarm stream volume, 0–1. */
  alarmVolume: number;
  nextAt: number | null;
  scheduled: number;
};

export type Ringing = { alarm: AlarmSpec; since: number; silencedUntil: number };

export type SettingsKind = 'exactAlarm' | 'fullScreen' | 'battery' | 'notifications' | 'app';

declare class FajrAlarmNative extends NativeModule {
  isSupported(): boolean;
  getStatus(): AlarmStatus;
  openSettings(kind: SettingsKind): Promise<void>;
  schedule(json: string): Promise<number>;
  getScheduled(): AlarmSpec[];
  getRinging(): Ringing | null;
  silence(until: number): Promise<boolean>;
  stop(): Promise<boolean>;
  availableSounds(names: string[]): string[];
  preview(sound: string, seconds: number): Promise<boolean>;
  stopPreview(): Promise<void>;
}

const native = Platform.OS === 'android' ? requireOptionalNativeModule<FajrAlarmNative>('FajrAlarm') : null;

const safe = <T,>(fn: () => T, fallback: T): T => {
  try { return fn(); } catch { return fallback; }
};

export const isSupported = () => !!native && safe(() => native.isSupported(), false);

export const getStatus = (): AlarmStatus | null => (native ? safe(() => native.getStatus(), null) : null);

export async function openSettings(kind: SettingsKind) {
  if (native) await native.openSettings(kind);
}

/** Replaces every scheduled alarm. Resolves with how many were armed. */
export async function schedule(alarms: AlarmSpec[]): Promise<number> {
  if (!native) return 0;
  return native.schedule(JSON.stringify(alarms));
}

export const getScheduled = (): AlarmSpec[] => (native ? safe(() => native.getScheduled(), []) : []);

export const getRinging = (): Ringing | null => (native ? safe(() => native.getRinging(), null) : null);

/** Wudu verified: quiet until `until` (epoch ms), then rings again unless stopped. */
export async function silence(until: number) {
  return native ? native.silence(until) : false;
}

/** Wake verified: the alarm stops for good. */
export async function stop() {
  return native ? native.stop() : false;
}

export const availableSounds = (names: string[]) => (native ? safe(() => native.availableSounds(names), []) : []);

export async function preview(sound: string, seconds = 4) {
  return native ? native.preview(sound, seconds) : false;
}

export async function stopPreview() {
  if (native) await native.stopPreview();
}
