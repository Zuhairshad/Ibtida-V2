import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as IbadahLock from '../../modules/ibadah-lock';
import { APP_PACKAGES, APPS } from '../data/content';
import { subscribe, getState } from '../state/store';
import { toNativeWindows } from './lockTimes';

export { IbadahLock };

/**
 * Package ids to lock for "Lock now": the apps picked from this phone's installed apps when that
 * list was used (`pkgs`), otherwise the built-in shortlist toggled in `apps`.
 */
export function lockPackages(apps: boolean[], pkgs?: string[]) {
  if (pkgs && pkgs.length) return pkgs;
  return APP_PACKAGES.filter((_, i) => apps[i]);
}

/** Display name for a blocked package ("Instagram"), falling back to the id. */
export function appName(pkg: string) {
  const own = installed?.find(a => a.packageName === pkg);
  if (own) return own.label;
  const i = APP_PACKAGES.indexOf(pkg);
  return i >= 0 ? APPS[i] : pkg;
}

/* ------------------------------------------------------------ Installed apps */

let installed: IbadahLock.InstalledApp[] | null = null;
let loading: Promise<IbadahLock.InstalledApp[]> | null = null;

/** Loads (once per session) the launchable apps on this phone. */
export function loadInstalledApps() {
  if (installed) return Promise.resolve(installed);
  loading ??= IbadahLock.getInstalledApps(72).then(list => { installed = list; return list; }).finally(() => { loading = null; });
  return loading;
}

/**
 * The apps a lock can choose from. On Android builds with the module: every launchable app on the
 * phone, with its name and icon. Elsewhere (iOS, web, Expo Go): the built-in shortlist, without icons.
 */
export function useLockableApps() {
  const native = IbadahLock.isSupported();
  const [apps, setApps] = useState<IbadahLock.InstalledApp[] | null>(() => (native ? installed : SHORTLIST));
  useEffect(() => {
    if (!native || installed) return;
    let live = true;
    loadInstalledApps().then(list => { if (live) setApps(list); }).catch(() => { if (live) setApps(SHORTLIST); });
    return () => { live = false; };
  }, [native]);
  return { apps: apps ?? [], loading: apps === null, fromDevice: native };
}

const SHORTLIST: IbadahLock.InstalledApp[] = APPS.map((label, i) => ({ packageName: APP_PACKAGES[i], label, icon: null }));

/** Lock status for the schedule list: whether rules can actually be enforced. */
export function useLockStatus() {
  const [status, setStatus] = useState(() => IbadahLock.getStatus());
  useEffect(() => {
    if (!IbadahLock.isSupported()) return;
    const sub = AppState.addEventListener('change', s => { if (s === 'active') setTimeout(() => setStatus(IbadahLock.getStatus()), 300); });
    const id = setInterval(() => setStatus(IbadahLock.getStatus()), 5000);
    return () => { sub.remove(); clearInterval(id); };
  }, []);
  return status;
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
