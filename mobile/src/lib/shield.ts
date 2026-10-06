import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as IbadahLock from '../../modules/ibadah-lock';
import { APP_PACKAGES, APPS } from '../data/content';
import { subscribe, getState } from '../state/store';
import { toNativeWindows } from './lockTimes';

export { IbadahLock };

/** Package ids for the apps toggled on in `focus.apps`. */
export function lockPackages(apps: boolean[]) {
  return APP_PACKAGES.filter((_, i) => apps[i]);
}

/** Display name for a blocked package ("Instagram"), falling back to the id. */
export function appName(pkg: string) {
  const i = APP_PACKAGES.indexOf(pkg);
  return i >= 0 ? APPS[i] : pkg;
}

/**
 * Whether app shielding works on this device and the Accessibility service is on.
 * Re-checked whenever the app returns to the foreground (e.g. back from system settings).
 */
export function useShieldPermission() {
  const supported = IbadahLock.isSupported();
  const [granted, setGranted] = useState(() => IbadahLock.isPermissionGranted());
  useEffect(() => {
    if (!supported) return;
    const sub = AppState.addEventListener('change', s => { if (s === 'active') setGranted(IbadahLock.isPermissionGranted()); });
    return () => sub.remove();
  }, [supported]);
  return { supported, granted };
}

/**
 * Mount once (root layout): mirrors the scheduled lock windows and any emergency skip to the
 * native module, which enforces them even while Ibtida is closed.
 */
export function useLockScheduleSync() {
  useEffect(() => {
    if (!IbadahLock.isSupported()) return;
    let locks: unknown = null;
    let skip = -1;
    const push = () => {
      const s = getState();
      if (!s.hydrated) return;
      if (s.locks !== locks) { locks = s.locks; IbadahLock.setSchedule(toNativeWindows(s.locks)).catch(() => {}); }
      if (s.lockSkip !== skip) { skip = s.lockSkip; IbadahLock.skipWindow(s.lockSkip).catch(() => {}); }
    };
    push();
    return subscribe(push);
  }, []);
}
