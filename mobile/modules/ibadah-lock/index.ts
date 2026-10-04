/**
 * Ibadah Lock app shielding.
 *
 * Android: an AccessibilityService sends the user back to Ibtida whenever a locked app comes to
 * the foreground during a session. iOS / web / Expo Go: graceful no-ops, `isSupported() === false`
 * (iOS needs Apple's FamilyControls entitlement — see README.md in this folder).
 */
import { requireOptionalNativeModule, type NativeModule } from 'expo';
import { Platform } from 'react-native';

export type Subscription = { remove(): void };

export type BlockedAttempt = {
  /** Package id of the app that was blocked, e.g. `com.instagram.android`. */
  packageName: string;
  /** Blocked attempts so far in this session (persisted natively). */
  count: number;
  /** Epoch ms. */
  at: number;
};

export type LockSession = {
  packages: string[];
  /** Epoch ms, or null for "until goal completed". */
  endsAt: number | null;
  startedAt: number;
  blocked: number;
};

export type StartOptions = {
  /** Android package ids to block. Dialer, emergency and SMS apps are always ignored. */
  packages: string[];
  /** Epoch ms when the lock lifts by itself, or null to wait for stop(). */
  endsAt: number | null;
  /** Deep link opened when a blocked app is intercepted. Defaults to `ibtida://focus-active`. */
  returnUrl?: string;
};

export type StartResult = {
  /** Packages actually being blocked, after exemptions. */
  packages: string[];
  /** True when the service is enabled and at least one app is blocked. */
  shielding: boolean;
};

type Events = { onBlockedAttempt: (e: BlockedAttempt) => void };

declare class IbadahLockNative extends NativeModule<Events> {
  isSupported(): boolean;
  isPermissionGranted(): boolean;
  openPermissionSettings(): Promise<void>;
  getSession(): LockSession | null;
  start(packages: string[], endsAt: number | null, returnUrl: string | null): Promise<StartResult>;
  stop(): Promise<void>;
}

// Only Android has a working implementation; the iOS stub is never loaded on purpose so a missing
// entitlement can't surface as a runtime error. Expo Go has no such module → null.
const native = Platform.OS === 'android' ? requireOptionalNativeModule<IbadahLockNative>('IbadahLock') : null;

const NOOP_SUB: Subscription = { remove() {} };

export function isSupported(): boolean {
  try {
    return !!native?.isSupported();
  } catch {
    return false;
  }
}

/** Whether the user has enabled the "Ibtida Ibadah Lock" Accessibility service. */
export function isPermissionGranted(): boolean {
  if (!native) return false;
  try {
    return native.isPermissionGranted();
  } catch {
    return false;
  }
}

/** Opens Android's Accessibility settings. No-op elsewhere. */
export async function openPermissionSettings(): Promise<void> {
  if (native) await native.openPermissionSettings();
}

/** The session the native side is currently enforcing, if any. */
export function getSession(): LockSession | null {
  if (!native) return null;
  try {
    return native.getSession();
  } catch {
    return null;
  }
}

export async function start({ packages, endsAt, returnUrl }: StartOptions): Promise<StartResult> {
  if (!native) return { packages: [], shielding: false };
  return native.start(packages, endsAt, returnUrl ?? null);
}

export async function stop(): Promise<void> {
  if (native) await native.stop();
}

export function onBlockedAttempt(listener: (e: BlockedAttempt) => void): Subscription {
  return native ? native.addListener('onBlockedAttempt', listener) : NOOP_SUB;
}
