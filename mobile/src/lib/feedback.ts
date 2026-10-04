import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';
import { getState } from '../state/store';

/**
 * Maps the prototype's navigator.vibrate() patterns onto native haptics:
 * tiny numbers are selection ticks, single counts are light taps, multi-step
 * patterns are success notifications, a single long pulse is a heavy tap.
 */
export function buzz(p: number | number[]) {
  if (!getState().vib) return;
  try {
    if (Array.isArray(p)) {
      if (p.length === 1) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (p <= 6) Haptics.selectionAsync();
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics are best-effort.
  }
}

/** Gentle "that didn't work" haptic (wrong tag, rejected input). */
export function buzzError() {
  if (!getState().vib) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  } catch {
    // Haptics are best-effort.
  }
}

type Toast = { msg: string; on: boolean; key: number };
let toast: Toast = { msg: '', on: false, key: 0 };
const ls = new Set<() => void>();
let t: ReturnType<typeof setTimeout> | undefined;

export function say(msg: string) {
  clearTimeout(t);
  toast = { msg, on: true, key: toast.key + 1 };
  ls.forEach(l => l());
  t = setTimeout(() => {
    toast = { ...toast, on: false };
    ls.forEach(l => l());
  }, 2400);
}

export function useToast() {
  return useSyncExternalStore(
    l => { ls.add(l); return () => { ls.delete(l); }; },
    () => toast,
    () => toast,
  );
}
